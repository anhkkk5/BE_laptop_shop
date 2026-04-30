import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CartRepository } from '../repositories/cart.repository.js';
import { CartItemRepository } from '../repositories/cart-item.repository.js';
import { AddCartItemDto } from '../dtos/add-cart-item.dto.js';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto.js';
import { ProductService } from '../../product/services/product.service.js';
import { ProductStatus } from '../../product/entities/product.entity.js';
import { Cart } from '../entities/cart.entity.js';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartItemRepository: CartItemRepository,
    private readonly productService: ProductService,
  ) {}

  private async getOrCreateCart(userId: number): Promise<Cart> {
    const existing = await this.cartRepository.findByUserId(userId);
    if (existing) return existing;
    return this.cartRepository.create({ userId });
  }

  async getMyCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    const fullCart = await this.cartRepository.findByUserId(cart.userId);

    if (!fullCart) {
      return { items: [], summary: { totalItems: 0, subtotal: 0 } };
    }

    const subtotal = fullCart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    const totalItems = fullCart.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: fullCart.id,
      userId: fullCart.userId,
      items: fullCart.items,
      summary: {
        totalItems,
        subtotal,
      },
    };
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    const product = await this.productService.findById(dto.productId);
    if (product.status !== ProductStatus.ACTIVE) {
      throw new ForbiddenException('Product is not available for sale');
    }

    const cart = await this.getOrCreateCart(userId);
    const existing = await this.cartItemRepository.findByCartAndProduct(
      cart.id,
      dto.productId,
    );

    const requestedQty = (existing?.quantity || 0) + dto.quantity;
    if (requestedQty > product.stockQuantity) {
      throw new ForbiddenException('Not enough stock for this product');
    }

    const primaryImage = product.images.find((img) => img.isPrimary)?.url;
    const fallbackImage = product.images[0]?.url || null;

    if (existing) {
      await this.cartItemRepository.update(existing.id, {
        quantity: requestedQty,
        unitPrice: product.salePrice || product.price,
        productName: product.name,
        productImage: primaryImage || fallbackImage,
      });
    } else {
      await this.cartItemRepository.create({
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
        unitPrice: product.salePrice || product.price,
        productName: product.name,
        productImage: primaryImage || fallbackImage,
      });
    }

    return this.getMyCart(userId);
  }

  async updateItemQuantity(userId: number, itemId: number, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.cartItemRepository.findById(itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.cartId !== cart.id) {
      throw new ForbiddenException('This cart item does not belong to you');
    }

    const product = await this.productService.findById(item.productId);
    if (dto.quantity > product.stockQuantity) {
      throw new ForbiddenException('Not enough stock for this product');
    }

    await this.cartItemRepository.update(item.id, {
      quantity: dto.quantity,
      unitPrice: product.salePrice || product.price,
      productName: product.name,
      productImage:
        product.images.find((img) => img.isPrimary)?.url ||
        product.images[0]?.url ||
        null,
    });

    return this.getMyCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.cartItemRepository.findById(itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.cartId !== cart.id) {
      throw new ForbiddenException('This cart item does not belong to you');
    }

    await this.cartItemRepository.delete(item.id);
    return this.getMyCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepository.deleteByCartId(cart.id);
    return this.getMyCart(userId);
  }
}
