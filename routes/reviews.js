// routes/reviews.js
const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews
router.post('/', requireAuth, (req, res) => {
  const { productId, rating, comment } = req.body || {};
  if (!productId || !rating) return res.status(400).json({ error: 'Product ID and rating are required' });
  const r = Math.max(1, Math.min(5, Number(rating)));

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  try {
    db.prepare(`INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
                ON CONFLICT(product_id, user_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = CURRENT_TIMESTAMP`)
      .run(productId, req.user.id, r, comment || null);
  } catch (e) {
    return res.status(500).json({ error: 'Could not save review' });
  }

  // Recalculate product rating
  const stats = db.prepare('SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews WHERE product_id = ?').get(productId);
  db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?')
    .run(Math.round((stats.avg || 0) * 10) / 10, stats.count, productId);

  res.json({ ok: true });
});

// GET /api/reviews/product/:id
router.get('/product/:id', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, u.name AS user_name FROM reviews r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? ORDER BY r.created_at DESC
  `).all(req.params.id);
  res.json({ reviews: rows });
});

module.exports = router;
