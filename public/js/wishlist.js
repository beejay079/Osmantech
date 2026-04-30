// public/js/wishlist.js
document.addEventListener('DOMContentLoaded', async () => {
  if (!OS.user()) {
    OS.toast('Please log in', 'error');
    setTimeout(() => location.href = '/login?next=/wishlist', 900);
    return;
  }
  render();
});

async function render () {
  const el = document.getElementById('wishlist-grid');
  try {
    const { products } = await OS.wishlist.list();
    if (!products.length) {
      el.innerHTML = `<div class="empty"><div class="ico">💛</div><h3>Nothing saved yet</h3><p>Tap the heart on any product to save it here.</p><a href="/shop" class="btn btn-primary mt-4">Browse shop</a></div>`;
      return;
    }
    el.className = 'grid grid-4';
    el.innerHTML = products.map(p => `
      <div class="card product" style="cursor:default;">
        <div class="product-img">
          <a href="/product?id=${p.id}"><img src="${OS.escape(p.image)}" alt="${OS.escape(p.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600'"></a>
          <button class="wishlist-btn active" onclick="removeFromWishlist(${p.id})" title="Remove">♥</button>
        </div>
        <div class="product-info">
          <div class="product-brand">${OS.escape(p.brand || p.category)}</div>
          <div class="product-name">${OS.escape(p.name)}</div>
          <div class="product-price">
            <span class="current">${OS.naira(p.price)}</span>
            ${p.original_price && p.original_price > p.price ? `<span class="old">${OS.naira(p.original_price)}</span>` : ''}
          </div>
          <button class="btn btn-primary btn-sm btn-block mt-4" onclick='addToCart(${JSON.stringify({ id: p.id, name: p.name, price: p.price, image: p.image })})'>Add to cart</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`;
  }
}

window.removeFromWishlist = async function (id) {
  try { await OS.wishlist.toggle(id); OS.toast('Removed from wishlist', 'info'); render(); }
  catch (e) { OS.toast(e.message, 'error'); }
};

window.addToCart = function (product) {
  OS.cart.add(product, 1);
};
