import { BadRequestException } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum';

function createService() {
  const couponRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const usageRepo = {
    count: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const collectionRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const cartService = {
    getMyCart: jest.fn(),
  };

  const productService = {
    findByIds: jest.fn(),
  };

  const service = new CouponService(
    couponRepo as never,
    usageRepo as never,
    collectionRepo as never,
    cartService as never,
    productService as never,
  );

  return {
    service,
    couponRepo,
    usageRepo,
  };
}

describe('CouponService', () => {
  it('should reject inactive coupon', async () => {
    const { service, couponRepo } = createService();

    couponRepo.findOne.mockResolvedValue({
      id: 1,
      code: 'SAVE10',
      isActive: false,
    });

    await expect(
      service.validateForCheckout({
        code: 'SAVE10',
        userId: 1,
        subtotal: 1_000_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should apply percentage discount with max cap', async () => {
    const { service, couponRepo, usageRepo } = createService();

    couponRepo.findOne.mockResolvedValue({
      id: 1,
      code: 'SAVE20',
      isActive: true,
      startAt: null,
      endAt: null,
      usageLimit: null,
      usageCount: 0,
      usageLimitPerUser: 2,
      minOrderValue: 0,
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 20,
      maxDiscountAmount: 100_000,
    });

    usageRepo.count.mockResolvedValue(0);

    const result = await service.validateForCheckout({
      code: 'SAVE20',
      userId: 1,
      subtotal: 1_000_000,
    });

    expect(result.discountAmount).toBe(100_000);
  });

  it('should reject coupon when min order value is not met', async () => {
    const { service, couponRepo } = createService();

    couponRepo.findOne.mockResolvedValue({
      id: 1,
      code: 'SAVE50K',
      isActive: true,
      startAt: null,
      endAt: null,
      usageLimit: null,
      usageCount: 0,
      usageLimitPerUser: null,
      minOrderValue: 2_000_000,
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 50_000,
      maxDiscountAmount: null,
    });

    await expect(
      service.validateForCheckout({
        code: 'SAVE50K',
        userId: 1,
        subtotal: 1_000_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
