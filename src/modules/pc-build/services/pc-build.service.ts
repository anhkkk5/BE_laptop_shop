import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductService } from '../../product/services/product.service.js';
import { Product } from '../../product/entities/product.entity.js';
import { CompatibilityRule } from '../entities/compatibility-rule.entity.js';
import { CheckCompatibilityDto } from '../dtos/check-compatibility.dto.js';
import { SuggestComponentsDto } from '../dtos/suggest-components.dto.js';
import { CreateCompatibilityRuleDto } from '../dtos/create-compatibility-rule.dto.js';
import { UpdateCompatibilityRuleDto } from '../dtos/update-compatibility-rule.dto.js';

type CompatibilityIssue = {
  ruleId: number;
  severity: 'error' | 'warning';
  message: string;
  sourceProductId: number;
  targetProductId: number;
  sourceValue: string;
  targetValue: string;
};

@Injectable()
export class PcBuildService {
  constructor(
    @InjectRepository(CompatibilityRule)
    private readonly ruleRepo: Repository<CompatibilityRule>,
    private readonly productService: ProductService,
  ) {}

  private normalizeText(value: string): string {
    return value.trim().toLowerCase();
  }

  private getComponentType(product: Product): string {
    const categoryText =
      product.category?.slug ||
      product.category?.name ||
      product.name.split(' ')[0] ||
      'unknown';
    return this.normalizeText(categoryText);
  }

  private async getRulesOrdered(): Promise<CompatibilityRule[]> {
    return this.ruleRepo.find({ order: { priority: 'DESC', id: 'ASC' } });
  }

