import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

type TikiAmplitude = {
  category_l1_name?: string;
  category_l2_name?: string;
  category_l3_name?: string;
  primary_category_name?: string;
};

type TikiItem = {
  name?: string;
  url_key?: string;
  short_description?: string;
  brand_name?: string;
  sku?: string;
  price?: number;
  original_price?: number;
  availability?: number;
  stock_item_qty?: number | null;
  rating_average?: number;
  review_count?: number;
  quantity_sold_value?: number;
  primary_category_path?: string;
  visible_impression_info?: {
    amplitude?: TikiAmplitude;
  };
};

type BrandRow = { id: number; name: string; slug: string };
type CategoryRow = { id: number; name: string; slug: string; parent_id: number | null };
type ProductRow = { id: number; name: string; slug: string; sku: string | null };

const PRODUCT_STATUS = {
  ACTIVE: 'active',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

loadEnv();

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'laptop_shop',
  entities: [],
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function trimToMax(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function buildUniqueSlug(baseInput: string, maxLength: number, used: Set<string>): string {
  const fallback = 'item';
  const base = (slugify(baseInput) || fallback).slice(0, maxLength);
  let candidate = base || fallback;
  let index = 1;
  while (used.has(candidate)) {
    const suffix = `-${index}`;
    const stem = (base || fallback).slice(0, Math.max(1, maxLength - suffix.length));
    candidate = `${stem}${suffix}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function normalizeProductSlug(item: TikiItem): string {
  const rawUrlKey = toStringValue(item.url_key).replace(/-p\d+$/i, '');
  if (rawUrlKey) return rawUrlKey;
  return toStringValue(item.name);
}

function normalizeCategoryChain(item: TikiItem): string[] {
  const amp = item.visible_impression_info?.amplitude;
  const categoryL1 = toStringValue(amp?.category_l1_name);
  const categoryL2 = toStringValue(amp?.category_l2_name);
  const primary = toStringValue(amp?.primary_category_name);
  const categoryL3 = toStringValue(amp?.category_l3_name);

  const chain = [categoryL1, categoryL2, primary || categoryL3].filter(Boolean);
  return chain.length > 0 ? chain : ['Laptop & Phu kien'];
}

async function backupBeforeImport(): Promise<string> {
  const backupDir = resolve(process.cwd(), 'backups');
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(backupDir, `db-backup-before-tiki-import-${timestamp}.json`);

  const tables = ['brands', 'categories', 'products', 'product_images'];
  const snapshot: Record<string, unknown[]> = {};

  for (const table of tables) {
    snapshot[table] = await dataSource.query(`SELECT * FROM \`${table}\``);
  }

  await writeFile(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        tables,
        snapshot,
      },
      null,
      2,
    ),
    'utf8',
  );

  return backupPath;
}

async function insertBrand(name: string, slug: string): Promise<number> {
  const result = (await dataSource.query(
    'INSERT INTO brands (name, slug, description, logo, website, is_active, sort_order) VALUES (?, ?, NULL, NULL, NULL, 1, 0)',
    [name, slug],
  )) as { insertId: number };
  return Number(result.insertId);
}

async function insertCategory(
  name: string,
  slug: string,
  parentId: number | null,
): Promise<number> {
  const result = (await dataSource.query(
    'INSERT INTO categories (name, slug, description, image, parent_id, sort_order, is_active) VALUES (?, ?, NULL, NULL, ?, 0, 1)',
    [name, slug, parentId],
  )) as { insertId: number };
  return Number(result.insertId);
}

async function insertProduct(payload: {
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  salePrice: number | null;
  sku: string | null;
  stockQuantity: number;
  categoryId: number | null;
  brandId: number;
  status: string;
  reviewCount: number;
  ratingAvg: number;
  soldCount: number;
  specs: string;
}): Promise<number> {
  const result = (await dataSource.query(
    `INSERT INTO products (
      name, slug, description, short_description, price, sale_price, sku,
      stock_quantity, category_id, brand_id, seller_id, sold_count,
      rating_avg, review_count, status, specs, is_featured, view_count, sort_order
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, 0, 0)`,
    [
      payload.name,
      payload.slug,
      payload.shortDescription,
      payload.price,
      payload.salePrice,
      payload.sku,
      payload.stockQuantity,
      payload.categoryId,
      payload.brandId,
      payload.soldCount,
      payload.ratingAvg,
      payload.reviewCount,
      payload.status,
      payload.specs,
    ],
  )) as { insertId: number };

  return Number(result.insertId);
}

async function updateProduct(
  id: number,
  payload: {
    name: string;
    shortDescription: string | null;
    price: number;
    salePrice: number | null;
    sku: string | null;
    stockQuantity: number;
    categoryId: number | null;
    brandId: number;
    status: string;
    reviewCount: number;
    ratingAvg: number;
    soldCount: number;
    specs: string;
  },
): Promise<void> {
  await dataSource.query(
    `UPDATE products SET
      name = ?,
      short_description = ?,
      price = ?,
      sale_price = ?,
      sku = ?,
      stock_quantity = ?,
      category_id = ?,
      brand_id = ?,
      sold_count = ?,
      rating_avg = ?,
      review_count = ?,
      status = ?,
      specs = ?,
      sort_order = 0,
      is_featured = 0
    WHERE id = ?`,
    [
      payload.name,
      payload.shortDescription,
      payload.price,
      payload.salePrice,
      payload.sku,
      payload.stockQuantity,
      payload.categoryId,
      payload.brandId,
      payload.soldCount,
      payload.ratingAvg,
      payload.reviewCount,
      payload.status,
      payload.specs,
      id,
    ],
  );
}

