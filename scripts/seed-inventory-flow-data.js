const mysql = require('mysql2/promise');
require('dotenv').config();

const TARGET_CATEGORY_SLUGS = [
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

function formatOrderCode(index) {
  return `INVSEED-${String(index + 1).padStart(3, '0')}`;
}

function reservationStatusByIndex(index) {
  const statuses = ['pending', 'confirmed', 'released', 'expired'];
  return statuses[index % statuses.length];
}

function reservationExpiresAt(status) {
  const now = Date.now();
  if (status === 'pending') {
    return new Date(now + 15 * 60 * 1000);
  }
  if (status === 'expired') {
    return new Date(now - 60 * 60 * 1000);
  }
  return new Date(now + 3 * 24 * 60 * 60 * 1000);
}

function numberFromDb(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laptop_shop',
  });
}

async function resolveUsers(conn) {
  const [adminRows] = await conn.query(
    "SELECT id, role FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1",
  );

  const [staffRows] = await conn.query(
    "SELECT id, role FROM users WHERE role = 'staff' ORDER BY id ASC LIMIT 1",
  );

  const [customerRows] = await conn.query(
    "SELECT id, role FROM users WHERE role IN ('customer', 'user') ORDER BY id ASC LIMIT 5",
  );

  const [fallbackRows] = await conn.query(
    'SELECT id, role FROM users ORDER BY id ASC LIMIT 5',
  );

  const adminId = adminRows[0]?.id || fallbackRows[0]?.id;
  const staffId = staffRows[0]?.id || adminId;

  const customerIds = customerRows.length
    ? customerRows.map((row) => row.id)
    : fallbackRows.filter((row) => row.id !== adminId).map((row) => row.id);

  if (!adminId || customerIds.length === 0) {
    throw new Error(
      'Cannot resolve users for inventory seed (need at least admin + one customer).',
    );
  }

  return {
    adminId,
    staffId,
    customerIds,
  };
}

async function getTargetProducts(conn) {
  const [rows] = await conn.query(
    `
      SELECT
        p.id,
        p.name,
        p.price,
        p.stock_quantity AS stockQuantity,
        c.id AS categoryId,
        c.slug AS categorySlug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE c.slug IN (?)
      ORDER BY c.id ASC, p.id ASC
      LIMIT 100
    `,
    [TARGET_CATEGORY_SLUGS],
  );

  if (rows.length < 30) {
    throw new Error(
      `Not enough products in target categories to seed inventory flow. Found ${rows.length}.`,
    );
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: numberFromDb(row.price),
    stockQuantity: numberFromDb(row.stockQuantity),
    categoryId: row.categoryId,
    categorySlug: row.categorySlug,
  }));
}

function buildOrderPayload(index, userId, itemA, itemB) {
  const qtyA = (index % 3) + 1;
  const qtyB = ((index + 1) % 2) + 1;
  const subtotal = itemA.price * qtyA + itemB.price * qtyB;

  return {
    userId,
    orderCode: formatOrderCode(index),
    status: 'pending',
    customerName: `Khach Seed ${index + 1}`,
    customerPhone: `090000${String(index + 1).padStart(4, '0')}`,
    shippingAddress: `Dia chi seed ${index + 1}, TP Ho Chi Minh`,
    paymentMethod: 'cod',
    subtotal,
    shippingFee: 0,
    discountAmount: 0,
    total: subtotal,
    note: 'Don hang seed luong ton kho',
    items: [
      {
        productId: itemA.id,
        productName: itemA.name,
        unitPrice: itemA.price,
        quantity: qtyA,
        lineTotal: itemA.price * qtyA,
      },
      {
        productId: itemB.id,
        productName: itemB.name,
        unitPrice: itemB.price,
        quantity: qtyB,
        lineTotal: itemB.price * qtyB,
      },
    ],
  };
}

