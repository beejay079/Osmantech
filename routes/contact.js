// routes/contact.js
const express = require('express');
const { db } = require('../database');

const router = express.Router();

// POST /api/contact
router.post('/', (req, res) => {
  const { name, email, phone, subject, body } = req.body || {};
  if (!name || !body) return res.status(400).json({ error: 'Name and message are required' });
  db.prepare('INSERT INTO messages (name, email, phone, subject, body) VALUES (?, ?, ?, ?, ?)')
    .run(name, email || null, phone || null, subject || null, body);
  res.json({ ok: true });
});

module.exports = router;
