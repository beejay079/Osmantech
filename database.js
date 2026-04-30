// database.js — SQLite schema, seeding, and helpers
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// On Railway/render/etc., set DATA_DIR to your persistent volume mount path
// (e.g. /data) so the database survives redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'osmantech.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user',
    auth_provider TEXT DEFAULT 'email',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    condition TEXT DEFAULT 'new',
    price INTEGER NOT NULL,
    original_price INTEGER,
    description TEXT,
    image TEXT,
    images TEXT,                 -- JSON array of additional image URLs (gallery)
    stock INTEGER DEFAULT 1,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'approved',
    featured INTEGER DEFAULT 0,
    location TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total INTEGER NOT NULL,
    payment_method TEXT,
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'pending',
    shipping_name TEXT,
    shipping_phone TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_state TEXT,
    status TEXT DEFAULT 'processing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    image TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS swaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    have_item TEXT NOT NULL,
    have_brand TEXT,
    have_condition TEXT,
    have_value INTEGER,
    want_item TEXT NOT NULL,
    notes TEXT,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    admin_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device_type TEXT NOT NULL,
    device_model TEXT,
    issue TEXT NOT NULL,
    preferred_date TEXT,
    service_type TEXT DEFAULT 'walk-in',
    phone TEXT,
    status TEXT DEFAULT 'received',
    quote INTEGER,
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT,
    body TEXT NOT NULL,
    handled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    referer TEXT,
    device TEXT,
    visitor_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
  CREATE INDEX IF NOT EXISTS idx_visits_path ON visits(path);
  CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visitor_id);
`);

// ─────────────────────────────────────────────────────────────
// Migrations — non-destructive ALTER TABLE for upgrades
// ─────────────────────────────────────────────────────────────
function safeAddColumn (table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`); console.log(`[db] migrated: ${table}.${column}`); }
    catch (e) { console.warn(`[db] migration warning: ${e.message}`); }
  }
}
safeAddColumn('products', 'images', 'TEXT');

// Remove the seeded demo user from older installs (cleanup, runs on every boot but is idempotent)
try {
  const demo = db.prepare("SELECT id FROM users WHERE email = 'demo@osmantech.ng' AND role = 'user'").get();
  if (demo) {
    db.prepare('DELETE FROM users WHERE id = ?').run(demo.id);
    console.log('[db] removed leftover demo user');
  }
} catch (e) { /* ignore */ }