async function upsertOrder(conn, payload) {
  const insertOrderSql = `
    INSERT INTO orders (
      user_id,
      order_code,
      status,
      customer_name,
      customer_phone,
      shipping_address,
      paymentMethod,
      subtotal,
      shipping_fee,
      discount_amount,
      total,
      note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      status = VALUES(status),
      customer_name = VALUES(customer_name),
      customer_phone = VALUES(customer_phone),
      shipping_address = VALUES(shipping_address),
      paymentMethod = VALUES(paymentMethod),
      subtotal = VALUES(subtotal),
      shipping_fee = VALUES(shipping_fee),
      discount_amount = VALUES(discount_amount),
      total = VALUES(total),
      note = VALUES(note)
  `;

  await conn.query(insertOrderSql, [
    payload.userId,
    payload.orderCode,
    payload.status,
    payload.customerName,
    payload.customerPhone,
    payload.shippingAddress,
    payload.paymentMethod,
    payload.subtotal,
    payload.shippingFee,
    payload.discountAmount,
    payload.total,
    payload.note,
  ]);

  const [orderRows] = await conn.query(
    'SELECT id FROM orders WHERE order_code = ? LIMIT 1',
    [payload.orderCode],
  );
  const orderId = orderRows[0]?.id;
  if (!orderId) {
    throw new Error(`Cannot resolve order id for ${payload.orderCode}`);
  }

  await conn.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

  const itemSql = `
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      unit_price,
      quantity,
      line_total
    )
    VALUES (?, ?, ?, NULL, ?, ?, ?)
  `;

  for (const item of payload.items) {
    await conn.query(itemSql, [
      orderId,
      item.productId,
      item.productName,
      item.unitPrice,
      item.quantity,
      item.lineTotal,
    ]);
  }

  return {
    orderId,
    items: payload.items,
  };
}

