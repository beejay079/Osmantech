// routes/visits.js — analytics tracking + admin reports
const express = require('express');
const crypto  = require('crypto');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Detect device family from user-agent string
function deviceOf (ua = '') {
  const u = ua.toLowerCase();
  if (/(iphone|ipad|ipod)/.test(u)) return 'iOS';
  if (/android/.test(u))            return 'Android';
  if (/windows/.test(u))            return 'Windows';
  if (/mac os x|macintosh/.test(u)) return 'Mac';
  if (/linux/.test(u))              return 'Linux';
  if (/bot|spider|crawler|crawl/i.test(ua)) return 'Bot';
  return 'Other';
}

// POST /api/visits/track — public, called from every page
router.post('/track', (req, res) => {
  const { path, visitorId, referer } = req.body || {};
  if (!path) return res.json({ ok: true });
  // Skip clearly invalid paths and obvious bots
  const ua = req.headers['user-agent'] || '';
  const device = deviceOf(ua);
  if (device === 'Bot') return res.json({ ok: true });

  // First octets of IP only — privacy-friendly hash
  const rawIp = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  const ip = rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex').slice(0, 16) : null;

  try {
    db.prepare(
      `INSERT INTO visits (path, ip, user_agent, referer, device, visitor_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      String(path).slice(0, 200),
      ip,
      ua.slice(0, 500),
      referer ? String(referer).slice(0, 500) : null,
      device,
      visitorId ? String(visitorId).slice(0, 64) : null
    );
  } catch (e) { /* swallow — analytics must never break the page */ }

  res.json({ ok: true });
});

// GET /api/visits/stats — admin only
router.get('/stats', requireAdmin, (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const day7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalVisits = db.prepare('SELECT COUNT(*) AS c FROM visits').get().c;
  const totalUnique = db.prepare('SELECT COUNT(DISTINCT visitor_id) AS c FROM visits WHERE visitor_id IS NOT NULL').get().c;

  const today  = db.prepare('SELECT COUNT(*) AS c FROM visits WHERE created_at >= ?').get(startOfDay.toISOString()).c;
  const todayUnique = db.prepare('SELECT COUNT(DISTINCT visitor_id) AS c FROM visits WHERE created_at >= ? AND visitor_id IS NOT NULL').get(startOfDay.toISOString()).c;

  const week   = db.prepare('SELECT COUNT(*) AS c FROM visits WHERE created_at >= ?').get(day7.toISOString()).c;
  const weekUnique = db.prepare('SELECT COUNT(DISTINCT visitor_id) AS c FROM visits WHERE created_at >= ? AND visitor_id IS NOT NULL').get(day7.toISOString()).c;

  const month  = db.prepare('SELECT COUNT(*) AS c FROM visits WHERE created_at >= ?').get(day30.toISOString()).c;
  const monthUnique = db.prepare('SELECT COUNT(DISTINCT visitor_id) AS c FROM visits WHERE created_at >= ? AND visitor_id IS NOT NULL').get(day30.toISOString()).c;

  // Top pages last 30 days
  const topPages = db.prepare(
    `SELECT path, COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS uniques
     FROM visits WHERE created_at >= ?
     GROUP BY path ORDER BY visits DESC LIMIT 15`
  ).all(day30.toISOString());

  // Daily breakdown last 14 days
  const daily = db.prepare(
    `SELECT DATE(created_at) AS day, COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS uniques
     FROM visits WHERE created_at >= datetime('now','-14 days')
     GROUP BY DATE(created_at) ORDER BY day`
  ).all();

  // Device breakdown last 30 days
  const devices = db.prepare(
    `SELECT device, COUNT(*) AS visits FROM visits
     WHERE created_at >= ? GROUP BY device ORDER BY visits DESC`
  ).all(day30.toISOString());

  // Recent visits
  const recent = db.prepare(
    `SELECT path, device, referer, created_at FROM visits
     ORDER BY created_at DESC LIMIT 30`
  ).all();

  res.json({
    totals: { all: totalVisits, allUnique: totalUnique, today, todayUnique, week, weekUnique, month, monthUnique },
    topPages, daily, devices, recent
  });
});

module.exports = router;