async function runImport() {
  const jsonPath = resolve(process.cwd(), 'laptop.json');
  const raw = await readFile(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('laptop.json must be an array');
  }

  const sourceItems = parsed as TikiItem[];
  const validItems = sourceItems.filter((item) => {
    const name = toStringValue(item.name);
    const price = toNumberValue(item.price);
    return Boolean(name) && Boolean(price && price > 0);
  });

  const [brands, categories, products] = await Promise.all([
    dataSource.query('SELECT id, name, slug FROM brands') as Promise<BrandRow[]>,
    dataSource.query('SELECT id, name, slug, parent_id FROM categories') as Promise<CategoryRow[]>,
    dataSource.query('SELECT id, name, slug, sku FROM products') as Promise<ProductRow[]>,
  ]);

  const usedBrandSlugs = new Set(brands.map((item) => item.slug));
  const usedCategorySlugs = new Set(categories.map((item) => item.slug));
  const usedProductSlugs = new Set(products.map((item) => item.slug));

  const brandNameToId = new Map(brands.map((item) => [item.name.trim().toLowerCase(), item.id]));
  const categoryKeyToId = new Map(
    categories.map((item) => [`${item.parent_id ?? 0}:${item.name.trim().toLowerCase()}`, item.id]),
  );
  const productBySlug = new Map(products.map((item) => [item.slug, item]));

  let createdBrands = 0;
  let createdCategories = 0;
  let createdProducts = 0;
  let updatedProducts = 0;
  let skippedProducts = 0;

  for (const item of validItems) {
    const brandNameRaw = toStringValue(item.brand_name) || 'Unknown Brand';
    const brandName = trimToMax(brandNameRaw, 100);
    const brandKey = brandName.toLowerCase();

    let brandId = brandNameToId.get(brandKey);
    if (!brandId) {
      const brandSlug = buildUniqueSlug(brandName, 120, usedBrandSlugs);
      brandId = await insertBrand(brandName, brandSlug);
      brandNameToId.set(brandKey, brandId);
      createdBrands += 1;
    }

    const categoryChain = normalizeCategoryChain(item);
    let parentId: number | null = null;
    for (const categoryNameRaw of categoryChain) {
      const categoryName = trimToMax(categoryNameRaw, 100);
      const key = `${parentId ?? 0}:${categoryName.toLowerCase()}`;
      let categoryId = categoryKeyToId.get(key);
      if (!categoryId) {
        const categorySlug = buildUniqueSlug(categoryName, 120, usedCategorySlugs);
        categoryId = await insertCategory(categoryName, categorySlug, parentId);
        categoryKeyToId.set(key, categoryId);
        createdCategories += 1;
      }
      parentId = categoryId;
    }

    const name = trimToMax(toStringValue(item.name), 255);
    const sku = trimToMax(toStringValue(item.sku), 50) || null;

    const marketPrice = toNumberValue(item.price) || 0;
    const originalPrice = toNumberValue(item.original_price) || 0;
    const basePrice = originalPrice > 0 ? originalPrice : marketPrice;
    const salePrice = basePrice > marketPrice && marketPrice > 0 ? marketPrice : null;

    if (basePrice <= 0) {
      skippedProducts += 1;
      continue;
    }

    const availability = Number(item.availability ?? 0) === 1;
    const stockItemQty = toNumberValue(item.stock_item_qty);
    const stockQuantity =
      stockItemQty !== null && stockItemQty >= 0
        ? Math.floor(stockItemQty)
        : availability
          ? 10
          : 0;

    const incomingSlugBase = normalizeProductSlug(item);
    const normalizedSlug = trimToMax(slugify(incomingSlugBase), 280);
    const existing = normalizedSlug ? productBySlug.get(normalizedSlug) : undefined;

    const payload = {
      name,
      shortDescription: trimToMax(toStringValue(item.short_description), 500) || null,
      price: basePrice,
      salePrice,
      sku,
      stockQuantity,
      categoryId: parentId,
      brandId,
      status: availability ? PRODUCT_STATUS.ACTIVE : PRODUCT_STATUS.OUT_OF_STOCK,
      reviewCount: Math.max(0, Math.floor(toNumberValue(item.review_count) || 0)),
      ratingAvg: Math.max(0, Number((toNumberValue(item.rating_average) || 0).toFixed(2))),
      soldCount: Math.max(0, Math.floor(toNumberValue(item.quantity_sold_value) || 0)),
      specs: JSON.stringify(
        item.primary_category_path
          ? { source: 'tiki', primaryCategoryPath: item.primary_category_path }
          : { source: 'tiki' },
      ),
    };

    if (existing) {
      const sameSku = Boolean(sku && existing.sku && sku === existing.sku);
      const sameName = existing.name.trim().toLowerCase() === name.trim().toLowerCase();
      if (sameSku || sameName) {
        await updateProduct(existing.id, payload);
        updatedProducts += 1;
      } else {
        const slug = buildUniqueSlug(name, 280, usedProductSlugs);
        const id = await insertProduct({ ...payload, slug });
        productBySlug.set(slug, { id, name, slug, sku });
        createdProducts += 1;
      }
      continue;
    }

    const slug = buildUniqueSlug(normalizedSlug || name, 280, usedProductSlugs);
    const id = await insertProduct({ ...payload, slug });
    productBySlug.set(slug, { id, name, slug, sku });
    createdProducts += 1;
  }

  return {
    totalInput: sourceItems.length,
    totalValid: validItems.length,
    createdBrands,
    createdCategories,
    createdProducts,
    updatedProducts,
    skippedProducts,
  };
}

async function bootstrap() {
  await dataSource.initialize();
  try {
    const backupPath = await backupBeforeImport();
    const summary = await runImport();
    console.log('Backup created at:', backupPath);
    console.log('Import summary:', summary);
  } finally {
    await dataSource.destroy();
  }
}

void bootstrap();
