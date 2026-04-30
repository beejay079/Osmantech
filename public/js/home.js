// public/js/home.js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { products } = await OS.products.list({ featured: 1, limit: 8 });
    const grid = document.getElementById('featured-grid');
    if (!products.length) { grid.innerHTML = '<p class="muted">No featured products yet.</p>'; return; }
    grid.innerHTML = products.slice(0, 8).map(productCard).join('');
  } catch (e) {
    document.getElementById('featured-grid').innerHTML = `<p class="muted">Couldn't load products: ${OS.escape(e.message)}</p>`;
  }
});

function productCard (p) {
  const discount = p.original_price && p.original_price > p.price
    ? Math.round((1 - p.price / p.original_price) * 100) : 0;
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
