import { BadRequestException } from '@nestjs/common';
import { StockReservationService } from './stock-reservation.service';
import { Inventory } from '../entities/inventory.entity';
import {
  ReservationStatus,
  StockReservation,
} from '../entities/stock-reservation.entity';
import { StockMovement } from '../entities/stock-movement.entity';

type _Mocks = {
  invRepo: {
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
  };
  resRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  moveRepo: {
    save: jest.Mock;
  };
  queryBuilder: {
    setLock: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
};

function createService() {
  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const invRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    save: jest.fn(),
  };

  const resRepo = {
    create: jest.fn().mockImplementation((value: unknown) => value),
    save: jest.fn(),
    find: jest.fn(),
  };

  const moveRepo = {
    save: jest.fn(),
  };

  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Inventory) return invRepo;
      if (entity === StockReservation) return resRepo;
      if (entity === StockMovement) return moveRepo;
      throw new Error(`Unexpected repository token: ${String(entity)}`);
    }),
  };

  const dataSource = {
    transaction: jest.fn((callback: (m: typeof manager) => unknown) =>
      callback(manager),
    ),
  };

  const service = new StockReservationService(
    {} as never,
    {} as never,
    {} as never,
    dataSource as never,
  );

  return {
    service,
    mocks: { invRepo, resRepo, moveRepo, queryBuilder } as _Mocks,
  };
}

describe('StockReservationService', () => {
  it('should reserve stock with pessimistic row lock', async () => {
    const { service, mocks } = createService();

    mocks.queryBuilder.getOne.mockResolvedValue({
      productId: 1,
      availableQty: 10,
      reservedQty: 2,
    });
    mocks.resRepo.save.mockImplementation((value: unknown) => value);

    const result = await service.reserve(123, [{ productId: 1, quantity: 3 }]);

    expect(result).toHaveLength(1);
    expect(mocks.queryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(mocks.queryBuilder.where).toHaveBeenCalledWith(
      'inventory.product_id = :productId',
      { productId: 1 },
    );
    expect(mocks.invRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        availableQty: 7,
        reservedQty: 5,
      }),
    );
  });

  it('should reject reservation when available quantity is insufficient', async () => {
    const { service, mocks } = createService();

    mocks.queryBuilder.getOne.mockResolvedValue({
      productId: 1,
      availableQty: 1,
      reservedQty: 0,
    });

    await expect(
      service.reserve(123, [{ productId: 1, quantity: 2 }]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.queryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(mocks.invRepo.save).not.toHaveBeenCalled();
  });

  it('should release pending reservations with pessimistic row lock', async () => {
    const { service, mocks } = createService();

    mocks.resRepo.find.mockResolvedValue([
      {
        id: 99,
        orderId: 123,
        productId: 1,
        quantity: 2,
        status: ReservationStatus.PENDING,
      },
    ]);
    mocks.queryBuilder.getOne.mockResolvedValue({
      productId: 1,
      availableQty: 4,
      reservedQty: 2,
    });

    await service.release(123);

    expect(mocks.queryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(mocks.invRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        availableQty: 6,
        reservedQty: 0,
      }),
    );
    expect(mocks.resRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReservationStatus.RELEASED }),
    );
  });
});
