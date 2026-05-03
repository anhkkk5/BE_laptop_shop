import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Inventory } from '../entities/inventory.entity.js';

@Injectable()
export class InventoryRepository extends Repository<Inventory> {
  constructor(private dataSource: DataSource) {
    super(Inventory, dataSource.createEntityManager());
  }

  async findByProductId(productId: number): Promise<Inventory | null> {
    return this.findOne({ where: { productId }, relations: ['product'] });
  }

  async upsertInventory(
    productId: number,
    defaults: Partial<Inventory>,
  ): Promise<Inventory> {
    let inv = await this.findByProductId(productId);
    if (!inv) {
      inv = this.create({ productId, ...defaults } as Inventory);
      await this.save(inv);
    }
    return inv;
  }
}
