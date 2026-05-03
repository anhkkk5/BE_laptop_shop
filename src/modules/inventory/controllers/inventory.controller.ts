import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from '../services/inventory.service.js';
import { ImportStockDto } from '../dtos/import-stock.dto.js';
import { ExportStockDto } from '../dtos/export-stock.dto.js';
import { AdjustStockDto } from '../dtos/adjust-stock.dto.js';
import { StockQueryDto } from '../dtos/stock-query.dto.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../modules/user/enums/user-role.enum.js';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async list(@Query() query: StockQueryDto) {
    return this.inventoryService.listInventory(query.page, query.limit);
  }

  @Get('low-stock')
  async lowStock(@Query('threshold') threshold?: string) {
    const t = threshold ? parseInt(threshold, 10) : 10;
    return this.inventoryService.getLowStock(Number.isNaN(t) ? 10 : t);
  }

  @Get(':productId')
  async getByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.getInventory(productId);
  }

  @Get(':productId/movements')
  async movements(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() query: StockQueryDto,
  ) {
    return this.inventoryService.getMovements(
      productId,
      query.page,
      query.limit,
    );
  }

  @Post('import')
  async importStock(
    @Body() dto: ImportStockDto,
    @CurrentUser('id') userId: number,
  ) {
    const inv = await this.inventoryService.importStock(dto, userId);
    return { message: 'Stock imported', inventory: inv };
  }

  @Post('export')
  async exportStock(
    @Body() dto: ExportStockDto,
    @CurrentUser('id') userId: number,
  ) {
    const inv = await this.inventoryService.exportStock(dto, userId);
    return { message: 'Stock exported', inventory: inv };
  }

  @Post('adjust')
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') userId: number,
  ) {
    const inv = await this.inventoryService.adjustStock(dto, userId);
    return { message: 'Stock adjusted', inventory: inv };
  }
}
