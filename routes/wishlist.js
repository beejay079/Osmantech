// routes/wishlist.js
const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/wishlist/toggle
router.post('/toggle', requireAuth, (req, res) => {
  const { productId } = req.body || {};
  if (!productId) return res.status(400).json({ error: 'productId required' });

  const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
  if (existing) {
    db.prepare('DELETE FROM wishlist WHERE id = ?').run(existing.id);
    return res.json({ inWishlist: false });
  }
  db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, productId);
  res.json({ inWishlist: true });
});

// GET /api/wishlist
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, w.created_at AS added_at FROM wishlist w
    JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ? ORDER BY w.created_at DESC
  `).all(req.user.id);
  res.json({ products: rows });
});

// GET /api/wishlist/ids
router.get('/ids', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT product_id FROM wishlist WHERE user_id = ?').all(req.user.id);
  res.json({ ids: rows.map(r => r.product_id) });
});

module.exports = router;
