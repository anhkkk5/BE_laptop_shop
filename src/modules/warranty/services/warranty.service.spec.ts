import { ForbiddenException } from '@nestjs/common';
import { WarrantyService } from './warranty.service';
import { UserRole } from '../../user/enums/user-role.enum';
import {
  WarrantyPriority,
  WarrantyTicketStatus,
} from '../entities/warranty-ticket.entity';

function createService() {
  const ticketRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn().mockImplementation((value: unknown) => value),
  };

  const repairLogRepo = {
    save: jest.fn(),
    create: jest.fn().mockImplementation((value: unknown) => value),
  };

  const orderService = {
    findMyOrderById: jest.fn(),
  };

  const eventEmitter = {
    emit: jest.fn(),
  };

  const service = new WarrantyService(
    ticketRepo as never,
    repairLogRepo as never,
    orderService as never,
    eventEmitter as never,
  );

  return {
    service,
    ticketRepo,
    repairLogRepo,
    orderService,
    eventEmitter,
  };
}

describe('WarrantyService', () => {
  it('should create ticket, create repair log, and emit warranty.created event', async () => {
    const { service, ticketRepo, repairLogRepo, orderService, eventEmitter } =
      createService();

    orderService.findMyOrderById.mockResolvedValue({
      id: 200,
      items: [
        {
          id: 300,
          productId: 400,
          productName: 'Laptop A',
        },
      ],
    });
    ticketRepo.findOne.mockResolvedValue(null);
    ticketRepo.save.mockImplementation((ticket: Record<string, unknown>) => ({
      id: 1,
      ...ticket,
    }));

    await service.createTicket(99, {
      orderId: 200,
      orderItemId: 300,
      priority: WarrantyPriority.HIGH,
      issueDescription: 'No power',
    });

    expect(repairLogRepo.save).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'warranty.created',
      expect.objectContaining({ userId: 99, ticketId: 1 }),
    );
  });

  it('should reject technician status update when not assigned', async () => {
    const { service, ticketRepo } = createService();

    ticketRepo.findOne.mockResolvedValue({
      id: 1,
      assignedTo: 10,
      status: WarrantyTicketStatus.RECEIVED,
    });

    await expect(
      service.updateStatus(
        1,
        { status: WarrantyTicketStatus.DIAGNOSING },
        20,
        UserRole.TECHNICIAN,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should save completed timestamp and emit status_changed event', async () => {
    const { service, ticketRepo, repairLogRepo, eventEmitter } =
      createService();

    ticketRepo.findOne.mockResolvedValue({
      id: 1,
      ticketCode: 'WT123',
      userId: 99,
      assignedTo: 10,
      status: WarrantyTicketStatus.REPAIRING,
      diagnosis: null,
      resolution: null,
      estimatedDays: null,
      receivedAt: null,
      completedAt: null,
      returnedAt: null,
    });

    ticketRepo.save.mockImplementation(
      (ticket: Record<string, unknown>) => ticket,
    );

    const result = await service.updateStatus(
      1,
      {
        status: WarrantyTicketStatus.COMPLETED,
        resolution: 'Mainboard replaced',
      },
      10,
      UserRole.TECHNICIAN,
    );

    expect(result.completedAt).toBeInstanceOf(Date);
    expect(repairLogRepo.save).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith('warranty.status_changed', {
      userId: 99,
      ticketId: 1,
      ticketCode: 'WT123',
      status: WarrantyTicketStatus.COMPLETED,
    });
  });
});
