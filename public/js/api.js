// public/js/api.js — thin fetch client

const OS = window.OS = window.OS || {};

OS.token = () => localStorage.getItem('os-token') || '';
OS.setToken = (t) => { if (t) localStorage.setItem('os-token', t); else localStorage.removeItem('os-token'); };
OS.user = () => { try { return JSON.parse(localStorage.getItem('os-user') || 'null'); } catch { return null; } };
OS.setUser = (u) => { if (u) localStorage.setItem('os-user', JSON.stringify(u)); else localStorage.removeItem('os-user'); };

OS.naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
OS.date  = (s) => {
  try { return new Date(s).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return s; }
};
OS.dateTime = (s) => {
  try { return new Date(s).toLocaleString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};

OS.api = async function api (path, options = {}) {
  const opts = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include'
  };
  const tok = OS.token();
  if (tok) opts.headers.Authorization = 'Bearer ' + tok;
  if (options.body && typeof options.body !== 'string') opts.body = JSON.stringify(options.body);
  else if (options.body) opts.body = options.body;

  let res;
  try { res = await fetch(path, opts); }
  catch (e) { throw new Error('Network error. Check your connection.'); }

  let data; try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = (data && data.error) || `Request failed (${res.status})`;
    if (res.status === 401 && OS.token()) {
      // token expired/invalid — soft clear
      OS.setToken(null); OS.setUser(null);
    }
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return data;
};

// File upload helper (single, requires auth)
OS.upload = async function upload (file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + OS.token() },
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data; // { url: '/uploads/...' }
};

// Multi-file upload — public endpoint (no auth) for sell/swap forms
OS.uploadMultiplePublic = async function (files) {
  const form = new FormData();
  Array.from(files).forEach(f => form.append('files', f));
  const res = await fetch('/api/upload/multiple', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data; // { urls: [...], count }
};

// Multi-file upload — admin endpoint (requires auth) for product gallery
OS.uploadMultipleAdmin = async function (files) {
  const form = new FormData();
  Array.from(files).forEach(f => form.append('files', f));
  const res = await fetch('/api/upload/admin-multiple', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + OS.token() },
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data; // { urls: [...], count }
};

// Short helpers
OS.auth = {
  register: (body) => OS.api('/api/auth/register', { method: 'POST', body }),
  login:    (body) => OS.api('/api/auth/login',    { method: 'POST', body }),
  google:   (body) => OS.api('/api/auth/google',   { method: 'POST', body }),
  me:       () => OS.api('/api/auth/me'),
  update:   (body) => OS.api('/api/auth/me', { method: 'PUT', body })
};

OS.products = {
  list:   (q = {}) => OS.api('/api/products?' + new URLSearchParams(q)),
  get:    (id) => OS.api('/api/products/' + id),
  meta:   () => OS.api('/api/products/meta'),
  create: (body) => OS.api('/api/products', { method: 'POST', body }),
  update: (id, body) => OS.api('/api/products/' + id, { method: 'PUT', body }),
  remove: (id) => OS.api('/api/products/' + id, { method: 'DELETE' }),
  mine:   () => OS.api('/api/products/mine/list')
};

OS.orders = {
  create: (body) => OS.api('/api/orders', { method: 'POST', body }),
  my:     () => OS.api('/api/orders/my'),
  get:    (id) => OS.api('/api/orders/' + id)
};

OS.swaps = {
  create: (body) => OS.api('/api/swaps', { method: 'POST', body }),
  my:     () => OS.api('/api/swaps/my')
};

OS.repairs = {
  create: (body) => OS.api('/api/repairs', { method: 'POST', body }),
  my:     () => OS.api('/api/repairs/my')
};

OS.reviews = {
  create: (body) => OS.api('/api/reviews', { method: 'POST', body }),
  forProduct: (id) => OS.api('/api/reviews/product/' + id)
};

OS.wishlist = {
  toggle: (productId) => OS.api('/api/wishlist/toggle', { method: 'POST', body: { productId } }),
  list:   () => OS.api('/api/wishlist'),
  ids:    () => OS.api('/api/wishlist/ids')
};

OS.notifications = {
  list:    () => OS.api('/api/notifications'),
  read:    (id) => OS.api('/api/notifications/' + id + '/read', { method: 'POST' }),
  readAll: () => OS.api('/api/notifications/read-all', { method: 'POST' })
};

OS.admin = {
  stats:    () => OS.api('/api/admin/stats'),
  users:    () => OS.api('/api/admin/users'),
  removeUser: (id) => OS.api('/api/admin/users/' + id, { method: 'DELETE' }),
  setRole:  (id, role) => OS.api('/api/admin/users/' + id + '/role', { method: 'PUT', body: { role } }),
  updateUser: (id, body) => OS.api('/api/admin/users/' + id, { method: 'PUT', body }),
  products: () => OS.api('/api/admin/products'),
  setProductStatus: (id, status) => OS.api('/api/admin/products/' + id + '/status', { method: 'PUT', body: { status } }),
  feature:  (id, featured) => OS.api('/api/admin/products/' + id + '/feature', { method: 'PUT', body: { featured } }),
  removeProduct: (id) => OS.api('/api/admin/products/' + id, { method: 'DELETE' }),
  orders:   () => OS.api('/api/admin/orders'),
  setOrderStatus: (id, status) => OS.api('/api/admin/orders/' + id + '/status', { method: 'PUT', body: { status } }),
  repairs:  () => OS.api('/api/admin/repairs'),
  updateRepair: (id, body) => OS.api('/api/admin/repairs/' + id + '/status', { method: 'PUT', body }),
  swaps:    () => OS.api('/api/admin/swaps'),
  updateSwap: (id, body) => OS.api('/api/admin/swaps/' + id + '/status', { method: 'PUT', body }),
  messages: () => OS.api('/api/admin/messages'),
  messageDone: (id) => OS.api('/api/admin/messages/' + id + '/handled', { method: 'PUT' }),
  visitStats: () => OS.api('/api/visits/stats')
};
