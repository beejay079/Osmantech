// public/js/main.js — shared UI: nav, footer, theme, toast, cart, mobile menu

(function () {

  // ─── THEME ────────────────────────────────────────────────
  const savedTheme = localStorage.getItem('os-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  window.OS.toggleTheme = function () {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('os-theme', next);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerHTML = next === 'dark' ? sunSvg() : moonSvg();
  };

  // ─── TOAST ────────────────────────────────────────────────
  function ensureToastRoot () {
    let root = document.getElementById('toast-root');
    if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
    return root;
  }
  window.OS.toast = function (message, type = 'info', title = '') {
    const root = ensureToastRoot();
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `
      <div class="toast-body">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
        <div>${escapeHtml(message)}</div>
      </div>
      <button aria-label="close" style="color: var(--muted)">✕</button>
    `;
    root.appendChild(el);
    const close = () => { el.style.animation = 'slideIn .2s reverse'; setTimeout(() => el.remove(), 180); };
    el.querySelector('button').onclick = close;
    setTimeout(close, 4500);
  };

  // ─── CART (local) ─────────────────────────────────────────
  window.OS.cart = {
    get () { try { return JSON.parse(localStorage.getItem('os-cart') || '[]'); } catch { return []; } },
    set (items) { localStorage.setItem('os-cart', JSON.stringify(items)); updateCartBadge(); },
    count () { return this.get().reduce((s, i) => s + (i.quantity || 1), 0); },
    subtotal () { return this.get().reduce((s, i) => s + i.price * (i.quantity || 1), 0); },
    add (product, qty = 1) {
      const items = this.get();
      const existing = items.find(i => i.id === product.id);
      if (existing) existing.quantity += qty;
      else items.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: qty });
      this.set(items);
      OS.toast(`${product.name} added to cart`, 'success', 'Added to cart');
    },
    update (id, qty) {
      const items = this.get().map(i => i.id === id ? { ...i, quantity: Math.max(1, qty) } : i);
      this.set(items);
    },
    remove (id) { this.set(this.get().filter(i => i.id !== id)); },
    clear () { this.set([]); }
  };

  function updateCartBadge () {
    const n = window.OS.cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      if (n > 0) { el.textContent = n; el.style.display = 'inline-block'; }
      else el.style.display = 'none';
    });
  }

  // ─── HTML HELPERS ─────────────────────────────────────────
  function escapeHtml (s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  window.OS.escape = escapeHtml;

  window.OS.stars = function (rating, showNumber = false) {
    const r = Number(rating) || 0;
    const full = Math.floor(r);
    const half = r - full >= 0.5;
    let html = '<span class="stars">';
    for (let i = 0; i < 5; i++) {
      if (i < full) html += '★';
      else if (i === full && half) html += '★';
      else html += '<span class="empty">★</span>';
    }
    html += '</span>';
    if (showNumber) html += ` <span class="small muted">${r.toFixed(1)}</span>`;
    return html;
  };

  // ─── NAV + FOOTER INJECTION ──────────────────────────────
  const path = location.pathname.replace(/\/$/, '') || '/';
  const page = path === '/' ? 'home' : path.replace(/^\//, '').replace('.html', '');

  function navLink (href, label, key) {
    const active = (key === page || (key === 'home' && page === 'index')) ? ' active' : '';
    return `<a href="${href}" class="${active}">${label}</a>`;
  }

  function renderNav () {
    const user = OS.user();
    const node = document.getElementById('nav-slot');
    if (!node) return;
    // Mark body so CSS can show hamburger menu only when admin is logged in
    document.body.classList.toggle('admin-mode', !!(user && user.role === 'admin'));
    node.outerHTML = `
      <div class="topbar">
        📞 ${OS.escape('08132664146 · 08037775657')} · 📍 Ogbomoso, Oyo State ·
        <a href="/contact">Need help?</a>
      </div>
      <nav class="nav">
        <div class="container nav-inner">
          <a href="/" class="logo">
            <div class="logo-mark">O</div>
            <div class="logo-text">OSMANTECH<small>Global Communication</small></div>
          </a>
          <div class="nav-menu" id="nav-menu">
            ${navLink('/', 'Home', 'home')}
            ${navLink('/shop', 'Shop', 'shop')}
            ${navLink('/sell', 'Sell', 'sell')}
            ${navLink('/swap', 'Swap', 'swap')}
            ${navLink('/fix', 'Fix', 'fix')}
            ${navLink('/contact', 'Contact', 'contact')}
            ${ user && user.role === 'admin' ? `
              <div class="nav-divider"></div>
              <a href="/admin" class="nav-link nav-link-admin">⚙ Admin Panel</a>
              <button class="nav-link nav-link-logout" onclick="OS.logout()">↩ Logout</button>
            ` : '' }
          </div>
          <div class="nav-actions">
            <button class="icon-btn" onclick="OS.toggleTheme()" aria-label="Toggle theme">
              <span id="theme-icon">${savedTheme === 'dark' ? sunSvg() : moonSvg()}</span>
            </button>
            <a href="/cart" class="icon-btn" aria-label="Cart" title="Cart">
              ${cartSvg()}<span class="badge" data-cart-count style="display:none">0</span>
            </a>
            <a href="https://wa.me/2348132664146" target="_blank" class="btn btn-success btn-sm" style="display:inline-flex;align-items:center;gap:.4rem;">
              ${whatsappSvg()} <span style="font-size:.85rem;">Chat</span>
            </a>
            ${ user && user.role === 'admin' ? '' : `
              <a href="/login" class="btn btn-outline btn-sm">Log in</a>
            ` }
            <button class="hamburger icon-btn" onclick="document.getElementById('nav-menu').classList.toggle('open')" aria-label="Menu">
              ${menuSvg()}
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  function renderFooter () {
    const node = document.getElementById('footer-slot');
    if (!node) return;
    node.outerHTML = `
      <footer>
        <div class="container">
          <div class="footer-grid">
            <div>
              <div class="logo" style="margin-bottom:1rem;">
                <div class="logo-mark">O</div>
                <div class="logo-text" style="color:white">OSMANTECH<small style="color:rgba(255,255,255,.5)">Global Communication</small></div>
              </div>
              <p style="color:rgba(255,255,255,.7); font-size:.92rem; max-width: 26rem;">
                Your trusted Nigerian tech marketplace for phones, laptops, smartwatches and gadgets. Buy, sell, swap or fix — all in one place.
              </p>
              <div class="flex gap-3 mt-4">
                <a href="https://wa.me/2348132664146" target="_blank" class="icon-btn" style="background:rgba(255,255,255,.08)" title="WhatsApp Chat">${whatsappSvg()}</a>
                <a href="https://chat.whatsapp.com/Cvt3GEt7QJY7n33VH6cBgC?mode=gi_t" target="_blank" class="icon-btn" style="background:rgba(255,255,255,.08)" title="WhatsApp Group">${whatsappGroupSvg()}</a>
                <a href="https://www.tiktok.com/@osmantech_global?_r=1&_t=ZS-95pEmsHSUwX" target="_blank" class="icon-btn" style="background:rgba(255,255,255,.08)" title="TikTok">${tiktokSvg()}</a>
                <a href="https://www.facebook.com/share/1GSHrrmWTG/?mibextid=wwXIfr" target="_blank" class="icon-btn" style="background:rgba(255,255,255,.08)" title="Facebook">${facebookSvg()}</a>
                <a href="#" class="icon-btn" style="background:rgba(255,255,255,.08)" title="Instagram">${instagramSvg()}</a>
              </div>
            </div>
            <div>
              <h4>Shop</h4>
              <a href="/shop?category=Phones">Phones</a>
              <a href="/shop?category=Laptops">Laptops</a>
              <a href="/shop?category=Smartwatches">Smartwatches</a>
              <a href="/shop?category=Accessories">Accessories</a>
              <a href="/shop?category=Games">Games</a>
            </div>
            <div>
              <h4>Services</h4>
              <a href="/sell">Sell your gadget</a>
              <a href="/swap">Swap device</a>
              <a href="/fix">Repair booking</a>
              <a href="/dashboard">My account</a>
              <a href="/contact">Support</a>
            </div>
            <div>
              <h4>Contact</h4>
              <p style="color:rgba(255,255,255,.7); font-size:.9rem; margin-bottom:.5rem;">
                Keji House, beside Alice Place,<br>stadium Under G Road,<br>Ogbomoso, Oyo State
              </p>
              <a href="tel:08132664146">📞 08132664146</a>
              <a href="tel:08037775657">📞 08037775657</a>
              <a href="https://wa.me/2348132664146" target="_blank">💬 WhatsApp Chat</a>
              <a href="https://chat.whatsapp.com/Cvt3GEt7QJY7n33VH6cBgC?mode=gi_t" target="_blank">👥 WhatsApp Group</a>
              <a href="https://www.tiktok.com/@osmantech_global?_r=1&_t=ZS-95pEmsHSUwX" target="_blank">🎵 TikTok</a>
              <a href="https://www.facebook.com/share/1GSHrrmWTG/?mibextid=wwXIfr" target="_blank">📘 Facebook</a>
            </div>
          </div>
          <div class="footer-bottom">
            <div>© ${new Date().getFullYear()} OSMANTECH Global Communication. All rights reserved.</div>
            <div style="display:flex;gap:1.5rem;">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Returns</a>
            </div>
          </div>
        </div>
      </footer>
      <a href="https://wa.me/2348132664146?text=Hi%20OSMANTECH%2C%20I%27d%20like%20to%20chat%20about..." target="_blank" class="whatsapp-float" aria-label="Chat on WhatsApp">${whatsappSvg()}</a>
    `;
  }

  // ─── LOGOUT ───────────────────────────────────────────────
  window.OS.logout = function () {
    OS.setToken(null); OS.setUser(null);
    OS.toast('You have been logged out', 'info');
    setTimeout(() => location.href = '/', 600);
  };

  // ─── NOTIFICATION BADGE ──────────────────────────────────
  async function refreshNotifBadge () {
    if (!OS.user()) return;
    try {
      const { unread } = await OS.notifications.list();
      const el = document.getElementById('notif-badge');
      if (el) {
        if (unread > 0) { el.textContent = unread > 9 ? '9+' : unread; el.style.display = 'inline-block'; }
        else el.style.display = 'none';
      }
    } catch {}
  }

  // ─── SVG ICONS ────────────────────────────────────────────
  function moonSvg () { return `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`; }
  function sunSvg ()  { return `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`; }
  function cartSvg () { return `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`; }
  function heartSvg () { return `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`; }
  function bellSvg ()  { return `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`; }
  function menuSvg ()  { return `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`; }
  function whatsappSvg () { return `<svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`; }
  function instagramSvg() { return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01"/></svg>`; }
  function twitterSvg ()  { return `<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`; }
  function tiktokSvg ()   { return `<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V8.46a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.39z"/></svg>`; }
  function facebookSvg () { return `<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z"/></svg>`; }
  function whatsappGroupSvg () { return `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`; }

  window.OS.svg = { cart: cartSvg, heart: heartSvg, whatsapp: whatsappSvg, menu: menuSvg };

  // ─── MODAL ───────────────────────────────────────────────
  window.OS.modal = function ({ title, body, footer, size, onClose } = {}) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const modal = document.createElement('div');
    modal.className = 'modal';
    if (size === 'lg') modal.style.maxWidth = '44rem';
    if (size === 'xl') modal.style.maxWidth = '56rem';
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;gap:1rem;">
        <h3 style="margin:0;font-size:1.25rem;">${escapeHtml(title || '')}</h3>
        <button class="icon-btn" data-modal-close aria-label="Close">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div data-modal-body></div>
      ${footer ? `<div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1.5rem;flex-wrap:wrap;">${footer}</div>` : ''}
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const bodyEl = modal.querySelector('[data-modal-body]');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof Node) bodyEl.appendChild(body);

    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      backdrop.remove();
      document.body.style.overflow = '';
      if (onClose) onClose();
    };
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    modal.querySelector('[data-modal-close]').addEventListener('click', close);
    document.addEventListener('keydown', function esc (e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });

    return { element: modal, body: bodyEl, close };
  };

  // ─── IMAGE UPLOADER ───────────────────────────────────────
  // Renders a multi-image picker into `host` element.
  //   options.uploadFn  → async (FileList) => ({ urls: [...] })
  //   options.max       → max images allowed (default 5)
  //   options.initial   → array of pre-existing URLs
  //   options.onChange  → optional (urls) => void
  // Returns { getUrls(), setUrls(arr), destroy() }
  window.OS.imageUploader = function (host, options = {}) {
    const max = options.max || 5;
    const uploadFn = options.uploadFn || OS.uploadMultiplePublic;
    let urls = Array.isArray(options.initial) ? options.initial.filter(Boolean).slice(0, max) : [];

    host.innerHTML = `
      <div class="img-uploader">
        <div class="img-thumbs"></div>
        <label class="img-add" tabindex="0">
          <input type="file" accept="image/*" multiple hidden>
          <div style="font-size:1.5rem;line-height:1;">＋</div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:.25rem;">Add image<br>(<span class="img-count">${urls.length}</span>/${max})</div>
        </label>
        <div class="img-status" style="font-size:.8rem;color:var(--muted);margin-top:.5rem;flex-basis:100%;"></div>
      </div>
    `;

    const thumbs = host.querySelector('.img-thumbs');
    const input  = host.querySelector('input[type=file]');
    const status = host.querySelector('.img-status');
    const addBtn = host.querySelector('.img-add');
    const counter= host.querySelector('.img-count');

    function render () {
      counter.textContent = urls.length;
      thumbs.innerHTML = urls.map((u, i) => `
        <div class="img-thumb" data-url="${escapeHtml(u)}">
          <img src="${escapeHtml(u)}" alt="" onerror="this.style.opacity=.3">
          ${i === 0 ? '<div class="img-cover-tag">Cover</div>' : ''}
          <button type="button" class="img-del" data-i="${i}" aria-label="Remove">×</button>
        </div>
      `).join('');
      addBtn.style.display = urls.length >= max ? 'none' : '';
      if (options.onChange) options.onChange(urls.slice());
    }

    thumbs.addEventListener('click', (e) => {
      if (e.target.matches('.img-del')) {
        const i = Number(e.target.dataset.i);
        urls.splice(i, 1);
        render();
      } else if (e.target.tagName === 'IMG') {
        // Click image to make it the cover (move to position 0)
        const url = e.target.parentElement.dataset.url;
        const idx = urls.indexOf(url);
        if (idx > 0) { urls.splice(idx, 1); urls.unshift(url); render(); OS.toast('Set as cover image', 'info'); }
      }
    });

    input.addEventListener('change', async () => {
      const files = Array.from(input.files);
      input.value = '';
      if (!files.length) return;
      const slotsLeft = max - urls.length;
      if (files.length > slotsLeft) {
        OS.toast(`Only ${slotsLeft} more image${slotsLeft === 1 ? '' : 's'} allowed`, 'error');
        return;
      }
      // Validate file types and sizes client-side
      for (const f of files) {
        if (!/^image\//.test(f.type)) return OS.toast(`${f.name} is not an image`, 'error');
        if (f.size > 5 * 1024 * 1024) return OS.toast(`${f.name} is bigger than 5 MB`, 'error');
      }
      status.textContent = `Uploading ${files.length} image${files.length === 1 ? '' : 's'}…`;
      try {
        const { urls: newUrls } = await uploadFn(files);
        urls = urls.concat(newUrls).slice(0, max);
        status.textContent = `${newUrls.length} uploaded.`;
        render();
        setTimeout(() => { status.textContent = ''; }, 2000);
      } catch (err) {
        status.textContent = '';
        OS.toast(err.message, 'error');
      }
    });

    render();

    return {
      getUrls: () => urls.slice(),
      setUrls: (arr) => { urls = (arr || []).filter(Boolean).slice(0, max); render(); },
      destroy: () => { host.innerHTML = ''; }
    };
  };

  // ─── ANALYTICS ────────────────────────────────────────────
  function trackVisit () {
    // Skip admin pages from public stats
    if (location.pathname.startsWith('/admin')) return;
    let visitorId = localStorage.getItem('os-visitor');
    if (!visitorId) {
      visitorId = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('os-visitor', visitorId);
    }
    fetch('/api/visits/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: location.pathname,
        visitorId,
        referer: document.referrer || null
      })
    }).catch(() => {}); // silent failure
  }

  // ─── BOOT ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    renderNav();
    renderFooter();
    updateCartBadge();
    refreshNotifBadge();
    trackVisit();

    // Close nav menu when clicking outside it
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('nav-menu');
      if (!menu || !menu.classList.contains('open')) return;
      if (e.target.closest('#nav-menu') || e.target.closest('.hamburger')) return;
      menu.classList.remove('open');
    });
  });

})();
