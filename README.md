# OSMANTECH Global Communication

A full-stack Nigerian gadget marketplace — **Buy, Sell, Swap, or Fix** phones, laptops, smartwatches, and accessories. Built with **Node.js + Express + SQLite** on the backend and vanilla **HTML/CSS/JS** (no frameworks) on the frontend as a traditional multi-page application.

**Location:** Keji House, beside Alice Place, stadium Under G Road, Ogbomoso, Oyo State
**Contact:** 08132664146 · 08037775657

---

## ✨ Features

- 🛍️ **Full marketplace** — product listings with filters (category, brand, condition, price), search, and sort
- 👤 **Authentication** — email/password + Google OAuth (real integration ready)
- 💳 **Payments** — Paystack & Flutterwave (real integration ready) + Pay-on-delivery
- 📤 **Sell** — users post ads, admin approves before publishing
- 🔁 **Swap** — users request device exchanges with fair-value workflow
- 🔧 **Fix** — repair booking with status tracking and quotes
- ⭐ **Reviews + ratings** — 5-star reviews on every product
- ❤️ **Wishlist** — save products for later
- 🔔 **Notifications** — in-app notifications for every action
- 🎛️ **Admin panel** — full control over listings, orders, repairs, swaps, users, and messages
- 💬 **WhatsApp integration** — floating button, seller chat, CTAs throughout
- 🌓 **Dark mode** — persistent theme toggle
- 📱 **Fully responsive** — mobile-first design
- 🖼️ **Image uploads** — disk-based with multer (5 MB limit, image types only)
- 🔒 **JWT auth** — tokens stored in localStorage
- 🚦 **Rate limiting** — 300 requests / 15 min per IP on API
- 📝 **SEO ready** — proper meta tags, semantic HTML

---

## 🚀 Quick start

### 1. Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))

### 2. Install

```bash
cd osmantech
npm install
```

### 3. Configure (optional)

Copy `.env.example` to `.env` and fill in real API keys for Paystack, Flutterwave, and Google OAuth when you're ready to go live:

```bash
cp .env.example .env
```

The app works perfectly **without** `.env` — it uses safe defaults and a demo-payment flow for testing.

### 4. Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

On first run, the database is auto-created at `data/osmantech.db` and seeded with 16 sample products plus the admin account.

### Admin login

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| Admin | `admin@osmantech.ng`   | `admin123` |

> **⚠ Change this password immediately after your first login** (Admin → Users → Edit yourself, or via the Profile tab).

---

## 📁 Project structure

```
osmantech/
├── server.js              Express entrypoint
├── database.js            SQLite schema + seed
├── package.json
├── .env.example
├── middleware/
│   └── auth.js            JWT guards
├── routes/
│   ├── auth.js            register, login, google, me
│   ├── products.js        CRUD + filters
│   ├── orders.js          checkout + my orders
│   ├── swaps.js           swap requests
│   ├── repairs.js         repair bookings
│   ├── reviews.js         product reviews
│   ├── wishlist.js        favourites
│   ├── notifications.js   in-app notifications
│   ├── contact.js         contact form
│   ├── upload.js          image upload
│   └── admin.js           admin-only endpoints
├── public/                static frontend (multi-page)
│   ├── index.html         home
│   ├── shop.html          marketplace
│   ├── product.html       product detail
│   ├── sell.html          post-ad form
│   ├── swap.html          swap request
│   ├── fix.html           repair booking
│   ├── cart.html          shopping cart
│   ├── checkout.html      checkout + payment
│   ├── login.html · register.html
│   ├── dashboard.html     user account
│   ├── admin.html         admin panel
│   ├── contact.html
│   ├── wishlist.html · notifications.html · 404.html
│   ├── css/styles.css     design system
│   ├── js/
│   │   ├── api.js         backend client
│   │   ├── main.js        shared nav/footer/toast/theme
│   │   └── (one per page)
│   └── uploads/           user-uploaded images
└── data/
    └── osmantech.db       SQLite (auto-created)
```

---

## 🔌 API endpoints

All endpoints return JSON. Protected endpoints require `Authorization: Bearer <jwt>` header.

### Auth
- `POST /api/auth/register` — `{ name, email, password, phone? }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/google` — `{ email, name, sub, picture? }`
- `GET /api/auth/me` 🔒
- `PUT /api/auth/me` 🔒 — update profile
- `POST /api/auth/password` 🔒 — `{ current, next }`

### Products
- `GET /api/products?category=&brand=&condition=&q=&minPrice=&maxPrice=&sort=&featured=`
- `GET /api/products/meta` — filter options
- `GET /api/products/:id` — detail + reviews
- `POST /api/products` 🔒 — create (user listings go to pending)
- `GET /api/products/mine/list` 🔒
- `PUT /api/products/:id` 🔒 — update own/admin
- `DELETE /api/products/:id` 🔒

