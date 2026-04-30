// public/js/admin.js — admin control center with full edit modals
document.addEventListener('DOMContentLoaded', async () => {
  if (!OS.user() || OS.user().role !== 'admin') {
    OS.toast('Admin access required', 'error');
    setTimeout(() => location.href = '/login?next=/admin', 900);
    return;
  }

  loadStats();

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('tab-' + t.dataset.tab).classList.remove('hidden');
    loadTab(t.dataset.tab);
  }));

  loadTab('products');
});

async function loadStats () {
  try {
    const s = await OS.admin.stats();
    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="label">Total users</div><div class="value">${s.totalUsers}</div></div>
      <div class="stat-card"><div class="label">Listings</div><div class="value">${s.totalProducts}<span style="color:var(--muted);font-size:1rem;font-weight:400;"> (${s.pendingProducts} pending)</span></div></div>
      <div class="stat-card"><div class="label">Orders</div><div class="value">${s.totalOrders}</div></div>
      <div class="stat-card"><div class="label">Revenue</div><div class="value" style="color:var(--orange);">${OS.naira(s.revenue)}</div></div>
    `;
  } catch (e) { OS.toast(e.message, 'error'); }
}

function loadTab (tab) {
  const el = document.getElementById('tab-' + tab);
  el.innerHTML = '<div class="loading"></div>';
  if (tab === 'products') return loadProducts(el);
  if (tab === 'orders')   return loadOrders(el);
  if (tab === 'repairs')  return loadRepairs(el);
  if (tab === 'swaps')    return loadSwaps(el);
  if (tab === 'users')    return loadUsers(el);
  if (tab === 'messages') return loadMessages(el);
  if (tab === 'visitors') return loadVisitors(el);
}

// Safe-attribute helper for embedding JSON in inline onclick handlers
function attrJson (obj) {
  return encodeURIComponent(JSON.stringify(obj));
}
window.fromAttrJson = function (enc) {
  try { return JSON.parse(decodeURIComponent(enc)); } catch { return null; }
};

// ════════════════════════════════════════════════════════════
// PRODUCTS — full create + edit + delete + approve + feature
// ════════════════════════════════════════════════════════════
async function loadProducts (el) {
  try {
    const { products } = await OS.admin.products();
    const toolbar = `<div style="margin-bottom:1rem;display:flex;gap:.5rem;flex-wrap:wrap;justify-content:space-between;align-items:center;">
      <div class="muted small">${products.length} total listing${products.length === 1 ? '' : 's'}</div>
      <button class="btn btn-primary" onclick="openProductEditor()">+ New product</button>
    </div>`;
    if (!products.length) { el.innerHTML = toolbar + '<p class="muted">No listings yet.</p>'; return; }
    el.innerHTML = toolbar + `
      <div class="table-wrap"><table>
        <thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Status</th><th>Featured</th><th>Actions</th></tr></thead>
        <tbody>${products.map(p => `
          <tr>
            <td><div style="display:flex;gap:.5rem;align-items:center;">
              <img src="${OS.escape(p.image)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100'">
              <div><a href="/product?id=${p.id}" target="_blank" style="font-weight:600;">${OS.escape(p.name)}</a><div class="muted small">${OS.escape(p.category)} · ${OS.escape(p.condition)}</div></div>
            </div></td>
            <td>${OS.escape(p.seller_name || '—')}</td>
            <td>${OS.naira(p.price)}${p.original_price && p.original_price > p.price ? `<div class="muted small" style="text-decoration:line-through;">${OS.naira(p.original_price)}</div>` : ''}</td>
            <td>${p.stock}</td>
            <td><span class="badge-pill ${badge(p.status)}">${p.status}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="toggleFeature(${p.id}, ${p.featured})">${p.featured ? '★ Featured' : '☆ Feature'}</button>
            </td>
            <td style="white-space:nowrap;">
              <button class="btn btn-primary btn-sm" onclick="openProductEditor(fromAttrJson('${attrJson(p)}'))">Edit</button>
              ${p.status !== 'approved' ? `<button class="btn btn-success btn-sm" onclick="setStatus(${p.id},'approved')">Approve</button>` : ''}
              ${p.status !== 'rejected' ? `<button class="btn btn-ghost btn-sm" onclick="setStatus(${p.id},'rejected')">Reject</button>` : ''}
              <button class="btn btn-ghost btn-sm" onclick="deleteProduct(${p.id})" style="color:var(--danger);">Delete</button>
            </td>
          </tr>
        `).join('')}</tbody>
      </table></div>`;
  } catch (e) { el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`; }
}

