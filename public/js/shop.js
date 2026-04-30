// public/js/shop.js
let META = { categories: [], brands: [], priceRange: { min: 0, max: 5000000 } };
let STATE = {
  category: new URL(location.href).searchParams.get('category') || 'all',
  brands: [],
  conditions: [],
  minPrice: null,
  maxPrice: null,
  q: '',
  sort: 'newest',
  featured: new URL(location.href).searchParams.get('featured') === '1'
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    ({ categories: META.categories, brands: META.brands, priceRange: META.priceRange } = await OS.products.meta());
  } catch {}
  renderFilters();
  await loadProducts();

  document.getElementById('search').addEventListener('input', debounce(e => { STATE.q = e.target.value; loadProducts(); }, 300));
  document.getElementById('sort').addEventListener('change', e => { STATE.sort = e.target.value; loadProducts(); });
});

function debounce (fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function renderFilters () {
  const el = document.getElementById('filters');
  const conditions = ['new', 'uk-used', 'nigerian-used'];
  el.innerHTML = `
    <h4 style="font-family:var(--font-display);font-weight:600;margin-bottom:1rem;">Filters</h4>
    <div class="filter-group">
      <h4>Category</h4>
      <label class="chk"><input type="radio" name="cat" value="all" ${STATE.category === 'all' ? 'checked' : ''}> All categories</label>
      ${META.categories.map(c => `<label class="chk"><input type="radio" name="cat" value="${OS.escape(c)}" ${STATE.category === c ? 'checked' : ''}> ${OS.escape(c)}</label>`).join('')}
    </div>
    <div class="filter-group">
      <h4>Brand</h4>
      ${META.brands.map(b => `<label class="chk"><input type="checkbox" name="brand" value="${OS.escape(b)}"> ${OS.escape(b)}</label>`).join('') || '<p class="muted small">No brands yet</p>'}
    </div>
    <div class="filter-group">
      <h4>Condition</h4>
      ${conditions.map(c => `<label class="chk"><input type="checkbox" name="cond" value="${c}"> ${c.replace('-', ' ')}</label>`).join('')}
    </div>
    <div class="filter-group">
      <h4>Price (₦)</h4>
      <div class="field-row">
        <input type="number" class="input" id="min-price" placeholder="Min" min="0">
        <input type="number" class="input" id="max-price" placeholder="Max" min="0">
      </div>
      <button class="btn btn-outline btn-sm btn-block mt-4" onclick="applyPrice()">Apply price</button>
    </div>
    <button class="btn btn-ghost btn-sm btn-block" onclick="resetFilters()">Clear all filters</button>
  `;

  el.querySelectorAll('input[name=cat]').forEach(i => i.addEventListener('change', e => { STATE.category = e.target.value; loadProducts(); }));
  el.querySelectorAll('input[name=brand]').forEach(i => i.addEventListener('change', () => {
    STATE.brands = Array.from(el.querySelectorAll('input[name=brand]:checked')).map(x => x.value);
    loadProducts();
  }));
  el.querySelectorAll('input[name=cond]').forEach(i => i.addEventListener('change', () => {
    STATE.conditions = Array.from(el.querySelectorAll('input[name=cond]:checked')).map(x => x.value);
    loadProducts();
  }));
}

window.applyPrice = function () {
  STATE.minPrice = Number(document.getElementById('min-price').value) || null;
  STATE.maxPrice = Number(document.getElementById('max-price').value) || null;
  loadProducts();
};

window.resetFilters = function () {
  STATE = { category: 'all', brands: [], conditions: [], minPrice: null, maxPrice: null, q: '', sort: 'newest', featured: false };
  document.getElementById('search').value = '';
  document.getElementById('sort').value = 'newest';
  renderFilters();
  loadProducts();
};

async function loadProducts () {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;"><div class="loading"></div></div>';

  // Server handles single brand/condition; for multiple, fetch all and filter client-side for simplicity.
  const query = { sort: STATE.sort, limit: 60 };
  if (STATE.category && STATE.category !== 'all') query.category = STATE.category;
  if (STATE.brands.length === 1)     query.brand = STATE.brands[0];
  if (STATE.conditions.length === 1) query.condition = STATE.conditions[0];
  if (STATE.minPrice) query.minPrice = STATE.minPrice;
  if (STATE.maxPrice) query.maxPrice = STATE.maxPrice;
  if (STATE.q) query.q = STATE.q;
  if (STATE.featured) query.featured = 1;

  try {
    let { products } = await OS.products.list(query);
    if (STATE.brands.length > 1)     products = products.filter(p => STATE.brands.includes(p.brand));
    if (STATE.conditions.length > 1) products = products.filter(p => STATE.conditions.includes(p.condition));

    document.getElementById('product-count').textContent = `${products.length} product${products.length === 1 ? '' : 's'} found`;
    const title = STATE.category !== 'all' ? STATE.category : (STATE.featured ? 'Featured products' : 'All products');
    document.getElementById('shop-title').textContent = title;

    if (!products.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1;"><div class="ico">🔍</div><h3>Nothing found</h3><p>Try clearing some filters or searching something else.</p></div>`;
      return;
    }
    grid.innerHTML = products.map(cardHtml).join('');
  } catch (e) {
    grid.innerHTML = `<p class="muted">Couldn't load: ${OS.escape(e.message)}</p>`;
  }
}

function cardHtml (p) {
  const discount = p.original_price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
  return `
    <a href="/product?id=${p.id}" class="card product">
      <div class="product-img">
        <img src="${OS.escape(p.image)}" alt="${OS.escape(p.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600'">
        ${discount > 0 ? `<div class="product-badge">-${discount}%</div>` : (p.condition === 'new' ? '<div class="product-badge">NEW</div>' : '')}
      </div>
      <div class="product-info">
        <div class="product-brand">${OS.escape(p.brand || p.category)}</div>
        <div class="product-name">${OS.escape(p.name)}</div>
        <div class="product-meta">${OS.stars(p.rating)} <span class="small">(${p.review_count})</span></div>
        <div class="product-price">
          <span class="current">${OS.naira(p.price)}</span>
          ${p.original_price && p.original_price > p.price ? `<span class="old">${OS.naira(p.original_price)}</span>` : ''}
        </div>
      </div>
    </a>
  `;
}
