// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const { db } = require('../database');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register — DISABLED (admin-only site, no public sign-ups)
router.post('/register', (req, res) => {
  res.status(403).json({ error: 'Public registration is disabled' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !user.password) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const safe = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
  const token = signToken(safe);
  res.json({ user: safe, token });
});

// POST /api/auth/google — DISABLED (admin-only site)
router.post('/google', (req, res) => {
  res.status(403).json({ error: 'Google sign-in is disabled' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me — update profile
router.put('/me', requireAuth, (req, res) => {
  const { name, phone } = req.body || {};
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
    .run(name, phone, req.user.id);
  const user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// POST /api/auth/password — change password
router.post('/password', requireAuth, (req, res) => {
  const { current, next: nextPw } = req.body || {};
  if (!current || !nextPw) return res.status(400).json({ error: 'Both passwords required' });
  if (nextPw.length < 6) return res.status(400).json({ error: 'New password too short' });

  const row = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!row.password) return res.status(400).json({ error: 'Social accounts cannot change password here' });
  if (!bcrypt.compareSync(current, row.password)) return res.status(401).json({ error: 'Current password is incorrect' });

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(nextPw, 10), req.user.id);
  res.json({ ok: true });
});

module.exports = router;
