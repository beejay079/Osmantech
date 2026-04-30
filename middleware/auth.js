// middleware/auth.js
const jwt = require('jsonwebtoken');
const { db } = require('../database');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function extractToken (req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

function requireAuth (req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin (req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    next();
  });
}

function optionalAuth (req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(payload.id);
    if (user) req.user = user;
  } catch (_) {}
  next();
}

function signToken (user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { requireAuth, requireAdmin, optionalAuth, signToken };
