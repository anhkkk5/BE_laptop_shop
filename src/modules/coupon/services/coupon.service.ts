import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartService } from '../../cart/services/cart.service.js';
import { ProductService } from '../../product/services/product.service.js';
import { CreateCouponDto } from '../dtos/create-coupon.dto.js';
import { QueryCouponDto } from '../dtos/query-coupon.dto.js';
import { UpdateCouponDto } from '../dtos/update-coupon.dto.js';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum.js';
import { CouponErrorCode } from '../enums/coupon-error-code.enum.js';
import { CouponCollection } from '../entities/coupon-collection.entity.js';
import { CouponUsage } from '../entities/coupon-usage.entity.js';
import { Coupon } from '../entities/coupon.entity.js';

interface CheckoutValidationInput {
  code: string;
  userId: number;
  subtotal: number;
  cartProductIds?: number[];
}

function couponError(errorCode: CouponErrorCode, message: string): never {
  const err = new BadRequestException({ errorCode, message });
  throw err;
}

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly usageRepo: Repository<CouponUsage>,
    @InjectRepository(CouponCollection)
    private readonly collectionRepo: Repository<CouponCollection>,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
  ) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private toNullableDate(value?: string): Date | null {
    if (!value) return null;
    return new Date(value);
  }

  private ensureDateRange(startAt: Date | null, endAt: Date | null): void {
    if (startAt && endAt && startAt > endAt) {
      throw new BadRequestException('startAt must be before or equal to endAt');
    }
  }

  private ensureDiscountConfig(
    discountType: CouponDiscountType,
    discountValue: number,
    maxDiscountAmount: number | null,
  ): void {
    if (discountType === CouponDiscountType.PERCENTAGE && discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    if (
      discountType === CouponDiscountType.FIXED_AMOUNT &&
      maxDiscountAmount !== null
    ) {
      throw new BadRequestException(
        'maxDiscountAmount is only allowed for percentage discount',
      );
    }
  }

  private calcDiscountAmount(
    coupon: Coupon,
    subtotal: number,
    cartItems?: { productId: number; unitPrice: number; quantity: number }[],
  ): number {
    switch (coupon.discountType) {
      case CouponDiscountType.FIXED_AMOUNT: {
        const val = Number(coupon.discountValue);
        if (val >= subtotal) return Math.max(subtotal - 1, 0);
        return val;
      }
      case CouponDiscountType.PERCENTAGE: {
        const raw = (subtotal * Number(coupon.discountValue)) / 100;
        const bounded =
          coupon.maxDiscountAmount !== null
            ? Math.min(raw, Number(coupon.maxDiscountAmount))
            : raw;
        return Math.min(Math.floor(bounded), subtotal);
      }
      case CouponDiscountType.FREE_SHIPPING: {
        return 0;
      }
      case CouponDiscountType.BUY_X_GET_Y: {
        if (!cartItems?.length) return 0;
        const buyQty = coupon.buyQuantity ?? 2;
        const getQty = coupon.getQuantity ?? 1;

        const eligible = this.filterEligibleItems(coupon, cartItems);
        const totalEligibleQty = eligible.reduce((s, i) => s + i.quantity, 0);
        if (totalEligibleQty < buyQty) return 0;

        const sortedByPrice = eligible
          .flatMap((i) =>
            Array.from({ length: i.quantity }, () => Number(i.unitPrice)),
          )
          .sort((a, b) => a - b);

        const freeCount = Math.min(
          getQty,
          Math.floor(totalEligibleQty / buyQty) * getQty,
        );
        const discount = sortedByPrice
          .slice(0, freeCount)
          .reduce((s, p) => s + p, 0);

        return Math.min(discount, subtotal);
      }
      default:
        return 0;
    }
  }

  private filterEligibleItems<
    T extends { productId: number; categoryId?: number; brandId?: number },
  >(coupon: Coupon, items: T[]): T[] {
    const hasProductFilter =
      coupon.applicableProductIds && coupon.applicableProductIds.length > 0;
    const hasCategoryFilter =
      coupon.applicableCategoryIds && coupon.applicableCategoryIds.length > 0;
    const hasBrandFilter =
      coupon.applicableBrandIds && coupon.applicableBrandIds.length > 0;

    if (!hasProductFilter && !hasCategoryFilter && !hasBrandFilter) {
      return items;
    }

    return items.filter((item) => {
      if (
        hasProductFilter &&
        coupon.applicableProductIds!.includes(item.productId)
      )
        return true;
      if (
        hasCategoryFilter &&
        item.categoryId &&
        coupon.applicableCategoryIds!.includes(item.categoryId)
      )
        return true;
      if (
        hasBrandFilter &&
        item.brandId &&
        coupon.applicableBrandIds!.includes(item.brandId)
      )
        return true;
      return false;
    });
  }

  private async ensureCouponUsable(
    coupon: Coupon,
    userId: number,
    subtotal: number,
    cartProductIds?: number[],
  ): Promise<void> {
    if (!coupon.isActive) {
      couponError(CouponErrorCode.VOUCHER_INACTIVE, 'Coupon is not active');
    }

    const now = new Date();
    if (coupon.startAt && now < coupon.startAt) {
      couponError(
        CouponErrorCode.VOUCHER_NOT_STARTED,
        'Coupon is not started yet',
      );
    }

    if (coupon.endAt && now > coupon.endAt) {
      couponError(CouponErrorCode.VOUCHER_EXPIRED, 'Coupon is expired');
    }

    if (
      coupon.usageLimit !== null &&
      Number(coupon.usageCount) >= Number(coupon.usageLimit)
    ) {
      couponError(
        CouponErrorCode.USAGE_LIMIT_EXCEEDED,
        'Coupon usage limit reached',
      );
    }

    if (subtotal < Number(coupon.minOrderValue)) {
      couponError(
        CouponErrorCode.MINIMUM_ORDER_NOT_MET,
        `Order must be at least ${Number(coupon.minOrderValue)}`,
      );
    }

    if (coupon.usageLimitPerUser !== null) {
      const userUsage = await this.usageRepo.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsage >= Number(coupon.usageLimitPerUser)) {
        couponError(
          CouponErrorCode.USER_USAGE_LIMIT_EXCEEDED,
          'You have reached usage limit for this coupon',
        );
      }
    }

    if (coupon.firstTimeCustomerOnly) {
      const orderCount = await this.usageRepo.manager
        .getRepository('orders')
        .count({ where: { userId } });
      if (orderCount > 0) {
        couponError(
          CouponErrorCode.FIRST_TIME_CUSTOMER_ONLY,
          'This coupon is only for first-time customers',
        );
      }
    }

    if (cartProductIds?.length) {
      const hasFilter =
        (coupon.applicableProductIds &&
          coupon.applicableProductIds.length > 0) ||
        (coupon.applicableCategoryIds &&
          coupon.applicableCategoryIds.length > 0) ||
        (coupon.applicableBrandIds && coupon.applicableBrandIds.length > 0);

      if (hasFilter) {
        const products = await Promise.all(
          cartProductIds.map((id) =>
            this.productService.findById(id).catch(() => null),
          ),
        );

        const items = products.filter(Boolean).map((p) => ({
          productId: p!.id,
          categoryId: p!.categoryId ?? undefined,
          brandId: p!.brandId ?? undefined,
        }));

        const eligible = this.filterEligibleItems(coupon, items);
        if (eligible.length === 0) {
          couponError(
            CouponErrorCode.PRODUCTS_NOT_APPLICABLE,
            'No items in cart match this coupon',
          );
        }
      }
    }
  }

  private async findByCodeOrThrow(code: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({
      where: { code: this.normalizeCode(code) },
    });
    if (!coupon) {
      throw new NotFoundException({
        errorCode: CouponErrorCode.VOUCHER_NOT_FOUND,
        message: 'Coupon not found',
      });
    }
    return coupon;
  }

  async create(dto: CreateCouponDto, actorId: number): Promise<Coupon> {
    const code = this.normalizeCode(dto.code);
    const existing = await this.couponRepo.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const startAt = this.toNullableDate(dto.startAt);
    const endAt = this.toNullableDate(dto.endAt);

    this.ensureDateRange(startAt, endAt);
    this.ensureDiscountConfig(
      dto.discountType,
      dto.discountValue,
      dto.maxDiscountAmount ?? null,
    );

    const coupon = this.couponRepo.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderValue: dto.minOrderValue ?? 0,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      usageLimit: dto.usageLimit ?? null,
      usageLimitPerUser: dto.usageLimitPerUser ?? null,
      startAt,
      endAt,
      applicableProductIds: dto.applicableProductIds ?? null,
      applicableCategoryIds: dto.applicableCategoryIds ?? null,
      applicableBrandIds: dto.applicableBrandIds ?? null,
      firstTimeCustomerOnly: dto.firstTimeCustomerOnly ?? false,
      isStackable: dto.isStackable ?? false,
      priority: dto.priority ?? 0,
      buyQuantity: dto.buyQuantity ?? null,
      getQuantity: dto.getQuantity ?? null,
      isActive: dto.isActive ?? true,
      createdBy: actorId,
    });

    return this.couponRepo.save(coupon);
  }

  async findAll(query: QueryCouponDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const qb = this.couponRepo
      .createQueryBuilder('coupon')
      .orderBy('coupon.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('(coupon.code LIKE :search OR coupon.name LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('coupon.isActive = :isActive', { isActive: query.isActive });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async update(id: number, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findById(id);

    const now = new Date();
    if (coupon.startAt && now >= coupon.startAt) {
      const coreFields: (keyof UpdateCouponDto)[] = [
        'discountType',
        'discountValue',
        'minOrderValue',
        'maxDiscountAmount',
      ];
      const attemptedCoreChange = coreFields.some((f) => dto[f] !== undefined);
      if (attemptedCoreChange) {
        throw new BadRequestException({
          errorCode: CouponErrorCode.MODIFICATION_LOCKED,
          message:
            'Cannot modify core discount parameters after the valid period has started',
        });
      }
    }

    const nextCode =
      dto.code !== undefined ? this.normalizeCode(dto.code) : coupon.code;

    if (nextCode !== coupon.code) {
      const duplicated = await this.couponRepo.findOne({
        where: { code: nextCode },
      });
      if (duplicated) {
        throw new ConflictException('Coupon code already exists');
      }
      coupon.code = nextCode;
    }

    const nextStartAt =
      dto.startAt !== undefined
        ? this.toNullableDate(dto.startAt)
        : coupon.startAt;
    const nextEndAt =
      dto.endAt !== undefined ? this.toNullableDate(dto.endAt) : coupon.endAt;

    this.ensureDateRange(nextStartAt, nextEndAt);
    this.ensureDiscountConfig(
      dto.discountType ?? coupon.discountType,
      dto.discountValue ?? Number(coupon.discountValue),
      dto.maxDiscountAmount !== undefined
        ? dto.maxDiscountAmount
        : coupon.maxDiscountAmount,
    );

    if (dto.name !== undefined) coupon.name = dto.name.trim();
    if (dto.description !== undefined)
      coupon.description = dto.description?.trim() || null;
    if (dto.discountType !== undefined) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      coupon.discountValue = dto.discountValue;
    if (dto.minOrderValue !== undefined)
      coupon.minOrderValue = dto.minOrderValue;
    if (dto.maxDiscountAmount !== undefined)
      coupon.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.usageLimit !== undefined) coupon.usageLimit = dto.usageLimit;
    if (dto.usageLimitPerUser !== undefined)
      coupon.usageLimitPerUser = dto.usageLimitPerUser;
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;
    if (dto.applicableProductIds !== undefined)
      coupon.applicableProductIds = dto.applicableProductIds ?? null;
    if (dto.applicableCategoryIds !== undefined)
      coupon.applicableCategoryIds = dto.applicableCategoryIds ?? null;
    if (dto.applicableBrandIds !== undefined)
      coupon.applicableBrandIds = dto.applicableBrandIds ?? null;
    if (dto.firstTimeCustomerOnly !== undefined)
      coupon.firstTimeCustomerOnly = dto.firstTimeCustomerOnly;
    if (dto.isStackable !== undefined) coupon.isStackable = dto.isStackable;
    if (dto.priority !== undefined) coupon.priority = dto.priority;
    if (dto.buyQuantity !== undefined)
      coupon.buyQuantity = dto.buyQuantity ?? null;
    if (dto.getQuantity !== undefined)
      coupon.getQuantity = dto.getQuantity ?? null;

    coupon.startAt = nextStartAt;
    coupon.endAt = nextEndAt;

    return this.couponRepo.save(coupon);
  }

  async deactivate(id: number): Promise<void> {
    const coupon = await this.findById(id);
    coupon.isActive = false;
    await this.couponRepo.save(coupon);
  }

  async validateForCheckout(input: CheckoutValidationInput) {
    const coupon = await this.findByCodeOrThrow(input.code);
    await this.ensureCouponUsable(
      coupon,
      input.userId,
      input.subtotal,
      input.cartProductIds,
    );

    const discountAmount = this.calcDiscountAmount(coupon, input.subtotal);

    return { coupon, discountAmount };
  }

  async validateForMyCart(userId: number, code: string) {
    const cart = await this.cartService.getMyCart(userId);
    if (!cart.items.length) {
      couponError(CouponErrorCode.CART_EMPTY, 'Cart is empty');
    }

    const cartProductIds = cart.items.map(
      (i: { productId: number }) => i.productId,
    );

    const validated = await this.validateForCheckout({
      code,
      userId,
      subtotal: cart.summary.subtotal,
      cartProductIds,
    });

    return {
      code: validated.coupon.code,
      discountType: validated.coupon.discountType,
      discountValue: Number(validated.coupon.discountValue),
      subtotal: cart.summary.subtotal,
      discountAmount: validated.discountAmount,
      total: Math.max(cart.summary.subtotal - validated.discountAmount, 0),
      isFreeShipping:
        validated.coupon.discountType === CouponDiscountType.FREE_SHIPPING,
    };
  }

  async markCouponUsed(
    couponId: number,
    userId: number,
    orderId: number,
    discountAmount: number,
  ): Promise<void> {
    const coupon = await this.findById(couponId);

    await this.usageRepo.save(
      this.usageRepo.create({ couponId, userId, orderId, discountAmount }),
    );

    coupon.usageCount = Number(coupon.usageCount) + 1;
    await this.couponRepo.save(coupon);
  }

  async rollbackCouponUsage(orderId: number): Promise<void> {
    const usages = await this.usageRepo.find({ where: { orderId } });
    for (const usage of usages) {
      const coupon = await this.couponRepo.findOne({
        where: { id: usage.couponId },
      });
      if (coupon) {
        coupon.usageCount = Math.max(Number(coupon.usageCount) - 1, 0);
        await this.couponRepo.save(coupon);
      }
    }
    await this.usageRepo.delete({ orderId });
  }

  async findActiveForCustomer(userId: number) {
    const now = new Date();

    const qb = this.couponRepo
      .createQueryBuilder('coupon')
      .where('coupon.isActive = :active', { active: true })
      .andWhere('(coupon.startAt IS NULL OR coupon.startAt <= :now)', { now })
      .andWhere('(coupon.endAt IS NULL OR coupon.endAt >= :now)', { now })
      .orderBy('coupon.priority', 'DESC')
      .addOrderBy('coupon.createdAt', 'DESC');

    const coupons = await qb.getMany();

    const collected = await this.collectionRepo.find({
      where: { userId },
    });
    const collectedIds = new Set(collected.map((c) => c.couponId));

    return coupons.map((c) => ({
      ...c,
      isCollected: collectedIds.has(c.id),
    }));
  }

  async collectCoupon(userId: number, couponId: number): Promise<void> {
    const coupon = await this.findById(couponId);
    if (!coupon.isActive) {
      couponError(CouponErrorCode.VOUCHER_INACTIVE, 'Coupon is not active');
    }

    const existing = await this.collectionRepo.findOne({
      where: { userId, couponId },
    });
    if (existing) {
      throw new ConflictException({
        errorCode: CouponErrorCode.ALREADY_COLLECTED,
        message: 'You have already collected this coupon',
      });
    }

    await this.collectionRepo.save(
      this.collectionRepo.create({ userId, couponId }),
    );
  }

  async getMyCollection(userId: number) {
    const now = new Date();
    const collections = await this.collectionRepo.find({
      where: { userId },
      relations: ['coupon'],
      order: { collectedAt: 'DESC' },
    });

    return collections.map((c) => {
      const coupon = c.coupon;
      const isExpired = coupon.endAt ? now > coupon.endAt : false;
      const isUsable = coupon.isActive && !isExpired;

      return {
        collectionId: c.id,
        collectedAt: c.collectedAt,
        coupon,
        isExpired,
        isUsable,
      };
    });
  }

  async getBestForCart(userId: number) {
    const cart = await this.cartService.getMyCart(userId);
    if (!cart.items.length) {
      return { suggestions: [] };
    }

    const subtotal = cart.summary.subtotal;
    const cartProductIds = cart.items.map(
      (i: { productId: number }) => i.productId,
    );

    const collections = await this.collectionRepo.find({
      where: { userId },
      relations: ['coupon'],
    });

    const results: {
      coupon: Coupon;
      discountAmount: number;
      isFreeShipping: boolean;
    }[] = [];

    for (const col of collections) {
      const coupon = col.coupon;
      try {
        await this.ensureCouponUsable(coupon, userId, subtotal, cartProductIds);
        const discountAmount = this.calcDiscountAmount(coupon, subtotal);
        results.push({
          coupon,
          discountAmount,
          isFreeShipping:
            coupon.discountType === CouponDiscountType.FREE_SHIPPING,
        });
      } catch {
        // skip unusable coupons
      }
    }

    results.sort((a, b) => b.discountAmount - a.discountAmount);

    return {
      suggestions: results.slice(0, 5).map((r) => ({
        code: r.coupon.code,
        name: r.coupon.name,
        discountType: r.coupon.discountType,
        discountValue: Number(r.coupon.discountValue),
        discountAmount: r.discountAmount,
        isFreeShipping: r.isFreeShipping,
        total: Math.max(subtotal - r.discountAmount, 0),
      })),
      subtotal,
    };
  }

  async getAnalytics(dateFrom?: string, dateTo?: string) {
    const qb = this.usageRepo
      .createQueryBuilder('usage')
      .leftJoinAndSelect('usage.coupon', 'coupon');

    if (dateFrom) {
      qb.andWhere('usage.createdAt >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      qb.andWhere('usage.createdAt <= :dateTo', {
        dateTo: new Date(dateTo),
      });
    }

    const usages = await qb.getMany();

    const byCode = new Map<
      string,
      {
        couponId: number;
        code: string;
        name: string;
        totalUsage: number;
        totalDiscount: number;
        uniqueUsers: Set<number>;
        orderIds: Set<number>;
      }
    >();

    for (const u of usages) {
      const key = u.coupon?.code ?? `id:${u.couponId}`;
      if (!byCode.has(key)) {
        byCode.set(key, {
          couponId: u.couponId,
          code: u.coupon?.code ?? key,
          name: u.coupon?.name ?? '',
          totalUsage: 0,
          totalDiscount: 0,
          uniqueUsers: new Set(),
          orderIds: new Set(),
        });
      }
      const entry = byCode.get(key)!;
      entry.totalUsage++;
      entry.totalDiscount += Number(u.discountAmount);
      entry.uniqueUsers.add(u.userId);
      entry.orderIds.add(u.orderId);
    }

    const items = Array.from(byCode.values()).map((e) => ({
      couponId: e.couponId,
      code: e.code,
      name: e.name,
      totalUsage: e.totalUsage,
      totalDiscount: e.totalDiscount,
      uniqueUsers: e.uniqueUsers.size,
      totalOrders: e.orderIds.size,
      avgOrderDiscount:
        e.totalUsage > 0 ? Math.round(e.totalDiscount / e.totalUsage) : 0,
    }));

    items.sort((a, b) => b.totalUsage - a.totalUsage);

    return { items, totalUsages: usages.length };
  }

  async expireOverdueCoupons(): Promise<number> {
    const now = new Date();
    const result = await this.couponRepo
      .createQueryBuilder()
      .update(Coupon)
      .set({ isActive: false })
      .where('is_active = :active', { active: true })
      .andWhere('end_at IS NOT NULL')
      .andWhere('end_at < :now', { now })
      .execute();

    return result.affected ?? 0;
  }
}
