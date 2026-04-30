// routes/repairs.js
const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/repairs
router.post('/', requireAuth, (req, res) => {
  const { deviceType, deviceModel, issue, preferredDate, serviceType, phone } = req.body || {};
  if (!deviceType || !issue) return res.status(400).json({ error: 'Device type and issue description are required' });

  const info = db.prepare(`
    INSERT INTO repairs (user_id, device_type, device_model, issue, preferred_date, service_type, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, deviceType, deviceModel || null, issue, preferredDate || null, serviceType || 'walk-in', phone || req.user.phone || null);

  db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
    .run(req.user.id, 'Repair booking received', `We'll contact you to confirm your ${deviceType} repair.`, '/dashboard.html');

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  admins.forEach(a => db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
    .run(a.id, 'New repair booking', `${req.user.name}: ${deviceType} — ${issue.slice(0, 60)}`, '/admin.html'));

  res.json({ id: info.lastInsertRowid });
});

// GET /api/repairs/my
router.get('/my', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM repairs WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ repairs: rows });
});

module.exports = router;
