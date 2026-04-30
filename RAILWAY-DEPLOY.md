# Deploying OSMANTECH to Railway

This guide walks you through getting your OSMANTECH app live on the internet at a Railway-provided URL (something like `osmantech-production.up.railway.app`).

## What you'll need

- A free **Railway** account → [railway.com](https://railway.com)
- A free **GitHub** account → [github.com](https://github.com)
- About 15 minutes

> ⚠ **Critical**: Railway's free tier offers $5 of usage credit per month. After that, you'll need to add a payment method or upgrade to the **Hobby plan** ($5/month flat). Railway's own docs note that *"Volumes are required for SQLite apps — without one, your data is wiped on every redeploy."*

---

## Part 1 — Push your code to GitHub

1. **Create a GitHub repository:**
   - Go to [github.com/new](https://github.com/new)
   - Name: `osmantech` (or whatever you like)
   - Set it to **Private** (recommended — keeps your code from being copied)
   - **Don't** tick "Add a README" — your project already has one
   - Click **Create repository**

2. **Open PowerShell/Terminal in your `osmantech` folder** and run these commands one at a time:

   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/osmantech.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your actual GitHub username. When git asks for credentials, use your GitHub email and a [Personal Access Token](https://github.com/settings/tokens) (not your password).

   If you've never installed git: download from [git-scm.com](https://git-scm.com/download/win) first, then restart PowerShell.

3. **Verify** by visiting `https://github.com/YOUR_USERNAME/osmantech` — you should see all your files.

---

## Part 2 — Deploy to Railway

1. **Sign in to Railway** at [railway.com](https://railway.com) — use your GitHub account for the smoothest experience.

2. **New Project**:
   - Click **+ New Project** (top right)
   - Choose **Deploy from GitHub repo**
   - Authorize Railway to read your GitHub repos if it asks
   - Pick your `osmantech` repository
   - Railway auto-detects Node.js and starts building

3. **Wait for the first build to finish** (~1–2 minutes). It will likely succeed but show "Application failed to respond" on the URL — that's expected, we still need to set up the volume.

---

## Part 3 — Add a persistent volume (essential!)

Without this step, every redeploy wipes your database and uploaded photos.

1. In your Railway project canvas, **right-click your service** (the box with your repo name) → **New** → **Volume**
   - Or press **⌘ K** (Cmd+K on Mac, Ctrl+K on Windows) and type "volume"
2. Set the **Mount Path**: `/data`
3. Click **Add**
4. The service will automatically restart with the volume attached

---

## Part 4 — Set environment variables

Click your service → **Variables** tab → click **+ New Variable** for each:

| Name              | Value                         | Notes                          |
|-------------------|-------------------------------|--------------------------------|
| `DATA_DIR`        | `/data`                       | Where the SQLite DB lives      |
| `UPLOADS_DIR`     | `/data/uploads`               | Where uploaded images live     |
| `JWT_SECRET`      | (paste 64+ random characters) | Critical — see below           |
| `ADMIN_EMAIL`     | `admin@osmantech.ng`          | Or your real email             |
| `ADMIN_PASSWORD`  | (a strong password)           | **Change this from default!**  |
| `NODE_ENV`        | `production`                  | Tells Express to be strict     |

**To generate a secure `JWT_SECRET`**, paste this into PowerShell:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Copy the output and paste it as the value.

After saving, Railway will redeploy automatically. Wait ~30 seconds.

---

## Part 5 — Get your public URL

1. Click your service → **Settings** tab → **Networking** section
2. Click **Generate Domain**
3. Railway gives you a URL like `osmantech-production-abcd.up.railway.app`
4. Open it in your browser — your site is live! 🎉

### (Optional) Use your own domain

If you own `osmantech.ng` or similar:

1. In Railway → Settings → Networking → **Custom Domain** → enter `osmantech.ng`
2. Railway shows you a CNAME record to add at your domain registrar (Whogohost, NameCheap, GoDaddy, etc.)
3. Add the CNAME, wait 5–60 minutes, and Railway issues a free HTTPS certificate

---

## Part 6 — Log in as admin

1. Visit your live URL
2. Click **Log in** (top right)
3. Use the email and password you set in `ADMIN_EMAIL` / `ADMIN_PASSWORD`
4. You should see the **Admin** button appear in the nav — click it to manage products, view visitors, etc.

---

## Updating your site later

Whenever you make changes locally:

```powershell
git add .
git commit -m "Describe what you changed"
git push
```

Railway detects the push and auto-redeploys in ~1 minute. Your database, uploads, and visitor stats survive because they're on the volume.

---

## Troubleshooting

**"Application failed to respond"** after deploy
→ Check the **Deployments** tab → click the latest deployment → **View Logs**. Look for red errors. Most common: missing `JWT_SECRET` env var.

**Database resets every deploy**
→ You forgot the volume. Go back to Part 3.

**Uploaded photos disappear**
→ Same issue: `UPLOADS_DIR` env var must point to a path inside the mounted volume (`/data/uploads`).

**Login says "Invalid email or password"**
→ The first time the app boots on a fresh volume, it seeds an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. If those variables weren't set when the volume was empty, it used the defaults (`admin@osmantech.ng` / `admin123`). Try those, or [open a Railway shell](https://docs.railway.com/guides/cli) and delete `/data/osmantech.db` to re-seed.

**Build fails on `better-sqlite3`**
→ Railway uses Nixpacks which compiles native modules automatically. If the build fails, check that your `package.json` has `"engines": { "node": ">=18.0.0" }` — already set.

**Can I run multiple instances (replicas)?**
→ Not with SQLite + a volume. Railway docs explicitly note that *"replicas cannot be used with volumes."* Stick to one instance — it can easily handle thousands of visitors per day. If you outgrow it, migrate to PostgreSQL.

---

## What you get on Railway free / hobby plans

- $5/month free credit (Hobby plan); enough for a small marketplace
- Auto HTTPS for any URL or custom domain
- Auto redeploy on `git push`
- 5 GB persistent volume for your data
- Logs streaming live in the dashboard
- Nightly automated backups of your volume (paid plans)

---

## Daily backup strategy (recommended)

Even with Railway's automated backups, it's wise to have your own copy of `osmantech.db`:

1. Install [Railway CLI](https://docs.railway.com/develop/cli) on your computer
2. Once a week, run:
   ```powershell
   railway login
   railway link    # picks your osmantech project
   railway run cp /data/osmantech.db /tmp/backup.db
   railway run cat /tmp/backup.db > osmantech-backup-$(Get-Date -Format yyyyMMdd).db
   ```

Or just create a manual backup in Railway's volume settings → "Create backup" before any major change.

---

Need help? Railway has excellent docs at [docs.railway.com](https://docs.railway.com) and a Discord community for live support.
