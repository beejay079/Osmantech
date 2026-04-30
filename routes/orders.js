// routes/orders.js
const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders — create order from cart
router.post('/', requireAuth, (req, res) => {
  const { items, shipping, paymentMethod, paymentReference, paymentStatus } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  if (!shipping || !shipping.name || !shipping.phone || !shipping.address) {
    return res.status(400).json({ error: 'Shipping details are required' });
  }

  const productIds = items.map(i => Number(i.id)).filter(Boolean);
  const products = productIds.length
    ? db.prepare(`SELECT id, name, price, image, stock FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`).all(...productIds)
    : [];
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  let total = 0;
  const resolved = items.map(i => {
    const p = productMap[Number(i.id)];
    if (!p) throw Object.assign(new Error(`Product ${i.id} no longer available`), { status: 400 });
    const qty = Math.max(1, Number(i.quantity) || 1);
    const lineTotal = p.price * qty;
    total += lineTotal;
    return { id: p.id, name: p.name, price: p.price, quantity: qty, image: p.image };
  });

  const payStatus = paymentStatus || (paymentMethod === 'pod' ? 'pending' : 'paid');
  const orderStatus = payStatus === 'paid' ? 'processing' : 'awaiting-payment';

  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, total, payment_method, payment_reference, payment_status, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const info = insertOrder.run(
      req.user.id, total,
      paymentMethod || 'pod', paymentReference || null, payStatus,
      shipping.name, shipping.phone, shipping.address,
      shipping.city || 'Ogbomoso', shipping.state || 'Oyo',
      orderStatus
    );
    resolved.forEach(r => insertItem.run(info.lastInsertRowid, r.id, r.name, r.price, r.quantity, r.image));
    return info.lastInsertRowid;
  });
  const orderId = tx();

  db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'success', ?)`)
    .run(req.user.id, 'Order placed!', `Your order #${orderId} (₦${total.toLocaleString()}) was received.`, `/dashboard.html`);

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  admins.forEach(a => db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
    .run(a.id, 'New order received', `Order #${orderId} — ₦${total.toLocaleString()}`, '/admin.html'));

  res.json({ id: orderId, total, status: orderStatus, payment_status: payStatus });
});

// GET /api/orders/my
router.get('/my', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const withItems = orders.map(o => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
  }));
  res.json({ orders: withItems });
});

// GET /api/orders/:id
router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ order: { ...order, items } });
});

module.exports = router;
