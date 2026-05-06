import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnRequest } from '../entities/return-request.entity.js';
import { ReturnItem } from '../entities/return-item.entity.js';
import { RefundTransaction } from '../entities/refund-transaction.entity.js';
import { ReturnInspectionReport } from '../entities/return-inspection-report.entity.js';
import {
  ReturnStatus,
  ReturnReason,
  InspectionCondition,
  RefundType,
  RefundMethod,
  RefundStatus,
} from '../enums/return.enum.js';
import type {
  SubmitReturnDto,
  ReviewReturnDto,
  SelectRefundMethodDto,
  InspectReturnDto,
  AddInternalNoteDto,
} from '../dtos/return.dto.js';

@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);
  private returnWindowDays = 7;
  private restockingFeePercent = 10;
  private storeCreditBonusPercent = 5;
  private openBoxDiscountPercent = 15;
  private nonReturnableCategories: string[] = [];

  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnItem)
    private readonly returnItemRepo: Repository<ReturnItem>,
    @InjectRepository(RefundTransaction)
    private readonly refundRepo: Repository<RefundTransaction>,
    @InjectRepository(ReturnInspectionReport)
    private readonly inspectionRepo: Repository<ReturnInspectionReport>,
  ) {}

  configurePolicy(params: {
    returnWindowDays?: number;
    restockingFeePercent?: number;
    storeCreditBonusPercent?: number;
    openBoxDiscountPercent?: number;
    nonReturnableCategories?: string[];
  }) {
    if (params.returnWindowDays !== undefined)
      this.returnWindowDays = params.returnWindowDays;
    if (params.restockingFeePercent !== undefined)
      this.restockingFeePercent = params.restockingFeePercent;
    if (params.storeCreditBonusPercent !== undefined)
      this.storeCreditBonusPercent = params.storeCreditBonusPercent;
    if (params.openBoxDiscountPercent !== undefined)
      this.openBoxDiscountPercent = params.openBoxDiscountPercent;
    if (params.nonReturnableCategories !== undefined)
      this.nonReturnableCategories = params.nonReturnableCategories;
  }

  private generateReturnCode(): string {
    return `RET${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
  }

  async checkEligibility(
    orderId: number,
    userId: number,
    orderStatus: string,
    deliveredAt: Date | null,
    category: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    if (orderStatus !== 'delivered' && orderStatus !== 'completed') {
      return {
        eligible: false,
        reason: 'Don hang chua duoc giao hoac hoan thanh',
      };
    }
    if (this.nonReturnableCategories.includes(category)) {
      return {
        eligible: false,
        reason: 'San pham thuoc danh muc khong duoc tra lai',
      };
    }
    if (deliveredAt) {
      const daysSinceDelivery =
        (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > this.returnWindowDays) {
        return {
          eligible: false,
          reason: `Da qua thoi han ${this.returnWindowDays} ngay tra hang`,
        };
      }
    }
    const existing = await this.returnRepo.findOne({
      where: { orderId, userId, status: ReturnStatus.CANCELLED },
    });
    if (existing) {
      return { eligible: false, reason: 'Don hang da co yeu cau tra hang' };
    }
    return { eligible: true };
  }

  async checkFraud(userId: number): Promise<boolean> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReturns = await this.returnRepo.count({ where: { userId } });
    const recentCount = await this.returnRepo
      .createQueryBuilder('rr')
      .where('rr.user_id = :userId AND rr.created_at > :since', {
        userId,
        since: thirtyDaysAgo,
      })
      .getCount();
    return recentCount > 3;
  }

  async submit(
    userId: number,
    dto: SubmitReturnDto,
    orderData: {
      orderCode: string;
      status: string;
      items: Array<{
        productId: number;
        productName: string;
        productImage: string | null;
        unitPrice: number;
        quantity: number;
      }>;
    },
  ): Promise<ReturnRequest> {
    const isFraud = await this.checkFraud(userId);

    const rr = this.returnRepo.create({
      returnCode: this.generateReturnCode(),
      userId,
      orderId: dto.orderId,
      orderCode: orderData.orderCode,
      status: ReturnStatus.PENDING_REVIEW,
      returnReason: dto.returnReason,
      returnDescription: dto.returnDescription || null,
      evidencePhotos: dto.evidencePhotos || null,
      isFlaggedFraud: isFraud,
    });

    const saved = await this.returnRepo.save(rr);

    const items = orderData.items.map((item) =>
      this.returnItemRepo.create({
        returnRequestId: saved.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.unitPrice * item.quantity,
      }),
    );
    await this.returnItemRepo.save(items);
    saved.items = items;

    return saved;
  }

  async review(
    returnId: number,
    staffId: number,
    dto: ReviewReturnDto,
  ): Promise<ReturnRequest> {
    const rr = await this.returnRepo.findOne({ where: { id: returnId } });
    if (!rr) throw new NotFoundException('Return request not found');
    if (rr.status !== ReturnStatus.PENDING_REVIEW)
      throw new BadRequestException(
        'Only pending review requests can be reviewed',
      );

    if (dto.decision === 'approved') {
      rr.status = ReturnStatus.APPROVED;
    } else {
      rr.status = ReturnStatus.REJECTED;
      rr.rejectionReason = dto.rejectionReason || 'Khong dat yeu cau tra hang';
    }

    rr.reviewedBy = staffId;
    rr.reviewedAt = new Date();
    return this.returnRepo.save(rr);
  }

  async selectRefundMethod(
    returnId: number,
    userId: number,
    dto: SelectRefundMethodDto,
  ): Promise<ReturnRequest> {
    const rr = await this.returnRepo.findOne({
      where: { id: returnId, userId },
    });
    if (!rr) throw new NotFoundException('Return request not found');
    if (
      rr.status !== ReturnStatus.APPROVED &&
      rr.status !== ReturnStatus.LABEL_GENERATED
    ) {
      throw new BadRequestException(
        'Can only select refund method after approval',
      );
    }

    rr.refundMethod = dto.refundMethod;
    if (dto.refundMethod === RefundMethod.BANK_TRANSFER) {
      rr.bankAccount = dto.bankAccount ?? null;
      rr.bankName = dto.bankName ?? null;
      rr.bankHolder = dto.bankHolder ?? null;
    }
    return this.returnRepo.save(rr);
  }

  async generateLabel(returnId: number): Promise<ReturnRequest> {
    const rr = await this.returnRepo.findOne({ where: { id: returnId } });
    if (!rr) throw new NotFoundException('Return request not found');

    try {
      const trackingNumber = `RET${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      rr.trackingNumber = trackingNumber;
      rr.labelUrl = `https://labels.example.com/${trackingNumber}.pdf`;
      rr.status = ReturnStatus.LABEL_GENERATED;
    } catch (err) {
      rr.status = ReturnStatus.LABEL_GENERATION_FAILED;
      this.logger.error(`Label generation failed: ${(err as Error).message}`);
    }
    return this.returnRepo.save(rr);
  }

  async updateTracking(
    returnId: number,
    trackingNumber: string,
    status: string,
  ): Promise<ReturnRequest> {
    const rr = await this.returnRepo.findOne({ where: { id: returnId } });
    if (!rr) throw new NotFoundException('Return request not found');

    rr.trackingNumber = trackingNumber;
    const statusMap: Record<string, ReturnStatus> = {
      in_transit: ReturnStatus.IN_TRANSIT,
      delivered: ReturnStatus.RECEIVED_AT_WAREHOUSE,
    };
    rr.status = statusMap[status] || rr.status;
    return this.returnRepo.save(rr);
  }

  async inspect(
    returnId: number,
    staffId: number,
    dto: InspectReturnDto,
  ): Promise<ReturnInspectionReport> {
    const rr = await this.returnRepo.findOne({ where: { id: returnId } });
    if (!rr) throw new NotFoundException('Return request not found');

    const report = this.inspectionRepo.create({
      returnRequestId: returnId,
      inspectedBy: staffId,
      condition: dto.condition as InspectionCondition,
      refundType: dto.refundType as RefundType,
      deductionAmount: dto.deductionAmount || 0,
      deductionReason: dto.deductionReason || null,
      inspectionNotes: dto.inspectionNotes,
      inspectionPhotos: dto.inspectionPhotos || null,
      isFraud: dto.isFraud || false,
    });

    rr.status = ReturnStatus.INSPECTED;
    await this.returnRepo.save(rr);
    return this.inspectionRepo.save(report);
  }

  calculateRefund(
    rr: ReturnRequest,
    report: ReturnInspectionReport,
  ): { amount: number; breakdown: Record<string, number> } {
    const itemTotal =
      rr.items?.reduce((sum, i) => sum + Number(i.lineTotal), 0) || 0;
    const breakdown: Record<string, number> = { productPrice: itemTotal };

    if (report.refundType === RefundType.NO_REFUND)
      return { amount: 0, breakdown: { ...breakdown, refund: 0 } };

    let amount = itemTotal;

    if (report.refundType === RefundType.PARTIAL_REFUND) {
      amount -= report.deductionAmount;
      breakdown.deduction = -report.deductionAmount;
    }

    const isMerchantError = [
      ReturnReason.DEFECTIVE,
      ReturnReason.WRONG_ITEM,
      ReturnReason.NOT_AS_DESCRIBED,
    ].includes(rr.returnReason);
    const isCustomerInitiated = [
      ReturnReason.NO_LONGER_NEEDED,
      ReturnReason.BETTER_PRICE,
      ReturnReason.OTHER,
    ].includes(rr.returnReason);

    if (isCustomerInitiated) {
      const restockFee = Math.ceil(
        (itemTotal * this.restockingFeePercent) / 100,
      );
      amount -= restockFee;
      breakdown.restockingFee = -restockFee;
    }

    if (rr.refundMethod === RefundMethod.STORE_CREDIT) {
      const bonus = Math.ceil((amount * this.storeCreditBonusPercent) / 100);
      amount += bonus;
      breakdown.storeCreditBonus = bonus;
    }

    amount = Math.max(0, Math.round(amount));
    return { amount, breakdown };
  }

  async processRefund(returnId: number): Promise<RefundTransaction> {
    const rr = await this.returnRepo.findOne({
      where: { id: returnId },
      relations: ['items'],
    });
    if (!rr) throw new NotFoundException('Return request not found');

    const report = await this.inspectionRepo.findOne({
      where: { returnRequestId: returnId },
    });
    if (!report) throw new BadRequestException('Inspection not completed');

    const { amount, breakdown } = this.calculateRefund(rr, report);
    rr.refundAmount = amount;
    rr.refundBreakdown = breakdown;
    rr.status = ReturnStatus.REFUND_PENDING;
    await this.returnRepo.save(rr);

    const tx = this.refundRepo.create({
      returnRequestId: returnId,
      amount,
      method: rr.refundMethod || RefundMethod.ORIGINAL_PAYMENT,
      status: RefundStatus.PENDING,
    });

    try {
      tx.status = RefundStatus.COMPLETED;
      tx.completedAt = new Date();
      rr.status = ReturnStatus.REFUNDED;
      await this.returnRepo.save(rr);
    } catch (err) {
      tx.status = RefundStatus.FAILED;
      tx.errorMessage = (err as Error).message;
      this.logger.error(`Refund failed: ${tx.errorMessage}`);
    }

    return this.refundRepo.save(tx);
  }

  async cancel(returnId: number, userId: number): Promise<ReturnRequest> {
    const rr = await this.returnRepo.findOne({
      where: { id: returnId, userId },
    });
    if (!rr) throw new NotFoundException('Return request not found');
    if (
      rr.status === ReturnStatus.IN_TRANSIT ||
      rr.status === ReturnStatus.RECEIVED_AT_WAREHOUSE ||
      rr.status === ReturnStatus.INSPECTED
    ) {
      throw new BadRequestException('Cannot cancel after shipment');
    }
    rr.status = ReturnStatus.CANCELLED;
    rr.cancelledAt = new Date();
    return this.returnRepo.save(rr);
  }

  async addInternalNote(
    returnId: number,
    staffId: number,
    dto: AddInternalNoteDto,
  ): Promise<ReturnRequest> {
    const rr = await this.returnRepo.findOne({ where: { id: returnId } });
    if (!rr) throw new NotFoundException('Return request not found');
    rr.internalNotes = rr.internalNotes
      ? `${rr.internalNotes}\n[${new Date().toISOString()}] Staff ${staffId}: ${dto.note}`
      : `[${new Date().toISOString()}] Staff ${staffId}: ${dto.note}`;
    return this.returnRepo.save(rr);
  }

  async getAnalytics(start: string, end: string) {
    const requests = await this.returnRepo
      .createQueryBuilder('rr')
      .where('rr.created_at BETWEEN :start AND :end', { start, end })
      .getMany();

    const total = requests.length;
    const totalRefund = requests.reduce(
      (s, r) => s + Number(r.refundAmount || 0),
      0,
    );
    const byReason: Record<string, number> = {};
    for (const r of requests) {
      byReason[r.returnReason] = (byReason[r.returnReason] || 0) + 1;
    }

    return { totalRequests: total, totalRefundAmount: totalRefund, byReason };
  }

  async findById(returnId: number): Promise<ReturnRequest> {
    const rr = await this.returnRepo.findOne({
      where: { id: returnId },
      relations: ['items', 'refundTransactions'],
    });
    if (!rr) throw new NotFoundException('Return request not found');
    return rr;
  }

  async findByUser(userId: number, page = 1, limit = 20) {
    const [data, total] = await this.returnRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const [data, total] = await this.returnRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}
