import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockMovement } from '../entities/stock-movement.entity.js';

@Injectable()
export class StockMovementRepository extends Repository<StockMovement> {
  constructor(private dataSource: DataSource) {
    super(StockMovement, dataSource.createEntityManager());
  }

  async findByProductId(productId: number, page = 1, limit = 20) {
    const [data, total] = await this.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
