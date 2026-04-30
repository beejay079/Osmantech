// public/js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  if (!OS.user()) {
    OS.toast('Please log in', 'error');
    setTimeout(() => location.href = '/login?next=/dashboard', 900);
    return;
  }

  const u = OS.user();
  document.getElementById('greeting').textContent = `Welcome back, ${u.name.split(' ')[0]}!`;
  if (u.role === 'admin') document.getElementById('admin-link').style.display = 'inline-flex';

  // Tab switching
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('tab-' + t.dataset.tab).classList.remove('hidden');
    load(t.dataset.tab);
  }));

  // Initial tab from URL
  const initial = new URL(location.href).searchParams.get('tab') || 'orders';
  document.querySelector(`[data-tab="${initial}"]`)?.click();

  loadCounts();
});

async function loadCounts () {
  try {
    const [o, p, s, r] = await Promise.all([
      OS.orders.my().catch(() => ({ orders: [] })),
      OS.products.mine().catch(() => ({ products: [] })),
      OS.swaps.my().catch(() => ({ swaps: [] })),
      OS.repairs.my().catch(() => ({ repairs: [] }))
    ]);
    document.getElementById('count-orders').textContent   = o.orders.length;
    document.getElementById('count-listings').textContent = p.products.length;
    document.getElementById('count-swaps').textContent    = s.swaps.length;
    document.getElementById('count-repairs').textContent  = r.repairs.length;
  } catch {}
}

const loaded = {};
async function load (tab) {
  if (loaded[tab]) return;
  loaded[tab] = true;
  const el = document.getElementById('tab-' + tab);
  el.innerHTML = '<div class="loading"></div>';

  try {
    if (tab === 'orders')   return renderOrders(el);
    if (tab === 'listings') return renderListings(el);
    if (tab === 'swaps')    return renderSwaps(el);
    if (tab === 'repairs')  return renderRepairs(el);
    if (tab === 'profile')  return renderProfile(el);
  } catch (e) {
    el.innerHTML = `<p class="muted">Couldn't load: ${OS.escape(e.message)}</p>`;
  }
}

async function renderOrders (el) {
  const { orders } = await OS.orders.my();
  if (!orders.length) return el.innerHTML = emptyHtml('📦', 'No orders yet', 'Your orders will appear here.', '/shop', 'Shop now');
  el.innerHTML = orders.map(o => `
    <div class="card card-body mb-4">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.75rem;align-items:center;">
        <div>
          <strong>Order #${o.id}</strong>
          <div class="muted small">${OS.dateTime(o.created_at)} · ${o.payment_method}</div>
        </div>
        <div style="text-align:right;">
          <div class="badge-pill ${statusBadge(o.status)}">${o.status}</div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:1.2rem;color:var(--orange);margin-top:.25rem;">${OS.naira(o.total)}</div>
        </div>
      </div>
      <div class="divider" style="margin:1rem 0;"></div>
      ${o.items.map(i => `
        <div style="display:flex;gap:.75rem;padding:.5rem 0;">
          <img src="${OS.escape(i.image)}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;">
          <div style="flex:1;font-size:.9rem;"><strong>${OS.escape(i.name)}</strong><div class="muted small">${i.quantity} × ${OS.naira(i.price)}</div></div>
        </div>
      `).join('')}
      <div class="muted small" style="margin-top:.5rem;">📦 Delivery to: ${OS.escape(o.shipping_address)}, ${OS.escape(o.shipping_city)}</div>
    </div>
  `).join('');
}

