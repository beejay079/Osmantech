// routes/upload.js
const express   = require('express');
const multer    = require('multer');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const crypto    = require('crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// On Railway/render/etc., set UPLOADS_DIR to your persistent volume path
// (e.g. /data/uploads) so user-uploaded images survive redeploys.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'public', 'uploads');
if (!require('fs').existsSync(UPLOADS_DIR)) require('fs').mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const id  = crypto.randomBytes(12).toString('hex');
    cb(null, id + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter (req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif|jpg)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, WEBP or GIF images are allowed'));
  }
});

// Tighter rate-limit for public uploads to prevent disk-spam
const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,                  // 30 uploads (single or multi calls) per 15 min per IP
  message: { error: 'Too many uploads — please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /api/upload — single image, requires auth (used by admin)
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// POST /api/upload/multiple — up to 5 images, NO auth (for public sell/swap forms)
// Field name: 'files' (multiple)
router.post('/multiple', publicUploadLimiter, upload.array('files', 5), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
  res.json({
    urls: req.files.map(f => `/uploads/${f.filename}`),
    count: req.files.length
  });
});

// POST /api/upload/admin-multiple — up to 8 images, admin (for product listing gallery)
router.post('/admin-multiple', requireAuth, upload.array('files', 8), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
  res.json({
    urls: req.files.map(f => `/uploads/${f.filename}`),
    count: req.files.length
  });
});

router.use((err, req, res, next) => {
  // Multer errors land here
  if (err.code === 'LIMIT_FILE_SIZE')      return res.status(400).json({ error: 'File too large (max 5 MB)' });
  if (err.code === 'LIMIT_FILE_COUNT')     return res.status(400).json({ error: 'Too many files' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Unexpected file field' });
  res.status(400).json({ error: err.message || 'Upload failed' });
});

module.exports = router;