### Orders
- `POST /api/orders` 🔒 — `{ items, shipping, paymentMethod, paymentReference?, paymentStatus? }`
- `GET /api/orders/my` 🔒
- `GET /api/orders/:id` 🔒

### Swaps · Repairs · Reviews · Wishlist · Notifications · Contact
- `POST /api/swaps` 🔒 · `GET /api/swaps/my` 🔒
- `POST /api/repairs` 🔒 · `GET /api/repairs/my` 🔒
- `POST /api/reviews` 🔒 · `GET /api/reviews/product/:id`
- `POST /api/wishlist/toggle` 🔒 · `GET /api/wishlist` 🔒 · `GET /api/wishlist/ids` 🔒
- `GET /api/notifications` 🔒 · `POST /api/notifications/:id/read` 🔒 · `POST /api/notifications/read-all` 🔒
- `POST /api/contact` — public form

### Upload
- `POST /api/upload` 🔒 — `multipart/form-data` with `file` field → `{ url }`

### Admin 🔒🛡️ (requires `role = admin`)
- `GET /api/admin/stats`
- `GET/POST/PUT/DELETE /api/admin/users /products /orders /repairs /swaps /messages`

### Public config
- `GET /api/config` → `{ paystackPublicKey, flutterwavePublicKey, googleClientId, whatsappNumber, phoneNumbers, address }`

---

## 💳 Going live with real payments

The checkout page already has real Paystack and Flutterwave integrations wired in — they auto-activate when you add keys to `.env`:

### Paystack
1. Sign up at [dashboard.paystack.com](https://dashboard.paystack.com)
2. Copy your **Public Key** → `PAYSTACK_PUBLIC_KEY=pk_live_xxx` in `.env`
3. Restart the server

### Flutterwave
1. Sign up at [dashboard.flutterwave.com](https://dashboard.flutterwave.com)
2. Copy your **Public Key** → `FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxx` in `.env`
3. Restart

### Google Sign-In
1. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
2. Add your domain to authorised origins (e.g. `http://localhost:3000`, `https://yourdomain.com`)
3. Copy **Client ID** → `GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com` in `.env`

**🛡️ Recommended for production:** verify Google ID tokens server-side using `google-auth-library` instead of trusting the decoded JWT.

**🛡️ Paystack webhook:** for real production use, add a webhook endpoint at `POST /api/webhook/paystack` that verifies the `x-paystack-signature` header and confirms payments server-side before marking orders as paid.

---

## 🚢 Deployment

### Render.com (free tier friendly)
1. Push this folder to a GitHub repo
2. [Create a new Web Service](https://render.com) pointing at that repo
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add environment variables from `.env`
6. Add a **Persistent Disk** mounted at `/opt/render/project/src/data` (for SQLite) and `/opt/render/project/src/public/uploads` (for images)

### Railway / Fly.io
Same setup as Render — this is a standard Node.js app.

### VPS (DigitalOcean, Hetzner, etc.)
```bash
git clone your-repo.git
cd osmantech
npm install --production
cp .env.example .env  # edit as needed
npm install -g pm2
pm2 start server.js --name osmantech
pm2 save
```

Then put Nginx in front for HTTPS (Let's Encrypt recommended).

---

## 🧩 Extending

**Add a new product category** — no code change needed, just post from `/sell` with a new category name. Or hardcode the list in `sell.html` select options.

**Add more admin charts** — the `/api/admin/stats` endpoint already returns 7-day daily orders/revenue; wire up Chart.js in `admin.js` to render them.

**Switch to MongoDB / PostgreSQL** — replace `database.js` and the `db.prepare(...).run/.get/.all` calls across routes. Routes are fully parameterised, so migration is mechanical.

**Add email notifications** — drop in `nodemailer` and call from route files where `notifications` rows are created.

**Image CDN** — replace the local `uploads/` with Cloudinary / S3 by changing `routes/upload.js` — the frontend just expects a URL back.

---

## 🛡️ Security checklist for production

- [ ] Change `JWT_SECRET` to a long random value
- [ ] Change seeded admin password
- [ ] Put behind HTTPS (Let's Encrypt / Cloudflare)
- [ ] Enable Paystack/Flutterwave **webhooks** and verify signatures
- [ ] Consider moving uploads to CDN (S3 / Cloudinary)
- [ ] Review CORS origins (currently `*`)
- [ ] Add CSRF protection if you switch to cookie-based auth
- [ ] Back up `data/osmantech.db` and `public/uploads/` regularly

---

## 📞 Support

Call **08132664146** · **08037775657**
WhatsApp **+234 813 266 4146**
Visit us in Ogbomoso — Keji House, beside Alice Place, stadium Under G Road.

Built with ♥ in Nigeria.
