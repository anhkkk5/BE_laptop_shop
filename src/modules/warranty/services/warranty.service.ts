import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from '../../order/services/order.service.js';
import { UserRole } from '../../user/enums/user-role.enum.js';
import { CreateWarrantyTicketDto } from '../dtos/create-warranty-ticket.dto.js';
import { AssignTicketDto } from '../dtos/assign-ticket.dto.js';
import { UpdateTicketStatusDto } from '../dtos/update-ticket-status.dto.js';
import { CreateRepairLogDto } from '../dtos/create-repair-log.dto.js';
import {
  WarrantyTicket,
  WarrantyTicketStatus,
} from '../entities/warranty-ticket.entity.js';
import { RepairLog } from '../entities/repair-log.entity.js';

@Injectable()
export class WarrantyService {
  constructor(
    @InjectRepository(WarrantyTicket)
    private readonly ticketRepo: Repository<WarrantyTicket>,
    @InjectRepository(RepairLog)
    private readonly repairLogRepo: Repository<RepairLog>,
    private readonly orderService: OrderService,
  ) {}

  private generateTicketCode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 900 + 100);
    return `WT${timestamp}${random}`;
  }

  private async ensureTicketExists(ticketId: number): Promise<WarrantyTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Warranty ticket not found');
    }
    return ticket;
  }

  private ensureCanAccessTicket(
    ticket: WarrantyTicket,
    userId: number,
    role: UserRole,
  ): void {
    if (role === UserRole.ADMIN || role === UserRole.TECHNICIAN) {
      return;
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You cannot access this warranty ticket');
    }
  }

  async createTicket(userId: number, dto: CreateWarrantyTicketDto) {
    const order = await this.orderService.findMyOrderById(userId, dto.orderId);
    const orderItem = order.items.find((item) => item.id === dto.orderItemId);

    if (!orderItem) {
      throw new BadRequestException('Order item not found in this order');
    }

    const existing = await this.ticketRepo.findOne({
      where: { orderItemId: dto.orderItemId },
      order: { id: 'DESC' },
    });

    if (
      existing &&
      existing.status !== WarrantyTicketStatus.RETURNED &&
      existing.status !== WarrantyTicketStatus.REJECTED
    ) {
      throw new BadRequestException(
        'A warranty ticket already exists for this order item',
      );
    }

    const ticket = this.ticketRepo.create({
      ticketCode: this.generateTicketCode(),
      userId,
      orderId: dto.orderId,
      orderItemId: dto.orderItemId,
      productId: orderItem.productId,
      productName: orderItem.productName,
      status: WarrantyTicketStatus.PENDING,
      priority: dto.priority,
      issueDescription: dto.issueDescription,
      diagnosis: null,
      resolution: null,
      assignedTo: null,
      estimatedDays: null,
      receivedAt: null,
      completedAt: null,
      returnedAt: null,
    });

    const saved = await this.ticketRepo.save(ticket);

    await this.repairLogRepo.save(
      this.repairLogRepo.create({
        ticketId: saved.id,
        status: WarrantyTicketStatus.PENDING,
        note: 'Ticket created by customer',
        performedBy: userId,
      }),
    );

    return saved;
  }

  async findMyTickets(userId: number, page: number, limit: number) {
    const [data, total] = await this.ticketRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllTickets(page: number, limit: number) {
    const [data, total] = await this.ticketRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTicketById(ticketId: number, userId: number, role: UserRole) {
    const ticket = await this.ensureTicketExists(ticketId);
    this.ensureCanAccessTicket(ticket, userId, role);
    return ticket;
  }

  async assignTechnician(
    ticketId: number,
    dto: AssignTicketDto,
    actorId: number,
  ) {
    const ticket = await this.ensureTicketExists(ticketId);
    ticket.assignedTo = dto.technicianId;

    if (ticket.status === WarrantyTicketStatus.PENDING) {
      ticket.status = WarrantyTicketStatus.RECEIVED;
      ticket.receivedAt = new Date();
    }

    const saved = await this.ticketRepo.save(ticket);

    await this.repairLogRepo.save(
      this.repairLogRepo.create({
        ticketId,
        status: saved.status,
        note: `Assigned to technician #${dto.technicianId}`,
        performedBy: actorId,
      }),
    );

    return saved;
  }

  async updateStatus(
    ticketId: number,
    dto: UpdateTicketStatusDto,
    actorId: number,
    role: UserRole,
  ) {
    const ticket = await this.ensureTicketExists(ticketId);

    if (role === UserRole.TECHNICIAN && ticket.assignedTo !== actorId) {
      throw new ForbiddenException('You are not assigned to this ticket');
    }

    ticket.status = dto.status;

    if (dto.diagnosis !== undefined) {
      ticket.diagnosis = dto.diagnosis;
    }

    if (dto.resolution !== undefined) {
      ticket.resolution = dto.resolution;
    }

    if (dto.estimatedDays !== undefined) {
      ticket.estimatedDays = dto.estimatedDays;
    }

    if (dto.status === WarrantyTicketStatus.RECEIVED && !ticket.receivedAt) {
      ticket.receivedAt = new Date();
    }

    if (dto.status === WarrantyTicketStatus.COMPLETED) {
      ticket.completedAt = new Date();
    }

    if (dto.status === WarrantyTicketStatus.RETURNED) {
      ticket.returnedAt = new Date();
    }

    const saved = await this.ticketRepo.save(ticket);

    await this.repairLogRepo.save(
      this.repairLogRepo.create({
        ticketId,
        status: dto.status,
        note: dto.resolution || dto.diagnosis || 'Status updated',
        performedBy: actorId,
      }),
    );

    return saved;
  }

  async addRepairLog(
    ticketId: number,
    dto: CreateRepairLogDto,
    actorId: number,
  ) {
    await this.ensureTicketExists(ticketId);

    return this.repairLogRepo.save(
      this.repairLogRepo.create({
        ticketId,
        status: dto.status,
        note: dto.note || null,
        performedBy: actorId,
      }),
    );
  }

  async getRepairLogs(ticketId: number, userId: number, role: UserRole) {
    const ticket = await this.ensureTicketExists(ticketId);
    this.ensureCanAccessTicket(ticket, userId, role);

    return this.repairLogRepo.find({
      where: { ticketId },
      order: { createdAt: 'DESC' },
    });
  }

  async getSummary() {
    const total = await this.ticketRepo.count();
    const byStatus = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.status')
      .getRawMany<{ status: WarrantyTicketStatus; count: string }>();

    const counts = byStatus.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = Number(item.count);
      return acc;
    }, {});

    return {
      total,
      pending: counts[WarrantyTicketStatus.PENDING] || 0,
      inProgress:
        (counts[WarrantyTicketStatus.RECEIVED] || 0) +
        (counts[WarrantyTicketStatus.DIAGNOSING] || 0) +
        (counts[WarrantyTicketStatus.REPAIRING] || 0) +
        (counts[WarrantyTicketStatus.WAITING_PARTS] || 0),
      completed: counts[WarrantyTicketStatus.COMPLETED] || 0,
      returned: counts[WarrantyTicketStatus.RETURNED] || 0,
      rejected: counts[WarrantyTicketStatus.REJECTED] || 0,
    };
  }
}
