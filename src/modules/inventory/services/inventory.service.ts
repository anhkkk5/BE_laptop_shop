import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { StockMovementRepository } from '../repositories/stock-movement.repository.js';
import { Inventory } from '../entities/inventory.entity.js';
import {
  StockMovement,
  StockMovementType,
} from '../entities/stock-movement.entity.js';
import { ImportStockDto } from '../dtos/import-stock.dto.js';
import { ExportStockDto } from '../dtos/export-stock.dto.js';
import { AdjustStockDto, AdjustTarget } from '../dtos/adjust-stock.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getInventory(productId: number): Promise<Inventory> {
    const inv = await this.inventoryRepo.findByProductId(productId);
    if (!inv) throw new NotFoundException('Inventory not found');
    return inv;
  }

  async listInventory(page = 1, limit = 20) {
    const [data, total] = await this.inventoryRepo.findAndCount({
      relations: ['product'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLowStock(threshold = 10) {
    const items = await this.inventoryRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.product', 'product')
      .where('inv.available_qty <= :threshold', { threshold })
      .orderBy('inv.available_qty', 'ASC')
      .getMany();
    return items;
  }

  async importStock(
    dto: ImportStockDto,
    createdBy?: number,
  ): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Inventory);
      const moveRepo = manager.getRepository(StockMovement);

      let inv = await invRepo.findOne({ where: { productId: dto.productId } });
      if (!inv) {
        inv = invRepo.create({
          productId: dto.productId,
          availableQty: 0,
          reservedQty: 0,
          damagedQty: 0,
          incomingQty: 0,
        });
      }

      const before = inv.availableQty;
      inv.availableQty += dto.quantity;
      inv.incomingQty += dto.quantity;
      await invRepo.save(inv);

      await moveRepo.save({
        productId: dto.productId,
        type: StockMovementType.IMPORT,
        quantity: dto.quantity,
        beforeQty: before,
        afterQty: inv.availableQty,
        reason: dto.reason || 'Nhập hàng',
        createdBy,
      });

      return inv;
    });
  }

  async exportStock(
    dto: ExportStockDto,
    createdBy?: number,
  ): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Inventory);
      const moveRepo = manager.getRepository(StockMovement);

      const inv = await invRepo.findOne({
        where: { productId: dto.productId },
      });
      if (!inv) throw new NotFoundException('Inventory not found');
      if (inv.availableQty < dto.quantity) {
        throw new BadRequestException('Not enough available stock');
      }

      const before = inv.availableQty;
      inv.availableQty -= dto.quantity;
      await invRepo.save(inv);

      await moveRepo.save({
        productId: dto.productId,
        type: StockMovementType.EXPORT,
        quantity: -dto.quantity,
        beforeQty: before,
        afterQty: inv.availableQty,
        reason: dto.reason || 'Xuất hàng',
        createdBy,
      });

      return inv;
    });
  }

  async adjustStock(
    dto: AdjustStockDto,
    createdBy?: number,
  ): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Inventory);
      const moveRepo = manager.getRepository(StockMovement);

      let inv = await invRepo.findOne({ where: { productId: dto.productId } });
      if (!inv) {
        inv = invRepo.create({
          productId: dto.productId,
          availableQty: 0,
          reservedQty: 0,
          damagedQty: 0,
          incomingQty: 0,
        });
      }

      let before = 0;
      let after = 0;
      if (dto.target === AdjustTarget.AVAILABLE) {
        before = inv.availableQty;
        inv.availableQty += dto.quantity;
        after = inv.availableQty;
      } else if (dto.target === AdjustTarget.DAMAGED) {
        before = inv.damagedQty;
        inv.damagedQty += dto.quantity;
        after = inv.damagedQty;
      } else if (dto.target === AdjustTarget.INCOMING) {
        before = inv.incomingQty;
        inv.incomingQty += dto.quantity;
        after = inv.incomingQty;
      }

      await invRepo.save(inv);

      await moveRepo.save({
        productId: dto.productId,
        type: StockMovementType.ADJUST,
        quantity: dto.quantity,
        beforeQty: before,
        afterQty: after,
        reason: dto.reason || `Điều chỉnh ${dto.target}`,
        createdBy,
      });

      return inv;
    });
  }

  async getMovements(productId: number, page = 1, limit = 20) {
    return this.movementRepo.findByProductId(productId, page, limit);
  }
}