async function renderListings (el) {
  const { products } = await OS.products.mine();
  if (!products.length) return el.innerHTML = emptyHtml('🏷️', 'No listings yet', 'Sell your first gadget!', '/sell', 'Post a listing');
  el.innerHTML = `
    <div style="margin-bottom:1rem;"><a href="/sell" class="btn btn-primary">+ New listing</a></div>
    <div class="grid grid-3">
      ${products.map(p => `
        <div class="card">
          <div class="product-img" style="aspect-ratio:4/3;">
            <img src="${OS.escape(p.image)}" alt="${OS.escape(p.name)}" style="width:100%;height:100%;object-fit:cover;">
          </div>
          <div class="card-body">
            <div class="product-brand">${OS.escape(p.brand || p.category)}</div>
            <div class="product-name" style="min-height:auto;">${OS.escape(p.name)}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.5rem;">
              <span style="font-weight:700;color:var(--orange);">${OS.naira(p.price)}</span>
              <span class="badge-pill ${statusBadge(p.status)}">${p.status}</span>
            </div>
            <div style="display:flex;gap:.5rem;margin-top:.75rem;">
              <a href="/product?id=${p.id}" class="btn btn-outline btn-sm" style="flex:1;">View</a>
              <button class="btn btn-ghost btn-sm" onclick="deleteListing(${p.id})" style="color:var(--danger);">Delete</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderSwaps (el) {
  const { swaps } = await OS.swaps.my();
  if (!swaps.length) return el.innerHTML = emptyHtml('🔁', 'No swap requests', 'Trade up to your dream device.', '/swap', 'Request a swap');
  el.innerHTML = swaps.map(s => `
    <div class="card card-body mb-4">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem;">
        <strong>${OS.escape(s.have_item)} ↔ ${OS.escape(s.want_item)}</strong>
        <span class="badge-pill ${statusBadge(s.status)}">${s.status}</span>
      </div>
      <div class="muted small">Submitted ${OS.dateTime(s.created_at)}</div>
      ${s.notes ? `<p style="margin-top:.5rem;">${OS.escape(s.notes)}</p>` : ''}
      ${s.admin_response ? `<div style="margin-top:.5rem;padding:.75rem;background:var(--surface-2);border-radius:var(--radius-sm);"><strong>Response:</strong> ${OS.escape(s.admin_response)}</div>` : ''}
    </div>
  `).join('');
}

async function renderRepairs (el) {
  const { repairs } = await OS.repairs.my();
  if (!repairs.length) return el.innerHTML = emptyHtml('🔧', 'No repair bookings', 'Book a repair for your gadget.', '/fix', 'Book a repair');
  el.innerHTML = repairs.map(r => `
    <div class="card card-body mb-4">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem;">
        <strong>${OS.escape(r.device_type)}${r.device_model ? ' — ' + OS.escape(r.device_model) : ''}</strong>
        <span class="badge-pill ${statusBadge(r.status)}">${r.status}</span>
      </div>
      <p class="muted small">${OS.escape(r.issue)}</p>
      ${r.quote ? `<div style="margin-top:.5rem;"><strong>Quote:</strong> ${OS.naira(r.quote)}</div>` : ''}
      ${r.admin_notes ? `<div style="margin-top:.5rem;padding:.75rem;background:var(--surface-2);border-radius:var(--radius-sm);"><strong>Notes:</strong> ${OS.escape(r.admin_notes)}</div>` : ''}
      <div class="muted small" style="margin-top:.5rem;">Booked ${OS.dateTime(r.created_at)}</div>
    </div>
  `).join('');
}

function renderProfile (el) {
  const u = OS.user();
  el.innerHTML = `
    <div class="card card-body" style="max-width:540px;">
      <h3 style="margin-bottom:1rem;">Profile</h3>
      <div class="field"><label>Name</label><input class="input" id="p-name" value="${OS.escape(u.name)}"></div>
      <div class="field"><label>Email</label><input class="input" value="${OS.escape(u.email)}" disabled></div>
      <div class="field"><label>Phone</label><input class="input" id="p-phone" value="${OS.escape(u.phone || '')}"></div>
      <button class="btn btn-primary" onclick="saveProfile()">Save changes</button>

      <div class="divider"></div>
      <h3 style="margin-bottom:1rem;">Change password</h3>
      <div class="field"><label>Current password</label><input type="password" class="input" id="p-current"></div>
      <div class="field"><label>New password</label><input type="password" class="input" id="p-new"></div>
      <button class="btn btn-dark" onclick="changePassword()">Update password</button>
    </div>
  `;
}

window.saveProfile = async function () {
  try {
    const { user } = await OS.auth.update({
      name: document.getElementById('p-name').value.trim(),
      phone: document.getElementById('p-phone').value.trim()
    });
    OS.setUser(user);
    OS.toast('Profile updated', 'success');
  } catch (e) { OS.toast(e.message, 'error'); }
};

window.changePassword = async function () {
  const current = document.getElementById('p-current').value;
  const nextPw  = document.getElementById('p-new').value;
  if (!current || !nextPw) return OS.toast('Enter both passwords', 'error');
  try {
    await OS.api('/api/auth/password', { method: 'POST', body: { current, next: nextPw } });
    OS.toast('Password changed', 'success');
    document.getElementById('p-current').value = '';
    document.getElementById('p-new').value = '';
  } catch (e) { OS.toast(e.message, 'error'); }
};

window.deleteListing = async function (id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  try {
    await OS.products.remove(id);
    OS.toast('Listing deleted', 'info');
    loaded.listings = false;
    load('listings');
    loadCounts();
  } catch (e) { OS.toast(e.message, 'error'); }
};

function emptyHtml (icon, title, msg, href, btn) {
  return `<div class="empty"><div class="ico">${icon}</div><h3>${title}</h3><p>${msg}</p><a href="${href}" class="btn btn-primary mt-4">${btn}</a></div>`;
}
function statusBadge (s) {
  return ({
    processing:'badge-info','awaiting-payment':'badge-warning',shipped:'badge-info',delivered:'badge-success',cancelled:'badge-danger',
    pending:'badge-warning',approved:'badge-success',rejected:'badge-danger',completed:'badge-success',
    received:'badge-info',diagnosing:'badge-warning',quoted:'badge-warning','in-progress':'badge-warning',ready:'badge-success',paid:'badge-success'
  })[s] || 'badge-muted';
}