// ─────────────────────────────────────────────────────────────
// Seed demo data (only on first run)
// ─────────────────────────────────────────────────────────────
function seedIfEmpty () {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  console.log('[db] Seeding admin and products…');

  const adminPass = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`
  );
  const adminId = insertUser.run('OSMANTECH Admin', process.env.ADMIN_EMAIL || 'admin@osmantech.ng', adminPass, '08132664146', 'admin').lastInsertRowid;

  const products = [
    { name: 'iPhone 15 Pro Max 256GB', brand: 'Apple',    category: 'Phones',       condition: 'new',  price: 1450000, original: 1650000, img: 'https://images.unsplash.com/photo-1696446702174-6d07a9c2c287?w=800', desc: 'Latest iPhone 15 Pro Max — Titanium, A17 Pro chip, 48MP triple-camera system. Sealed box, 1yr Apple warranty.', featured: 1 },
    { name: 'iPhone 14 Pro 128GB',     brand: 'Apple',    category: 'Phones',       condition: 'uk-used', price: 780000,  original: 950000,  img: 'https://images.unsplash.com/photo-1663761879666-c582cbdb6a96?w=800', desc: 'Clean UK-used iPhone 14 Pro. 92% battery health. No scratches. Face ID works perfectly.', featured: 1 },
    { name: 'Samsung Galaxy S24 Ultra',brand: 'Samsung',  category: 'Phones',       condition: 'new',  price: 1280000, original: 1400000, img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800', desc: 'Galaxy S24 Ultra with S-Pen, 200MP camera, Snapdragon 8 Gen 3. 12GB RAM / 256GB storage.', featured: 1 },
    { name: 'Samsung Galaxy A54',      brand: 'Samsung',  category: 'Phones',       condition: 'new',  price: 380000,  original: 420000,  img: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800', desc: 'Mid-range champion — 6.4" Super AMOLED, 50MP camera, 5000mAh battery.' },
    { name: 'Tecno Camon 20 Pro',      brand: 'Tecno',    category: 'Phones',       condition: 'new',  price: 285000,  original: 320000,  img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800', desc: 'Flagship-killer from Tecno — 64MP OIS camera, AMOLED display, 68W fast charging.' },

    { name: 'MacBook Pro M3 14"',      brand: 'Apple',    category: 'Laptops',      condition: 'new',  price: 2850000, original: 3100000, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', desc: 'MacBook Pro 14" with M3 chip, 16GB unified memory, 512GB SSD. Space Grey. Sealed.', featured: 1 },
    { name: 'MacBook Air M2 13"',      brand: 'Apple',    category: 'Laptops',      condition: 'uk-used', price: 1250000, original: 1450000, img: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800', desc: 'Slim & light MacBook Air M2. 8GB / 256GB. Excellent condition, battery cycle < 100.' },
    { name: 'HP EliteBook 840 G9',     brand: 'HP',       category: 'Laptops',      condition: 'uk-used', price: 720000,  original: 850000,  img: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555b8?w=800', desc: 'Business-class laptop. Intel i7-1265U, 16GB RAM, 512GB SSD, fingerprint reader.' },
    { name: 'Dell XPS 15',             brand: 'Dell',     category: 'Laptops',      condition: 'new',  price: 1680000, original: 1850000, img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800', desc: 'Premium creator laptop. Intel i7-13700H, 32GB RAM, 1TB SSD, RTX 4050, 3.5K OLED.', featured: 1 },

    { name: 'Apple Watch Series 9',    brand: 'Apple',    category: 'Smartwatches', condition: 'new',  price: 420000,  original: 480000,  img: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800', desc: 'Apple Watch Series 9, 45mm GPS, Midnight Aluminium case. New & sealed.' },
    { name: 'Samsung Galaxy Watch 6',  brand: 'Samsung',  category: 'Smartwatches', condition: 'new',  price: 310000,  original: 360000,  img: 'https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=800', desc: 'Galaxy Watch 6 Classic, 47mm. Rotating bezel, health tracking, 1-week battery.' },

    { name: 'AirPods Pro 2nd Gen',     brand: 'Apple',    category: 'Accessories',  condition: 'new',  price: 265000,  original: 300000,  img: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800', desc: 'Active Noise Cancellation, Adaptive Audio, USB-C charging case. Sealed.' },
    { name: 'JBL Flip 6 Speaker',      brand: 'JBL',      category: 'Accessories',  condition: 'new',  price: 85000,   original: 110000,  img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800', desc: 'Portable Bluetooth speaker. 12-hr battery, IP67 waterproof. All colours in stock.' },
    { name: 'Anker 737 Power Bank',    brand: 'Anker',    category: 'Accessories',  condition: 'new',  price: 95000,   original: 120000,  img: 'https://images.unsplash.com/photo-1609592424823-44a7dbe8ddf6?w=800', desc: '24,000mAh, 140W output. Charges MacBook Pro at full speed. Genuine Anker, 18m warranty.' },

    { name: 'PlayStation 5 Slim',      brand: 'Sony',     category: 'Games',        condition: 'new',  price: 820000,  original: 900000,  img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800', desc: 'PS5 Slim Disc Edition. Sealed box with 1 controller. Free FIFA 24 disc.', featured: 1 },
    { name: 'Xbox Series X',           brand: 'Microsoft',category: 'Games',        condition: 'uk-used', price: 650000,  original: 780000,  img: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800', desc: 'Xbox Series X 1TB. Includes controller and 3-month Game Pass Ultimate.' }
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (seller_id, name, brand, category, condition, price, original_price, description, image, stock, rating, review_count, status, featured, location, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, 'Ogbomoso', '08132664146')
  `);

  products.forEach((p, i) => {
    const rating = 4 + Math.random();
    const reviews = 5 + Math.floor(Math.random() * 50);
    insertProduct.run(adminId, p.name, p.brand, p.category, p.condition, p.price, p.original, p.desc, p.img, 3 + Math.floor(Math.random() * 10), Math.round(rating * 10) / 10, reviews, p.featured || 0);
  });

  console.log('[db] Seed complete — admin:', process.env.ADMIN_EMAIL || 'admin@osmantech.ng');
}

module.exports = { db, seedIfEmpty };
