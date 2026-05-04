const mysql = require('mysql2/promise');
require('dotenv').config();

const targetCategorySlugs = [
  'laptop',
  'chuot',
  'ban-phim',
  'tai-nghe',
  'man-hinh',
  'o-cung-ssd',
  'ram',
  'webcam',
  'loa-may-tinh',
  'phu-kien-laptop',
];

async function verifySeed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laptop_shop',
  });

  try {
    const [counts] = await conn.query(
      `
      SELECT c.id, c.name, c.slug, COUNT(p.id) AS total_products
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      WHERE c.slug IN (?)
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.sort_order ASC, c.id ASC
      `,
      [targetCategorySlugs],
    );

    const [missingFields] = await conn.query(`
      SELECT id, name, slug
      FROM products
      WHERE category_id IN (SELECT id FROM categories WHERE slug IN (${targetCategorySlugs.map(() => '?').join(',')}))
        AND (
          description IS NULL
          OR short_description IS NULL
          OR sku IS NULL
          OR stock_quantity IS NULL
          OR brand_id IS NULL
          OR category_id IS NULL
          OR status IS NULL
          OR specs IS NULL
        )
      LIMIT 20
    `, targetCategorySlugs);

    const [badPricing] = await conn.query(`
      SELECT id, name, slug, price, sale_price
      FROM products
      WHERE category_id IN (SELECT id FROM categories WHERE slug IN (${targetCategorySlugs.map(() => '?').join(',')}))
        AND (price < 0 OR sale_price < 0 OR sale_price > price)
      LIMIT 20
    `, targetCategorySlugs);

    const [badFk] = await conn.query(`
      SELECT p.id, p.name, p.slug, p.category_id, p.brand_id
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE c.slug IN (${targetCategorySlugs.map(() => '?').join(',')})
        AND (c.id IS NULL OR b.id IS NULL)
      LIMIT 20
    `, targetCategorySlugs);

    const [brandCoverage] = await conn.query(`
      SELECT c.slug AS category_slug, COUNT(DISTINCT b.slug) AS brand_count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      WHERE c.slug IN (${targetCategorySlugs.map(() => '?').join(',')})
      GROUP BY c.slug
      ORDER BY c.slug ASC
    `, targetCategorySlugs);

    console.log(
      JSON.stringify(
        {
          counts,
          missingFields,
          badPricing,
          badFk,
          brandCoverage,
        },
        null,
        2,
      ),
    );
  } finally {
    await conn.end();
  }
}

verifySeed().catch((error) => {
  console.error(error);
  process.exit(1);
});
