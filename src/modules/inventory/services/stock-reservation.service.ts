import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, LessThan } from 'typeorm';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { StockReservationRepository } from '../repositories/stock-reservation.repository.js';
import { StockMovementRepository } from '../repositories/stock-movement.repository.js';
import { Inventory } from '../entities/inventory.entity.js';
import {
  StockReservation,
  ReservationStatus,
} from '../entities/stock-reservation.entity.js';
import {
  StockMovement,
  StockMovementType,
} from '../entities/stock-movement.entity.js';

@Injectable()
export class StockReservationService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly reservationRepo: StockReservationRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly dataSource: DataSource,
  ) {}

  async reserve(
    orderId: number,
    items: Array<{ productId: number; quantity: number }>,
  ): Promise<StockReservation[]> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Inventory);
      const resRepo = manager.getRepository(StockReservation);
      const moveRepo = manager.getRepository(StockMovement);

      const reservations: StockReservation[] = [];
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      for (const item of items) {
        const inv = await invRepo.findOne({
          where: { productId: item.productId },
        });
        if (!inv) {
          throw new BadRequestException(
            `Inventory not found for product ${item.productId}`,
          );
        }
        if (inv.availableQty < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for product ${item.productId}`,
          );
        }

        const before = inv.availableQty;
        inv.availableQty -= item.quantity;
        inv.reservedQty += item.quantity;
        await invRepo.save(inv);

        const reservation = resRepo.create({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          status: ReservationStatus.PENDING,
          expiresAt,
        });
        await resRepo.save(reservation);
        reservations.push(reservation);

        await moveRepo.save({
          productId: item.productId,
          type: StockMovementType.RESERVE,
          quantity: -item.quantity,
          beforeQty: before,
          afterQty: inv.availableQty,
          reason: `Reserve for order #${orderId}`,
          referenceId: String(orderId),
        });
      }

      return reservations;
    });
  }

  async release(orderId: number): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Inventory);
      const resRepo = manager.getRepository(StockReservation);
      const moveRepo = manager.getRepository(StockMovement);

      const reservations = await resRepo.find({
        where: { orderId, status: ReservationStatus.PENDING },
      });
      if (!reservations.length) return;

      for (const res of reservations) {
        const inv = await invRepo.findOne({
          where: { productId: res.productId },
        });
        if (inv) {
          const before = inv.availableQty;
          inv.availableQty += res.quantity;
          inv.reservedQty -= res.quantity;
          await invRepo.save(inv);

          await moveRepo.save({
            productId: res.productId,
            type: StockMovementType.RELEASE,
            quantity: res.quantity,
            beforeQty: before,
            afterQty: inv.availableQty,
            reason: `Release reservation for order #${orderId}`,
            referenceId: String(orderId),
          });
        }

        res.status = ReservationStatus.RELEASED;
        await resRepo.save(res);
      }
    });
  }

  async confirm(orderId: number): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Inventory);
      const resRepo = manager.getRepository(StockReservation);
      const moveRepo = manager.getRepository(StockMovement);

      const reservations = await resRepo.find({
        where: { orderId, status: ReservationStatus.PENDING },
      });
      if (!reservations.length) return;

      for (const res of reservations) {
        const inv = await invRepo.findOne({
          where: { productId: res.productId },
        });
        if (inv) {
          const before = inv.reservedQty;
          inv.reservedQty -= res.quantity;
          await invRepo.save(inv);

          await moveRepo.save({
            productId: res.productId,
            type: StockMovementType.CONFIRM,
            quantity: res.quantity,
            beforeQty: before,
            afterQty: inv.reservedQty,
            reason: `Confirm reservation for order #${orderId}`,
            referenceId: String(orderId),
          });
        }

        res.status = ReservationStatus.CONFIRMED;
        await resRepo.save(res);
      }
    });
  }

  async releaseExpired(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Inventory);
      const resRepo = manager.getRepository(StockReservation);
      const moveRepo = manager.getRepository(StockMovement);

      const expired = await resRepo.find({
        where: {
          status: ReservationStatus.PENDING,
          expiresAt: LessThan(new Date()),
        },
      });

      for (const res of expired) {
        const inv = await invRepo.findOne({
          where: { productId: res.productId },
        });
        if (inv) {
          const before = inv.availableQty;
          inv.availableQty += res.quantity;
          inv.reservedQty -= res.quantity;
          await invRepo.save(inv);

          await moveRepo.save({
            productId: res.productId,
            type: StockMovementType.RELEASE,
            quantity: res.quantity,
            beforeQty: before,
            afterQty: inv.availableQty,
            reason: `Auto-release expired reservation #${res.id}`,
            referenceId: String(res.orderId),
          });
        }

        res.status = ReservationStatus.EXPIRED;
        await resRepo.save(res);
      }

      return expired.length;
    });
  }
}
