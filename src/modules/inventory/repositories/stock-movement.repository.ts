import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  StockMovement,
  StockMovementType,
} from '../entities/stock-movement.entity.js';

@Injectable()
export class StockMovementRepository extends Repository<StockMovement> {
  constructor(private dataSource: DataSource) {
    super(StockMovement, dataSource.createEntityManager());
  }

  async findByProductId(
    productId: number,
    page = 1,
    limit = 20,
    movementType?: StockMovementType,
    fromDate?: string,
    toDate?: string,
  ) {
    const qb = this.createQueryBuilder('movement')
      .where('movement.product_id = :productId', { productId })
      .orderBy('movement.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (movementType) {
      qb.andWhere('movement.type = :movementType', { movementType });
    }

    if (fromDate) {
      qb.andWhere('movement.created_at >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    }

    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      qb.andWhere('movement.created_at <= :toDate', { toDate: endOfDay });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
