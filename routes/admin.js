// routes/admin.js
const express = require('express');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const totalUsers     = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const totalProducts  = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const pendingProducts= db.prepare("SELECT COUNT(*) AS c FROM products WHERE status = 'pending'").get().c;
  const totalOrders    = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const totalRepairs   = db.prepare('SELECT COUNT(*) AS c FROM repairs').get().c;
  const totalSwaps     = db.prepare('SELECT COUNT(*) AS c FROM swaps').get().c;
  const revenue        = db.prepare("SELECT COALESCE(SUM(total),0) AS t FROM orders WHERE payment_status = 'paid'").get().t;

  // Last 7 days of orders
  const daily = db.prepare(`
    SELECT DATE(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
    FROM orders WHERE created_at >= datetime('now','-7 days')
    GROUP BY DATE(created_at) ORDER BY day
  `).all();

  res.json({ totalUsers, totalProducts, pendingProducts, totalOrders, totalRepairs, totalSwaps, revenue, daily });
});

// ─── Users ──────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users: rows });
});
router.delete('/users/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});
router.put('/users/:id', (req, res) => {
  const { name, email, phone } = req.body || {};
  if (email) {
    const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase().trim(), req.params.id);
    if (dup) return res.status(409).json({ error: 'Email already in use' });
  }
  db.prepare(`UPDATE users SET
    name  = COALESCE(?, name),
    email = COALESCE(?, email),
    phone = COALESCE(?, phone)
    WHERE id = ?`).run(name || null, email ? email.toLowerCase().trim() : null, phone !== undefined ? phone : null, req.params.id);
  const user = db.prepare('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json({ user });
});

// ─── Products (all, including pending) ──────────────────────
router.get('/products', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, u.name AS seller_name FROM products p
    LEFT JOIN users u ON u.id = p.seller_id
    ORDER BY p.created_at DESC
  `).all();
  // Parse images JSON for each row
  rows.forEach(p => {
    if (p.images && typeof p.images === 'string') {
      try { p.images = JSON.parse(p.images); } catch { p.images = []; }
    } else if (!p.images) p.images = [];
  });
  res.json({ products: rows });
});
router.put('/products/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'pending', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const product = db.prepare('SELECT seller_id, name FROM products WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, req.params.id);
  if (product && product.seller_id) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`)
      .run(product.seller_id, `Listing ${status}`, `Your listing "${product.name}" was ${status}.`, status === 'approved' ? 'success' : 'info');
  }
  res.json({ ok: true });
});
router.put('/products/:id/feature', (req, res) => {
  const { featured } = req.body || {};
  db.prepare('UPDATE products SET featured = ? WHERE id = ?').run(featured ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
router.delete('/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Orders ─────────────────────────────────────────────────
router.get('/orders', (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, u.name AS user_name, u.email AS user_email FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all();
  const withItems = rows.map(o => ({ ...o, items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id) }));
  res.json({ orders: withItems });
});
router.put('/orders/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!['processing', 'shipped', 'delivered', 'cancelled', 'awaiting-payment'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  const order = db.prepare('SELECT user_id, id FROM orders WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (order) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
      .run(order.user_id, 'Order update', `Order #${order.id} is now ${status}.`, '/dashboard.html');
  }
  res.json({ ok: true });
});

// ─── Repairs ────────────────────────────────────────────────
router.get('/repairs', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, u.name AS user_name, u.email AS user_email FROM repairs r
    LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC
  `).all();
  res.json({ repairs: rows });
});
router.put('/repairs/:id/status', (req, res) => {
  const { status, quote, adminNotes } = req.body || {};
  const valid = ['received', 'diagnosing', 'quoted', 'in-progress', 'ready', 'completed', 'cancelled'];
  if (status && !valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const repair = db.prepare('SELECT user_id, device_type, id FROM repairs WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE repairs SET status = COALESCE(?, status), quote = COALESCE(?, quote), admin_notes = COALESCE(?, admin_notes) WHERE id = ?')
    .run(status, quote, adminNotes, req.params.id);
  if (repair && status) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
      .run(repair.user_id, 'Repair update', `Your ${repair.device_type} repair (#${repair.id}) is now ${status}${quote ? ` — Quote: ₦${Number(quote).toLocaleString()}` : ''}.`, '/dashboard.html');
  }
  res.json({ ok: true });
});

// ─── Swaps ──────────────────────────────────────────────────
router.get('/swaps', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, u.name AS user_name, u.email AS user_email FROM swaps s
    LEFT JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC
  `).all();
  res.json({ swaps: rows });
});
router.put('/swaps/:id/status', (req, res) => {
  const { status, adminResponse } = req.body || {};
  const valid = ['pending', 'approved', 'rejected', 'completed'];
  if (status && !valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const swap = db.prepare('SELECT user_id, have_item, id FROM swaps WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE swaps SET status = COALESCE(?, status), admin_response = COALESCE(?, admin_response) WHERE id = ?')
    .run(status, adminResponse, req.params.id);
  if (swap && status) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
      .run(swap.user_id, 'Swap request update', `Your swap for ${swap.have_item} is ${status}.`, '/dashboard.html');
  }
  res.json({ ok: true });
});

// ─── Messages ───────────────────────────────────────────────
router.get('/messages', (req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json({ messages: rows });
});
router.put('/messages/:id/handled', (req, res) => {
  db.prepare('UPDATE messages SET handled = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
