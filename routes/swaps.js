// routes/swaps.js
const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/swaps
router.post('/', requireAuth, (req, res) => {
  const { haveItem, haveBrand, haveCondition, haveValue, wantItem, notes, phone } = req.body || {};
  if (!haveItem || !wantItem) return res.status(400).json({ error: 'Tell us what you have and what you want' });

  const info = db.prepare(`
    INSERT INTO swaps (user_id, have_item, have_brand, have_condition, have_value, want_item, notes, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, haveItem, haveBrand || null, haveCondition || null, haveValue ? Math.round(Number(haveValue)) : null, wantItem, notes || null, phone || req.user.phone || null);

  db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
    .run(req.user.id, 'Swap request submitted', `We'll reach out about swapping your ${haveItem} for a ${wantItem}.`, '/dashboard.html');

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  admins.forEach(a => db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
    .run(a.id, 'New swap request', `${req.user.name}: ${haveItem} ↔ ${wantItem}`, '/admin.html'));

  res.json({ id: info.lastInsertRowid });
});

// GET /api/swaps/my
router.get('/my', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM swaps WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ swaps: rows });
});

module.exports = router;
