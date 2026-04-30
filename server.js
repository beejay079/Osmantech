// server.js — OSMANTECH backend entrypoint
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const cookieParser= require('cookie-parser');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const { seedIfEmpty } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed on Render/Railway/Heroku)
app.set('trust proxy', 1);

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API rate limit — generous for a marketplace
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// Serve uploads explicitly so they work cross-origin
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ─── API routes ─────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/swaps',         require('./routes/swaps'));
app.use('/api/repairs',       require('./routes/repairs'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/wishlist',      require('./routes/wishlist'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/contact',       require('./routes/contact'));
app.use('/api/upload',        require('./routes/upload'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/visits',        require('./routes/visits'));

// Expose safe config (public keys) to the frontend
app.get('/api/config', (req, res) => {
  res.json({
    paystackPublicKey:    process.env.PAYSTACK_PUBLIC_KEY    || '',
    flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
    googleClientId:       process.env.GOOGLE_CLIENT_ID       || '',
    whatsappNumber:       '2348132664146',
    phoneNumbers:         ['08132664146', '08037775657'],
    address:              'Keji House, beside Alice Place, stadium Under G Road, Ogbomoso'
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// ─── Static frontend (multi-page) ───────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Nice URLs: /shop → /shop.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ─── Boot ───────────────────────────────────────────────────
seedIfEmpty();
app.listen(PORT, () => {
  console.log(`\nOSMANTECH running on  http://localhost:${PORT}\n`);
});