window.openProductEditor = function (existing = null) {
  const p = existing || {};
  const isEdit = !!existing;
  const m = OS.modal({
    title: isEdit ? `Edit: ${p.name}` : 'New product',
    size: 'lg',
    body: `
      <form id="prod-form">
        <div class="field">
          <label>Product images <span class="muted small">(first one is the cover; click any to set as cover)</span></label>
          <div id="prod-images-host"></div>
          <div class="hint">Upload up to 8 images. Max 5 MB each. JPG, PNG, WEBP, or GIF.</div>
          <div style="margin-top:.75rem;">
            <details>
              <summary class="muted small" style="cursor:pointer;">Or paste an image URL instead</summary>
              <input type="url" id="prod-image-url" class="input" placeholder="https://…" style="margin-top:.5rem;">
              <button type="button" class="btn btn-outline btn-sm mt-4" id="prod-add-url">Add URL to gallery</button>
            </details>
          </div>
        </div>
        <div class="field"><label>Name *</label><input class="input" id="prod-name" required value="${OS.escape(p.name || '')}"></div>
        <div class="field-row">
          <div class="field"><label>Brand</label><input class="input" id="prod-brand" value="${OS.escape(p.brand || '')}"></div>
          <div class="field">
            <label>Category *</label>
            <select class="select" id="prod-category" required>
              ${['Phones','Laptops','Smartwatches','Accessories','Games','Electronics'].map(c =>
                `<option ${p.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Condition</label>
            <select class="select" id="prod-condition">
              ${[['new','New / Sealed'],['uk-used','UK-used'],['nigerian-used','Nigerian-used'],['refurbished','Refurbished']].map(([v,l]) =>
                `<option value="${v}" ${p.condition === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Stock</label><input type="number" min="0" class="input" id="prod-stock" value="${p.stock ?? 1}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Price (₦) *</label><input type="number" min="0" class="input" id="prod-price" required value="${p.price ?? ''}"></div>
          <div class="field"><label>Original price (₦)</label><input type="number" min="0" class="input" id="prod-original" value="${p.original_price ?? ''}"><div class="hint">For showing discount</div></div>
        </div>
        <div class="field"><label>Description</label><textarea class="textarea" id="prod-desc">${OS.escape(p.description || '')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Seller phone</label><input class="input" id="prod-phone" value="${OS.escape(p.phone || '')}"></div>
          <div class="field"><label>Location</label><input class="input" id="prod-location" value="${OS.escape(p.location || 'Ogbomoso')}"></div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Status</label>
            <select class="select" id="prod-status">
              ${['approved','pending','rejected'].map(s => `<option value="${s}" ${(p.status || 'approved') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;margin-top:1.8rem;">
              <input type="checkbox" id="prod-featured" ${p.featured ? 'checked' : ''}>
              <span>Featured on home page</span>
            </label>
          </div>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem;">
          <button type="button" class="btn btn-outline" id="prod-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary" id="prod-save">${isEdit ? 'Save changes' : 'Create product'}</button>
        </div>
      </form>
    `
  });

  // Build initial image list: combine main `image` and the gallery `images[]`
  const initialImages = [p.image, ...(Array.isArray(p.images) ? p.images : [])]
    .filter(Boolean)
    .filter((u, i, arr) => arr.indexOf(u) === i);

  const uploader = OS.imageUploader(m.body.querySelector('#prod-images-host'), {
    max: 8,
    initial: initialImages,
    uploadFn: OS.uploadMultipleAdmin
  });

  // "Add URL to gallery" button
  m.body.querySelector('#prod-add-url').onclick = () => {
    const url = m.body.querySelector('#prod-image-url').value.trim();
    if (!url) return OS.toast('Paste an image URL first', 'error');
    if (!/^https?:\/\//.test(url)) return OS.toast('URL must start with http:// or https://', 'error');
    uploader.setUrls([...uploader.getUrls(), url]);
    m.body.querySelector('#prod-image-url').value = '';
  };

  m.body.querySelector('#prod-cancel').onclick = m.close;
  m.body.querySelector('#prod-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = m.body.querySelector('#prod-save'); btn.innerHTML = '<span class="loading"></span> Saving…'; btn.disabled = true;

    const allUrls = uploader.getUrls();
    if (!allUrls.length) {
      OS.toast('Please add at least one image', 'error');
      btn.innerHTML = isEdit ? 'Save changes' : 'Create product'; btn.disabled = false;
      return;
    }

    const body = {
      name:           m.body.querySelector('#prod-name').value.trim(),
      brand:          m.body.querySelector('#prod-brand').value.trim(),
      category:       m.body.querySelector('#prod-category').value,
      condition:      m.body.querySelector('#prod-condition').value,
      stock:          Number(m.body.querySelector('#prod-stock').value) || 1,
      price:          Number(m.body.querySelector('#prod-price').value),
      original_price: Number(m.body.querySelector('#prod-original').value) || null,
      description:    m.body.querySelector('#prod-desc').value.trim(),
      image:          allUrls[0],            // first one is cover
      images:         allUrls.slice(1),      // rest go to gallery
      phone:          m.body.querySelector('#prod-phone').value.trim(),
      location:       m.body.querySelector('#prod-location').value.trim(),
      status:         m.body.querySelector('#prod-status').value,
      featured:       m.body.querySelector('#prod-featured').checked ? 1 : 0
    };

    try {
      if (isEdit) await OS.products.update(existing.id, body);
      else        await OS.products.create(body);
      OS.toast(isEdit ? 'Product updated' : 'Product created', 'success');
      m.close();
      loadProducts(document.getElementById('tab-products'));
      loadStats();
    } catch (err) {
      OS.toast(err.message, 'error');
      btn.innerHTML = isEdit ? 'Save changes' : 'Create product';
      btn.disabled = false;
    }
  });
};

// ════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════
async function loadOrders (el) {
  try {
    const { orders } = await OS.admin.orders();
    if (!orders.length) return el.innerHTML = '<p class="muted">No orders yet.</p>';
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Update</th></tr></thead>
        <tbody>${orders.map(o => `
          <tr>
            <td><strong>#${o.id}</strong></td>
            <td><div>${OS.escape(o.user_name || '—')}</div><div class="muted small">${OS.escape(o.user_email || '')}</div><div class="muted small">📞 ${OS.escape(o.shipping_phone || '—')}</div></td>
            <td>${o.items.length} item(s)<div class="muted small">${OS.escape(o.items[0]?.name || '')}${o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</div></td>
            <td>${OS.naira(o.total)}</td>
            <td><span class="badge-pill ${o.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">${o.payment_status}</span><div class="muted small">${o.payment_method}</div></td>
            <td><span class="badge-pill ${badge(o.status)}">${o.status}</span></td>
            <td class="small">${OS.date(o.created_at)}</td>
            <td>
              <select class="select btn-sm" data-order-status="${o.id}" style="padding:.3rem .5rem;font-size:.8rem;min-width:140px;">
                <option value="">— update —</option>
                ${['processing','shipped','delivered','cancelled','awaiting-payment'].map(s => `<option value="${s}" ${o.status === s ? 'disabled' : ''}>${s}</option>`).join('')}
              </select>
            </td>
          </tr>
        `).join('')}</tbody>
      </table></div>`;
    el.querySelectorAll('[data-order-status]').forEach(s => s.addEventListener('change', async e => {
      const id = e.target.dataset.orderStatus;
      const status = e.target.value;
      if (!status) return;
      try { await OS.admin.setOrderStatus(id, status); OS.toast(`Order #${id} → ${status}`, 'success'); loadOrders(el); }
      catch (err) { OS.toast(err.message, 'error'); }
    }));
  } catch (e) { el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`; }
}

// ════════════════════════════════════════════════════════════
// REPAIRS — modal editor
// ════════════════════════════════════════════════════════════
async function loadRepairs (el) {
  try {
    const { repairs } = await OS.admin.repairs();
    if (!repairs.length) return el.innerHTML = '<p class="muted">No repair bookings yet.</p>';
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Customer</th><th>Device / Issue</th><th>Service</th><th>Status</th><th>Quote</th><th>Actions</th></tr></thead>
        <tbody>${repairs.map(r => `
          <tr>
            <td>#${r.id}</td>
            <td><div>${OS.escape(r.user_name || '—')}</div><div class="muted small">${OS.escape(r.user_email || '')}</div><div class="muted small">📞 ${OS.escape(r.phone || '')}</div></td>
            <td><strong>${OS.escape(r.device_type)}</strong> ${r.device_model ? '· ' + OS.escape(r.device_model) : ''}<div class="muted small">${OS.escape(r.issue)}</div></td>
            <td class="small">${OS.escape(r.service_type || '—')}</td>
            <td><span class="badge-pill ${badge(r.status)}">${r.status}</span></td>
            <td>${r.quote ? OS.naira(r.quote) : '—'}</td>
            <td><button class="btn btn-primary btn-sm" onclick="openRepairEditor(fromAttrJson('${attrJson(r)}'))">Update</button></td>
          </tr>
        `).join('')}</tbody>
      </table></div>`;
  } catch (e) { el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`; }
}

window.openRepairEditor = function (r) {
  const statuses = ['received','diagnosing','quoted','in-progress','ready','completed','cancelled'];
  const m = OS.modal({
    title: `Repair #${r.id} — ${r.device_type}`,
    body: `
      <div style="background:var(--surface-2);padding:.75rem;border-radius:var(--radius-sm);margin-bottom:1rem;font-size:.9rem;">
        <div><strong>Customer:</strong> ${OS.escape(r.user_name || '—')} (${OS.escape(r.phone || '—')})</div>
        <div><strong>Device:</strong> ${OS.escape(r.device_type)}${r.device_model ? ' · ' + OS.escape(r.device_model) : ''}</div>
        <div><strong>Issue:</strong> ${OS.escape(r.issue)}</div>
      </div>
      <form id="repair-form">
        <div class="field">
          <label>Status</label>
          <select class="select" id="r-status">${statuses.map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Quote (₦)</label><input type="number" min="0" class="input" id="r-quote" value="${r.quote || ''}" placeholder="Leave empty to keep current"></div>
        <div class="field"><label>Notes to customer</label><textarea class="textarea" id="r-notes" placeholder="Parts needed, ETA, updates…">${OS.escape(r.admin_notes || '')}</textarea></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;">
          <button type="button" class="btn btn-outline" id="r-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save update</button>
        </div>
      </form>
    `
  });
  m.body.querySelector('#r-cancel').onclick = m.close;
  m.body.querySelector('#repair-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await OS.admin.updateRepair(r.id, {
        status:      m.body.querySelector('#r-status').value,
        quote:       Number(m.body.querySelector('#r-quote').value) || undefined,
        adminNotes:  m.body.querySelector('#r-notes').value.trim() || undefined
      });
      OS.toast('Repair updated — customer notified', 'success');
      m.close();
      loadRepairs(document.getElementById('tab-repairs'));
    } catch (err) { OS.toast(err.message, 'error'); }
  });
};

// ════════════════════════════════════════════════════════════
// SWAPS — modal editor
// ════════════════════════════════════════════════════════════
async function loadSwaps (el) {
  try {
    const { swaps } = await OS.admin.swaps();
    if (!swaps.length) return el.innerHTML = '<p class="muted">No swap requests yet.</p>';
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Customer</th><th>Have ↔ Want</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${swaps.map(s => `
          <tr>
            <td>#${s.id}</td>
            <td><div>${OS.escape(s.user_name || '—')}</div><div class="muted small">${OS.escape(s.phone || '')}</div></td>
            <td><strong>${OS.escape(s.have_item)}</strong> ↔ <strong>${OS.escape(s.want_item)}</strong>${s.have_value ? `<div class="muted small">Est. ${OS.naira(s.have_value)}</div>` : ''}</td>
            <td><span class="badge-pill ${badge(s.status)}">${s.status}</span></td>
            <td><button class="btn btn-primary btn-sm" onclick="openSwapEditor(fromAttrJson('${attrJson(s)}'))">Respond</button></td>
          </tr>
        `).join('')}</tbody>
      </table></div>`;
  } catch (e) { el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`; }
}

window.openSwapEditor = function (s) {
  const statuses = ['pending','approved','rejected','completed'];
  const m = OS.modal({
    title: `Swap request #${s.id}`,
    body: `
      <div style="background:var(--surface-2);padding:.75rem;border-radius:var(--radius-sm);margin-bottom:1rem;font-size:.9rem;">
        <div><strong>Customer:</strong> ${OS.escape(s.user_name || '—')} (${OS.escape(s.phone || '—')})</div>
        <div><strong>Has:</strong> ${OS.escape(s.have_item)} (${OS.escape(s.have_condition || 'n/a')})${s.have_value ? ` — est. ${OS.naira(s.have_value)}` : ''}</div>
        <div><strong>Wants:</strong> ${OS.escape(s.want_item)}</div>
        ${s.notes ? `<div><strong>Notes:</strong> ${OS.escape(s.notes)}</div>` : ''}
      </div>
      <form id="swap-form">
        <div class="field">
          <label>Status</label>
          <select class="select" id="s-status">${statuses.map(x => `<option value="${x}" ${s.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Response to customer</label><textarea class="textarea" id="s-response" placeholder="Your quote, top-up amount, next steps…">${OS.escape(s.admin_response || '')}</textarea></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;">
          <button type="button" class="btn btn-outline" id="s-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Send response</button>
        </div>
      </form>
    `
  });
  m.body.querySelector('#s-cancel').onclick = m.close;
  m.body.querySelector('#swap-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await OS.admin.updateSwap(s.id, {
        status:         m.body.querySelector('#s-status').value,
        adminResponse:  m.body.querySelector('#s-response').value.trim() || undefined
      });
      OS.toast('Swap updated — customer notified', 'success');
      m.close();
      loadSwaps(document.getElementById('tab-swaps'));
    } catch (err) { OS.toast(err.message, 'error'); }
  });
};

// ════════════════════════════════════════════════════════════
// USERS — full edit modal
// ════════════════════════════════════════════════════════════
async function loadUsers (el) {
  try {
    const { users } = await OS.admin.users();
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>${users.map(u => `
          <tr>
            <td><strong>${OS.escape(u.name)}</strong></td>
            <td>${OS.escape(u.email)}</td>
            <td>${OS.escape(u.phone || '—')}</td>
            <td><span class="badge-pill ${u.role === 'admin' ? 'badge-success' : 'badge-muted'}">${u.role}</span></td>
            <td class="small">${OS.date(u.created_at)}</td>
            <td style="white-space:nowrap;">
              <button class="btn btn-primary btn-sm" onclick="openUserEditor(fromAttrJson('${attrJson(u)}'))">Edit</button>
              ${u.id !== OS.user().id ? `<button class="btn btn-ghost btn-sm" onclick="deleteUser(${u.id})" style="color:var(--danger);">Delete</button>` : '<span class="muted small">(you)</span>'}
            </td>
          </tr>
        `).join('')}</tbody>
      </table></div>`;
  } catch (e) { el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`; }
}

window.openUserEditor = function (u) {
  const m = OS.modal({
    title: `Edit user: ${u.name}`,
    body: `
      <form id="user-form">
        <div class="field"><label>Name</label><input class="input" id="u-name" value="${OS.escape(u.name)}" required></div>
        <div class="field"><label>Email</label><input type="email" class="input" id="u-email" value="${OS.escape(u.email)}" required></div>
        <div class="field"><label>Phone</label><input type="tel" class="input" id="u-phone" value="${OS.escape(u.phone || '')}"></div>
        <div class="field">
          <label>Role</label>
          <select class="select" id="u-role">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          ${u.id === OS.user().id ? '<div class="hint" style="color:var(--warning);">⚠ Be careful — you are editing your own account.</div>' : ''}
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;">
          <button type="button" class="btn btn-outline" id="u-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save changes</button>
        </div>
      </form>
    `
  });
  m.body.querySelector('#u-cancel').onclick = m.close;
  m.body.querySelector('#user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const newRole = m.body.querySelector('#u-role').value;
      await OS.admin.updateUser(u.id, {
        name:  m.body.querySelector('#u-name').value.trim(),
        email: m.body.querySelector('#u-email').value.trim(),
        phone: m.body.querySelector('#u-phone').value.trim()
      });
      if (newRole !== u.role) await OS.admin.setRole(u.id, newRole);
      OS.toast('User updated', 'success');
      m.close();
      loadUsers(document.getElementById('tab-users'));
    } catch (err) { OS.toast(err.message, 'error'); }
  });
};

// ════════════════════════════════════════════════════════════
// MESSAGES
// ════════════════════════════════════════════════════════════
async function loadMessages (el) {
  try {
    const { messages } = await OS.admin.messages();
    if (!messages.length) return el.innerHTML = '<p class="muted">No contact messages yet.</p>';
    el.innerHTML = messages.map(msg => `
      <div class="card card-body mb-4" style="${msg.handled ? 'opacity:.55' : ''}">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem;">
          <strong>${OS.escape(msg.name)}${msg.subject ? ' — ' + OS.escape(msg.subject) : ''}</strong>
          <span class="muted small">${OS.dateTime(msg.created_at)}</span>
        </div>
        <div class="muted small">${OS.escape(msg.email || '')} · ${OS.escape(msg.phone || '')}</div>
        <p style="margin-top:.5rem;white-space:pre-wrap;">${OS.escape(msg.body)}</p>
        <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap;">
          ${msg.email ? `<a href="mailto:${OS.escape(msg.email)}" class="btn btn-outline btn-sm">Reply by email</a>` : ''}
          ${msg.phone ? `<a href="https://wa.me/${msg.phone.replace(/^0/, '234')}" target="_blank" class="btn btn-success btn-sm">WhatsApp</a>` : ''}
          ${!msg.handled ? `<button class="btn btn-dark btn-sm" onclick="markHandled(${msg.id})">Mark handled</button>` : '<span class="badge-pill badge-success">Handled</span>'}
        </div>
      </div>
    `).join('');
  } catch (e) { el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`; }
}

// ════════════════════════════════════════════════════════════
// VISITORS — analytics dashboard
// ════════════════════════════════════════════════════════════
async function loadVisitors (el) {
  try {
    const data = await OS.admin.visitStats();
    const t = data.totals;

    // Build daily chart bars (max value scaled to 100%)
    const maxDaily = Math.max(1, ...data.daily.map(d => d.visits));
    const chartHtml = data.daily.length === 0
      ? '<p class="muted">No data yet — once people start visiting, you\'ll see a chart here.</p>'
      : `<div style="display:flex;align-items:flex-end;gap:.5rem;height:180px;padding:.5rem 0;border-bottom:1px solid var(--border);overflow-x:auto;">
          ${data.daily.map(d => {
            const h = Math.max(4, (d.visits / maxDaily) * 160);
            const dayLabel = new Date(d.day).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;min-width:42px;" title="${OS.escape(dayLabel)}: ${d.visits} visits, ${d.uniques} unique">
              <div style="font-size:.7rem;color:var(--muted);">${d.visits}</div>
              <div style="width:100%;background:linear-gradient(180deg, var(--orange) 0%, var(--orange-700) 100%);border-radius:4px 4px 0 0;height:${h}px;transition:height .3s;"></div>
              <div style="font-size:.65rem;color:var(--muted);text-align:center;">${OS.escape(dayLabel)}</div>
            </div>`;
          }).join('')}
        </div>`;

    el.innerHTML = `
      <div class="grid grid-4 mb-6">
        <div class="stat-card"><div class="label">Today</div><div class="value">${t.today}</div><div class="muted small">${t.todayUnique} unique</div></div>
        <div class="stat-card"><div class="label">Last 7 days</div><div class="value">${t.week}</div><div class="muted small">${t.weekUnique} unique</div></div>
        <div class="stat-card"><div class="label">Last 30 days</div><div class="value">${t.month}</div><div class="muted small">${t.monthUnique} unique</div></div>
        <div class="stat-card"><div class="label">All time</div><div class="value" style="color:var(--orange);">${t.all}</div><div class="muted small">${t.allUnique} unique</div></div>
      </div>

      <div class="card card-body mb-6">
        <h4 style="margin-bottom:1rem;">📈 Visits over the last 14 days</h4>
        ${chartHtml}
      </div>

      <div class="grid grid-2 gap-6 mb-6">
        <div class="card card-body">
          <h4 style="margin-bottom:1rem;">🌟 Most-visited pages (last 30 days)</h4>
          ${data.topPages.length === 0 ? '<p class="muted">No data yet.</p>' : `
            <div class="table-wrap"><table>
              <thead><tr><th>Page</th><th>Visits</th><th>Unique</th></tr></thead>
              <tbody>${data.topPages.map(p => `
                <tr><td><code style="font-family:var(--font-mono);font-size:.85rem;">${OS.escape(p.path)}</code></td><td>${p.visits}</td><td>${p.uniques}</td></tr>
              `).join('')}</tbody>
            </table></div>
          `}
        </div>

        <div class="card card-body">
          <h4 style="margin-bottom:1rem;">📱 Devices (last 30 days)</h4>
          ${data.devices.length === 0 ? '<p class="muted">No data yet.</p>' : `
            <div class="table-wrap"><table>
              <thead><tr><th>Device</th><th>Visits</th><th>%</th></tr></thead>
              <tbody>${(() => {
                const total = data.devices.reduce((s, d) => s + d.visits, 0);
                return data.devices.map(d => `
                  <tr><td>${OS.escape(d.device)}</td><td>${d.visits}</td><td>${total ? Math.round((d.visits/total)*100) : 0}%</td></tr>
                `).join('');
              })()}</tbody>
            </table></div>
          `}
        </div>
      </div>

      <div class="card card-body">
        <h4 style="margin-bottom:1rem;">🕒 Recent visits</h4>
        ${data.recent.length === 0 ? '<p class="muted">No data yet.</p>' : `
          <div class="table-wrap"><table>
            <thead><tr><th>Time</th><th>Page</th><th>Device</th><th>From</th></tr></thead>
            <tbody>${data.recent.map(r => `
              <tr>
                <td class="small">${OS.dateTime(r.created_at)}</td>
                <td><code style="font-family:var(--font-mono);font-size:.85rem;">${OS.escape(r.path)}</code></td>
                <td>${OS.escape(r.device)}</td>
                <td class="small muted">${r.referer ? OS.escape(r.referer.replace(/^https?:\/\//, '').slice(0, 40)) : 'Direct'}</td>
              </tr>
            `).join('')}</tbody>
          </table></div>
        `}
      </div>

      <p class="muted small mt-4">📊 Stats update in real-time. Visits are tracked when pages load. Bots are excluded. IPs are hashed for privacy.</p>
    `;
  } catch (e) { el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`; }
}

// ════════════════════════════════════════════════════════════
// Quick actions
// ════════════════════════════════════════════════════════════
window.setStatus = async function (id, status) {
  try { await OS.admin.setProductStatus(id, status); OS.toast(`Marked as ${status}`, 'success'); loadProducts(document.getElementById('tab-products')); loadStats(); }
  catch (e) { OS.toast(e.message, 'error'); }
};
window.toggleFeature = async function (id, current) {
  try { await OS.admin.feature(id, !current); OS.toast(current ? 'Unfeatured' : 'Featured', 'success'); loadProducts(document.getElementById('tab-products')); }
  catch (e) { OS.toast(e.message, 'error'); }
};
window.deleteProduct = async function (id) {
  if (!confirm('Delete this listing permanently?')) return;
  try { await OS.admin.removeProduct(id); OS.toast('Deleted', 'info'); loadProducts(document.getElementById('tab-products')); loadStats(); }
  catch (e) { OS.toast(e.message, 'error'); }
};
window.deleteUser = async function (id) {
  if (!confirm('Delete this user permanently? All their orders, listings, and data will be removed.')) return;
  try { await OS.admin.removeUser(id); OS.toast('User deleted', 'info'); loadUsers(document.getElementById('tab-users')); loadStats(); }
  catch (e) { OS.toast(e.message, 'error'); }
};
window.markHandled = async function (id) {
  try { await OS.admin.messageDone(id); OS.toast('Marked handled', 'success'); loadMessages(document.getElementById('tab-messages')); }
  catch (e) { OS.toast(e.message, 'error'); }
};

function badge (s) {
  return ({
    approved:'badge-success',pending:'badge-warning',rejected:'badge-danger',completed:'badge-success',cancelled:'badge-danger',
    processing:'badge-info','awaiting-payment':'badge-warning',shipped:'badge-info',delivered:'badge-success',paid:'badge-success',
    received:'badge-info',diagnosing:'badge-warning',quoted:'badge-warning','in-progress':'badge-warning',ready:'badge-success'
  })[s] || 'badge-muted';
}
