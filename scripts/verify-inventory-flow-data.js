const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laptop_shop',
  });

  try {
    const [counts] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM inventories) AS inventories,
        (SELECT COUNT(*) FROM stock_movements) AS stockMovements,
        (SELECT COUNT(*) FROM stock_reservations) AS stockReservations,
        (SELECT COUNT(*) FROM orders WHERE order_code LIKE 'INVSEED-%') AS seedOrders,
        (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.order_code LIKE 'INVSEED-%') AS seedOrderItems
    `);

    const [inventoryFk] = await conn.query(`
      SELECT i.id, i.product_id AS productId
      FROM inventories i
      LEFT JOIN products p ON p.id = i.product_id
      WHERE p.id IS NULL
      LIMIT 20
    `);

    const [movementFk] = await conn.query(`
      SELECT sm.id, sm.product_id AS productId, sm.created_by AS createdBy
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      LEFT JOIN users u ON u.id = sm.created_by
      WHERE sm.reference_id LIKE 'SEED-%'
        AND (p.id IS NULL OR (sm.created_by IS NOT NULL AND u.id IS NULL))
      LIMIT 20
    `);

    const [reservationFk] = await conn.query(`
      SELECT sr.id, sr.order_id AS orderId, sr.product_id AS productId
      FROM stock_reservations sr
      LEFT JOIN orders o ON o.id = sr.order_id
      LEFT JOIN products p ON p.id = sr.product_id
      WHERE o.order_code LIKE 'INVSEED-%'
        AND (o.id IS NULL OR p.id IS NULL)
      LIMIT 20
    `);

    const [seedOrderMap] = await conn.query(`
      SELECT
        o.id AS orderId,
        o.order_code AS orderCode,
        o.user_id AS userId,
        COUNT(oi.id) AS itemCount,
        SUM(oi.quantity) AS totalQty
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.order_code LIKE 'INVSEED-%'
      GROUP BY o.id, o.order_code, o.user_id
      ORDER BY o.id ASC
    `);

    const [reservationByStatus] = await conn.query(`
      SELECT status, COUNT(*) AS total
      FROM stock_reservations
      WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE 'INVSEED-%')
      GROUP BY status
      ORDER BY status ASC
    `);

    console.log(
      JSON.stringify(
        {
          counts: counts[0],
          inventoryFk,
          movementFk,
          reservationFk,
          reservationByStatus,
          seedOrderMap,
        },
        null,
        2,
      ),
    );
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