  private evaluateCompatibility(
    products: Product[],
    rules: CompatibilityRule[],
  ): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];

    const byType = new Map<string, Product[]>();
    for (const product of products) {
      const type = this.getComponentType(product);
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(product);
    }

    for (const rule of rules) {
      const sourceType = this.normalizeText(rule.sourceType);
      const targetType = this.normalizeText(rule.targetType);
      const sourceProducts = byType.get(sourceType) || [];
      const targetProducts = byType.get(targetType) || [];

      if (sourceProducts.length === 0 || targetProducts.length === 0) {
        continue;
      }

      for (const sourceProduct of sourceProducts) {
        for (const targetProduct of targetProducts) {
          if (sourceProduct.id === targetProduct.id) {
            continue;
          }

          const sourceRaw = sourceProduct.specs?.[rule.sourceSpecKey];
          const targetRaw = targetProduct.specs?.[rule.targetSpecKey];

          if (!sourceRaw || !targetRaw) {
            continue;
          }

          const sourceValue = this.normalizeText(sourceRaw);
          const targetValue = this.normalizeText(targetRaw);

          if (sourceValue === targetValue) {
            continue;
          }

          const defaultMessage = `${sourceProduct.name} (${rule.sourceSpecKey}: ${sourceRaw}) không tương thích với ${targetProduct.name} (${rule.targetSpecKey}: ${targetRaw})`;

          issues.push({
            ruleId: rule.id,
            severity: rule.strict ? 'error' : 'warning',
            message: rule.message || defaultMessage,
            sourceProductId: sourceProduct.id,
            targetProductId: targetProduct.id,
            sourceValue: sourceRaw,
            targetValue: targetRaw,
          });
        }
      }
    }

    return issues;
  }

  private async loadProductsByIds(ids: number[]): Promise<Product[]> {
    const uniqueIds = [...new Set(ids)];
    const products: Product[] = [];

    for (const id of uniqueIds) {
      try {
        const product = await this.productService.findById(id);
        products.push(product);
      } catch {
        throw new BadRequestException(`Product ${id} not found`);
      }
    }

    return products;
  }

  async getComponentsByType(type: string, limit: number = 20) {
    const normalizedType = this.normalizeText(type);
    const result = await this.productService.findActive({
      page: 1,
      limit: 100,
      search: normalizedType,
    });

    const data = result.data
      .filter((product) => product.stockQuantity > 0)
      .filter((product) => {
        const categorySlug = this.normalizeText(product.category?.slug || '');
        const categoryName = this.normalizeText(product.category?.name || '');
        const productName = this.normalizeText(product.name);
        return (
          categorySlug.includes(normalizedType) ||
          categoryName.includes(normalizedType) ||
          productName.includes(normalizedType)
        );
      })
      .slice(0, limit);

    return {
      type: normalizedType,
      data,
      meta: {
        total: data.length,
        limit,
      },
    };
  }

  async checkCompatibility(dto: CheckCompatibilityDto) {
    const [products, rules] = await Promise.all([
      this.loadProductsByIds(dto.componentIds),
      this.getRulesOrdered(),
    ]);

    const issues = this.evaluateCompatibility(products, rules);
    const errorCount = issues.filter((item) => item.severity === 'error').length;
    const warningCount = issues.filter(
      (item) => item.severity === 'warning',
    ).length;

    return {
      compatible: errorCount === 0,
      summary: {
        selectedCount: products.length,
        checkedRules: rules.length,
        errorCount,
        warningCount,
      },
      issues,
      selectedProducts: products,
    };
  }

  async suggestComponents(dto: SuggestComponentsDto) {
    const selectedIds = dto.selectedComponentIds || [];
    const limit = dto.limit || 8;

    const [selectedProducts, rules, candidateResult] = await Promise.all([
      this.loadProductsByIds(selectedIds),
      this.getRulesOrdered(),
      this.getComponentsByType(dto.targetType, Math.max(limit * 4, 20)),
    ]);

    const selectedSet = new Set(selectedProducts.map((item) => item.id));
    const suggestions = candidateResult.data
      .filter((candidate) => !selectedSet.has(candidate.id))
      .map((candidate) => {
        const issues = this.evaluateCompatibility(
          [...selectedProducts, candidate],
          rules,
        ).filter(
          (item) =>
            item.sourceProductId === candidate.id ||
            item.targetProductId === candidate.id,
        );

        const errorCount = issues.filter((item) => item.severity === 'error').length;
        const warningCount = issues.filter(
          (item) => item.severity === 'warning',
        ).length;

        return {
          product: candidate,
          compatible: errorCount === 0,
          compatibilityScore: Math.max(0, 100 - errorCount * 50 - warningCount * 10),
          errorCount,
          warningCount,
          issues,
        };
      })
      .filter((item) => item.compatibilityScore > 0)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);

    return {
      targetType: this.normalizeText(dto.targetType),
      selectedCount: selectedProducts.length,
      suggestions,
    };
  }

  async getRules() {
    return this.getRulesOrdered();
  }

  async createRule(dto: CreateCompatibilityRuleDto) {
    const entity = this.ruleRepo.create({
      ...dto,
      sourceType: this.normalizeText(dto.sourceType),
      targetType: this.normalizeText(dto.targetType),
    });
    return this.ruleRepo.save(entity);
  }

  async updateRule(id: number, dto: UpdateCompatibilityRuleDto) {
    const entity = await this.ruleRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Compatibility rule not found');
    }

    if (dto.sourceType !== undefined) {
      entity.sourceType = this.normalizeText(dto.sourceType);
    }

    if (dto.targetType !== undefined) {
      entity.targetType = this.normalizeText(dto.targetType);
    }

    if (dto.sourceSpecKey !== undefined) {
      entity.sourceSpecKey = dto.sourceSpecKey;
    }

    if (dto.targetSpecKey !== undefined) {
      entity.targetSpecKey = dto.targetSpecKey;
    }

    if (dto.strict !== undefined) {
      entity.strict = dto.strict;
    }

    if (dto.message !== undefined) {
      entity.message = dto.message;
    }

    if (dto.priority !== undefined) {
      entity.priority = dto.priority;
    }

    return this.ruleRepo.save(entity);
  }

  async deleteRule(id: number) {
    const result = await this.ruleRepo.delete(id);
    if ((result.affected || 0) === 0) {
      throw new NotFoundException('Compatibility rule not found');
    }
    return { deleted: true };
  }
}