async function run() {
  const conn = await getConnection();

  try {
    const users = await resolveUsers(conn);
    const products = await getTargetProducts(conn);

    const seedOrders = [];
    for (let i = 0; i < 12; i += 1) {
      const p1 = products[(i * 2) % products.length];
      const p2 = products[(i * 2 + 1) % products.length];
      const customerId = users.customerIds[i % users.customerIds.length];
      const payload = buildOrderPayload(i, customerId, p1, p2);
      const order = await upsertOrder(conn, payload);
      seedOrders.push(order);
    }

    const pendingReservedByProduct = new Map();
    const seededReservations = [];

    for (let i = 0; i < seedOrders.length; i += 1) {
      const order = seedOrders[i];
      const firstItem = order.items[0];
      const status = reservationStatusByIndex(i);
      const qty = Math.max(1, Math.min(firstItem.quantity, 3));
      const expiresAt = reservationExpiresAt(status);

      seededReservations.push({
        orderId: order.orderId,
        productId: firstItem.productId,
        quantity: qty,
        status,
        expiresAt,
      });

      if (status === 'pending') {
        pendingReservedByProduct.set(
          firstItem.productId,
          (pendingReservedByProduct.get(firstItem.productId) || 0) + qty,
        );
      }
    }

    const seedOrderIds = seedOrders.map((o) => o.orderId);

    if (seedOrderIds.length > 0) {
      await conn.query(
        `DELETE FROM stock_reservations WHERE order_id IN (${seedOrderIds
          .map(() => '?')
          .join(',')})`,
        seedOrderIds,
      );
    }

    const upsertInventorySql = `
      INSERT INTO inventories (product_id, available_qty, reserved_qty, damaged_qty, incoming_qty)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        available_qty = VALUES(available_qty),
        reserved_qty = VALUES(reserved_qty),
        damaged_qty = VALUES(damaged_qty),
        incoming_qty = VALUES(incoming_qty)
    `;

    const movementDeleteLike = 'SEED-%';
    await conn.query('DELETE FROM stock_movements WHERE reference_id LIKE ?', [
      movementDeleteLike,
    ]);

    const insertMovementSql = `
      INSERT INTO stock_movements
      (product_id, type, quantity, beforeQty, afterQty, reason, reference_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let inventoryUpserts = 0;
    let movementInserts = 0;

    for (let i = 0; i < products.length; i += 1) {
      const product = products[i];
      const baseStock = Math.max(product.stockQuantity, 10);
      const damaged = i % 9 === 0 ? 2 : i % 5 === 0 ? 1 : 0;
      const incoming = i % 4 === 0 ? 5 : i % 3 === 0 ? 2 : 0;
      const reserved = pendingReservedByProduct.get(product.id) || 0;
      const available = Math.max(baseStock - damaged - reserved, 0);

      await conn.query(upsertInventorySql, [
        product.id,
        available,
        reserved,
        damaged,
        incoming,
      ]);
      inventoryUpserts += 1;

      const importRef = `SEED-IMPORT-${product.id}`;
      await conn.query(insertMovementSql, [
        product.id,
        'import',
        available,
        0,
        available,
        'Seed kho ban dau tu script',
        importRef,
        users.adminId,
      ]);
      movementInserts += 1;

      if (damaged > 0) {
        const adjustRef = `SEED-ADJUST-DMG-${product.id}`;
        await conn.query(insertMovementSql, [
          product.id,
          'adjust',
          damaged,
          0,
          damaged,
          'Seed ton hong mau',
          adjustRef,
          users.staffId,
        ]);
        movementInserts += 1;
      }
    }

    const reservationSql = `
      INSERT INTO stock_reservations (order_id, product_id, quantity, status, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const reservation of seededReservations) {
      await conn.query(reservationSql, [
        reservation.orderId,
        reservation.productId,
        reservation.quantity,
        reservation.status,
        reservation.expiresAt,
      ]);

      const reserveRef = `SEED-RESERVE-${reservation.orderId}-${reservation.productId}`;
      await conn.query(insertMovementSql, [
        reservation.productId,
        'reserve',
        -reservation.quantity,
        reservation.quantity,
        0,
        `Seed reserve for order #${reservation.orderId}`,
        reserveRef,
        users.staffId,
      ]);
      movementInserts += 1;

      if (reservation.status === 'confirmed') {
        const confirmRef = `SEED-CONFIRM-${reservation.orderId}-${reservation.productId}`;
        await conn.query(insertMovementSql, [
          reservation.productId,
          'confirm',
          reservation.quantity,
          reservation.quantity,
          0,
          `Seed confirm reservation #${reservation.orderId}`,
          confirmRef,
          users.adminId,
        ]);
        movementInserts += 1;
      }

      if (
        reservation.status === 'released' ||
        reservation.status === 'expired'
      ) {
        const releaseRef = `SEED-RELEASE-${reservation.orderId}-${reservation.productId}`;
        await conn.query(insertMovementSql, [
          reservation.productId,
          'release',
          reservation.quantity,
          0,
          reservation.quantity,
          `Seed release reservation #${reservation.orderId}`,
          releaseRef,
          users.adminId,
        ]);
        movementInserts += 1;
      }
    }

    const [summaryCounts] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM inventories) AS inventories_count,
        (SELECT COUNT(*) FROM stock_movements) AS stock_movements_count,
        (SELECT COUNT(*) FROM stock_reservations) AS stock_reservations_count,
        (SELECT COUNT(*) FROM orders WHERE order_code LIKE 'INVSEED-%') AS seed_orders_count,
        (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.order_code LIKE 'INVSEED-%') AS seed_order_items_count
    `);

    const [inventorySample] = await conn.query(
      `
      SELECT i.id, i.product_id AS productId, p.name AS productName, c.slug AS categorySlug,
             i.available_qty AS availableQty, i.reserved_qty AS reservedQty,
             i.damaged_qty AS damagedQty, i.incoming_qty AS incomingQty
      FROM inventories i
      JOIN products p ON p.id = i.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE c.slug IN (?)
      ORDER BY i.updated_at DESC
      LIMIT 20
    `,
      [TARGET_CATEGORY_SLUGS],
    );

    const [reservationSample] = await conn.query(`
      SELECT sr.id, sr.order_id AS orderId, o.order_code AS orderCode, sr.product_id AS productId,
             p.name AS productName, sr.quantity, sr.status, sr.expires_at AS expiresAt
      FROM stock_reservations sr
      JOIN orders o ON o.id = sr.order_id
      JOIN products p ON p.id = sr.product_id
      WHERE o.order_code LIKE 'INVSEED-%'
      ORDER BY sr.id DESC
      LIMIT 20
    `);

    const [movementSample] = await conn.query(`
      SELECT sm.id, sm.product_id AS productId, p.name AS productName, sm.type,
             sm.quantity, sm.beforeQty AS beforeQty, sm.afterQty AS afterQty,
             sm.reference_id AS referenceId, sm.created_by AS createdBy
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      WHERE sm.reference_id LIKE 'SEED-%'
      ORDER BY sm.id DESC
      LIMIT 30
    `);

    console.log(
      JSON.stringify(
        {
          users,
          inventoryUpserts,
          movementInserts,
          seededReservations: seededReservations.length,
          summaryCounts: summaryCounts[0],
          inventorySample,
          reservationSample,
          movementSample,
        },
        null,
        2,
      ),
    );
  } finally {
    await conn.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
