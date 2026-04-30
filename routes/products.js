// routes/products.js
const express = require('express');
const { db } = require('../database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Parse the images JSON column safely
function parseImages (product) {
  if (!product) return product;
  if (product.images && typeof product.images === 'string') {
    try { product.images = JSON.parse(product.images); }
    catch { product.images = []; }
  } else if (!product.images) {
    product.images = [];
  }
  return product;
}

// GET /api/products — list with filters
router.get('/', (req, res) => {
  const { category, brand, condition, q, minPrice, maxPrice, featured, sort = 'newest', limit = 60 } = req.query;
  const where = ["status = 'approved'"];
  const params = [];

  if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
  if (brand)     { where.push('brand = ?');     params.push(brand); }
  if (condition) { where.push('condition = ?'); params.push(condition); }
  if (featured)  { where.push('featured = 1'); }
  if (minPrice)  { where.push('price >= ?');    params.push(Number(minPrice)); }
  if (maxPrice)  { where.push('price <= ?');    params.push(Number(maxPrice)); }
  if (q) {
    where.push('(name LIKE ? OR brand LIKE ? OR description LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  let orderBy = 'created_at DESC';
  if (sort === 'price-asc')  orderBy = 'price ASC';
  if (sort === 'price-desc') orderBy = 'price DESC';
  if (sort === 'rating')     orderBy = 'rating DESC';

  const sql = `SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ?`;
  params.push(Number(limit));
  const rows = db.prepare(sql).all(...params);
  rows.forEach(parseImages);
  res.json({ products: rows });
});

// GET /api/products/meta — categories, brands, price range
router.get('/meta', (req, res) => {
  const categories = db.prepare("SELECT DISTINCT category FROM products WHERE status = 'approved' ORDER BY category").all().map(r => r.category);
  const brands     = db.prepare("SELECT DISTINCT brand    FROM products WHERE status = 'approved' AND brand IS NOT NULL ORDER BY brand").all().map(r => r.brand);
  const priceRange = db.prepare("SELECT MIN(price) AS min, MAX(price) AS max FROM products WHERE status = 'approved'").get();
  res.json({ categories, brands, priceRange });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  parseImages(product);

  const seller = product.seller_id
    ? db.prepare('SELECT id, name, created_at FROM users WHERE id = ?').get(product.seller_id)
    : null;

  const reviews = db.prepare(`
    SELECT r.*, u.name AS user_name
    FROM reviews r LEFT JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);

  res.json({ product, seller, reviews });
});

// POST /api/products — user creates a listing (auto-pending unless admin)
router.post('/', requireAuth, (req, res) => {
  const { name, brand, category, condition, price, original_price, description, image, images, phone, location, stock, featured } = req.body || {};
  if (!name || !category || !price) return res.status(400).json({ error: 'Name, category and price are required' });

  // images is an array of additional image URLs (gallery beyond the main `image`)
  const imagesJson = Array.isArray(images) && images.length ? JSON.stringify(images.filter(Boolean)) : null;
  // If no main image but images[] has entries, promote the first one
  const mainImage = image || (Array.isArray(images) && images[0]) || null;

  const isAdmin = req.user.role === 'admin';
  const status = isAdmin ? 'approved' : 'pending';
  const result = db.prepare(`
    INSERT INTO products (seller_id, name, brand, category, condition, price, original_price, description, image, images, phone, location, stock, status, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    name, brand || null, category, condition || 'used',
    Math.round(Number(price)),
    original_price ? Math.round(Number(original_price)) : null,
    description || null,
    mainImage,
    imagesJson,
    phone || req.user.phone || null,
    location || 'Ogbomoso',
    stock ? Math.max(1, Number(stock)) : 1,
    status,
    (isAdmin && featured) ? 1 : 0
  );

  // Notify admin
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  admins.forEach(a => {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'info', ?)`)
      .run(a.id, 'New listing submitted', `${req.user.name} listed "${name}" — review required.`, `/admin.html`);
  });

  // Notify seller
  db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'info')`)
    .run(req.user.id, 'Listing submitted', `Your "${name}" listing is awaiting review.`);

  res.json({ id: result.lastInsertRowid, status });
});

// GET /api/products/mine/list — seller's own listings
router.get('/mine/list', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC').all(req.user.id);
  rows.forEach(parseImages);
  res.json({ products: rows });
});

// PUT /api/products/:id — update own listing
router.put('/:id', requireAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Not your listing' });

  const isAdmin = req.user.role === 'admin';
  const { name, brand, category, condition, price, original_price, description, image, images, phone, location, stock, featured, status } = req.body || {};

  // Coerce undefined → null (better-sqlite3 rejects undefined params).
  // null + COALESCE(?, col) keeps the existing column value unchanged.
  const v = (x) => x === undefined ? null : x;
  const featuredVal = (featured === undefined || featured === null) ? null : (featured ? 1 : 0);
  const opVal = (original_price === undefined || original_price === null || original_price === '') ? null : Math.round(Number(original_price));

  // images: array → JSON string. Pass null to keep existing, [] to clear.
  let imagesVal = null;
  if (Array.isArray(images)) imagesVal = JSON.stringify(images.filter(Boolean));

  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name), brand = COALESCE(?, brand), category = COALESCE(?, category),
      condition = COALESCE(?, condition), price = COALESCE(?, price),
      original_price = COALESCE(?, original_price), description = COALESCE(?, description),
      image = COALESCE(?, image), images = COALESCE(?, images),
      phone = COALESCE(?, phone), location = COALESCE(?, location),
      stock = COALESCE(?, stock),
      featured = CASE WHEN ? = 1 THEN COALESCE(?, featured) ELSE featured END,
      status   = CASE WHEN ? = 1 THEN COALESCE(?, status)   ELSE status END
    WHERE id = ?
  `).run(
    v(name), v(brand), v(category), v(condition),
    price ? Math.round(Number(price)) : null,
    opVal, v(description), v(image), imagesVal,
    v(phone), v(location),
    stock !== undefined && stock !== null ? Math.max(0, Number(stock)) : null,
    isAdmin ? 1 : 0, featuredVal,
    isAdmin ? 1 : 0, v(status),
    req.params.id
  );

  res.json({ ok: true });
});

// DELETE /api/products/:id
router.delete('/:id', requireAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Not your listing' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
