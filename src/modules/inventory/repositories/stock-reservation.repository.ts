import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import {
  StockReservation,
  ReservationStatus,
} from '../entities/stock-reservation.entity.js';

@Injectable()
export class StockReservationRepository extends Repository<StockReservation> {
  constructor(private dataSource: DataSource) {
    super(StockReservation, dataSource.createEntityManager());
  }

  async findPendingByOrderId(orderId: number): Promise<StockReservation[]> {
    return this.find({
      where: { orderId, status: ReservationStatus.PENDING },
    });
  }

  async findExpiredPending(now = new Date()): Promise<StockReservation[]> {
    return this.find({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: LessThan(now),
      },
      relations: ['inventory'],
    });
  }
}
