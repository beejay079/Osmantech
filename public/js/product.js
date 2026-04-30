// public/js/product.js
let CURRENT_PRODUCT = null;
let IN_WISHLIST = false;
let QTY = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const id = new URL(location.href).searchParams.get('id');
  if (!id) return render404();

  try {
    const [{ product, seller, reviews }, wl] = await Promise.all([
      OS.products.get(id),
      OS.user() ? OS.wishlist.ids().catch(() => ({ ids: [] })) : Promise.resolve({ ids: [] })
    ]);
    CURRENT_PRODUCT = product;
    IN_WISHLIST = wl.ids.includes(Number(id));
    renderProduct(product, seller, reviews);
  } catch (e) {
    if (e.status === 404) return render404();
    document.getElementById('pdp-root').innerHTML = `<p class="muted">Couldn't load product: ${OS.escape(e.message)}</p>`;
  }
});

function render404 () {
  document.getElementById('pdp-root').innerHTML = `
    <div class="empty"><div class="ico">🔍</div><h3>Product not found</h3><p>It might have been removed.</p>
      <a href="/shop" class="btn btn-primary mt-4">Browse shop</a>
    </div>`;
}

function renderProduct (p, seller, reviews) {
  document.title = `${p.name} · OSMANTECH`;
  document.getElementById('crumbs').innerHTML = `<a href="/">Home</a> · <a href="/shop">Shop</a> · <a href="/shop?category=${encodeURIComponent(p.category)}">${OS.escape(p.category)}</a> · <span>${OS.escape(p.name)}</span>`;

  const discount = p.original_price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;

  // Build full gallery: main image + extras (deduplicated, with main first)
  const allImages = [p.image, ...(Array.isArray(p.images) ? p.images : [])]
    .filter(Boolean)
    .filter((url, i, arr) => arr.indexOf(url) === i);
  const fallbackImg = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800';

  document.getElementById('pdp-root').innerHTML = `
    <div class="pdp">
      <div>
        <div class="pdp-gallery">
          <img id="pdp-main-img" src="${OS.escape(allImages[0] || fallbackImg)}" alt="${OS.escape(p.name)}" onerror="this.src='${fallbackImg}'">
        </div>
        ${allImages.length > 1 ? `
          <div class="pdp-thumbs">
            ${allImages.map((url, i) => `
              <div class="pdp-thumb ${i === 0 ? 'active' : ''}" data-url="${OS.escape(url)}">
                <img src="${OS.escape(url)}" alt="View ${i + 1}" onerror="this.src='${fallbackImg}'">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div>
        <div class="eyebrow">${OS.escape(p.brand || p.category)}</div>
        <h1 style="font-size:2rem;margin:.5rem 0;">${OS.escape(p.name)}</h1>
        <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
          ${OS.stars(p.rating, true)} <span class="muted small">(${p.review_count} reviews)</span>
          <span class="badge-pill ${p.stock > 0 ? 'badge-success' : 'badge-danger'}">${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
          <span class="badge-pill badge-muted">${OS.escape(p.condition)}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap;margin:1rem 0 1.5rem;">
          <span class="price-big">${OS.naira(p.price)}</span>
          ${p.original_price && p.original_price > p.price ? `<span class="price-old">${OS.naira(p.original_price)}</span><span class="badge-pill badge-danger">${discount}% OFF</span>` : ''}
        </div>
        <p style="margin-bottom:1.5rem;">${OS.escape(p.description || 'No description provided.')}</p>
        <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;">
          <div class="qty">
            <button onclick="changeQty(-1)">−</button>
            <input id="qty-input" type="number" min="1" max="${p.stock || 1}" value="1" onchange="changeQty(0)">
            <button onclick="changeQty(1)">+</button>
          </div>
          <button class="btn btn-primary btn-lg" onclick="addToCart()" ${p.stock <= 0 ? 'disabled' : ''}>
            ${OS.svg.cart()} Add to cart
          </button>
          <button class="btn btn-success btn-lg" onclick="buyNow()" ${p.stock <= 0 ? 'disabled' : ''}>
            ${OS.svg.whatsapp()} Buy on WhatsApp
          </button>
        </div>
        <a href="https://wa.me/2348132664146?text=${encodeURIComponent('Hi OSMANTECH, I\'m interested in ' + p.name + ' (₦' + Number(p.price).toLocaleString('en-NG') + ')')}" target="_blank" class="btn btn-outline btn-block">
          💬 Ask a question on WhatsApp
        </a>

        <div class="divider"></div>
        <div class="grid grid-2 gap-4">
          <div><div class="muted small">Brand</div><div>${OS.escape(p.brand || '—')}</div></div>
          <div><div class="muted small">Category</div><div>${OS.escape(p.category)}</div></div>
          <div><div class="muted small">Condition</div><div>${OS.escape(p.condition)}</div></div>
          <div><div class="muted small">Location</div><div>${OS.escape(p.location || 'Ogbomoso')}</div></div>
          ${seller ? `<div><div class="muted small">Seller</div><div>${OS.escape(seller.name)}</div></div>` : ''}
          <div><div class="muted small">Listed</div><div>${OS.date(p.created_at)}</div></div>
        </div>
      </div>
    </div>

    <section style="padding:3rem 0 2rem;">
      <h3 style="margin-bottom:1.5rem;">Reviews (${reviews.length})</h3>

      ${OS.user() ? `
        <div class="card card-body mb-6">
          <h4 style="margin-bottom:.75rem;">Leave a review</h4>
          <div id="star-picker" style="font-size:1.6rem;margin-bottom:.75rem;cursor:pointer;user-select:none;">
            ${[1,2,3,4,5].map(i => `<span data-val="${i}" style="color:var(--border);transition:color .15s;">★</span>`).join('')}
          </div>
          <textarea id="review-comment" class="textarea" placeholder="Share your experience…"></textarea>
          <button class="btn btn-primary mt-4" onclick="submitReview()">Submit review</button>
        </div>
      ` : `<p class="muted mb-4"><a href="/login">Log in</a> to leave a review.</p>`}

      <div id="reviews-list">
        ${reviews.length === 0 ? '<p class="muted">No reviews yet — be the first!</p>' :
          reviews.map(r => `
            <div class="card card-body mb-4">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
                <strong>${OS.escape(r.user_name || 'Anonymous')}</strong>
                <span class="muted small">${OS.date(r.created_at)}</span>
              </div>
              ${OS.stars(r.rating)}
              <p style="margin-top:.5rem;">${OS.escape(r.comment || '')}</p>
            </div>
          `).join('')}
      </div>
    </section>
  `;

  // Gallery thumb click → swap main image
  const mainImg = document.getElementById('pdp-main-img');
  document.querySelectorAll('.pdp-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      mainImg.src = thumb.dataset.url;
    });
  });

  // star picker logic
  const picker = document.getElementById('star-picker');
  if (picker) {
    let picked = 5;
    const paint = (n) => picker.querySelectorAll('span').forEach(s => s.style.color = Number(s.dataset.val) <= n ? '#fbbf24' : 'var(--border)');
    paint(5);
    picker.addEventListener('click', e => { const v = Number(e.target?.dataset?.val); if (v) { picked = v; paint(v); } });
    picker.addEventListener('mouseover', e => { const v = Number(e.target?.dataset?.val); if (v) paint(v); });
    picker.addEventListener('mouseleave', () => paint(picked));
    picker.dataset.picked = picked;
    Object.defineProperty(picker, 'picked', { get () { return Number(picker.dataset.picked) || 5; } });
    picker.addEventListener('click', () => { picker.dataset.picked = picked; });
  }
}

window.changeQty = function (delta) {
  const input = document.getElementById('qty-input');
  const max = CURRENT_PRODUCT.stock || 1;
  let v = delta === 0 ? Number(input.value) : Number(input.value) + delta;
  v = Math.max(1, Math.min(max, v));
  input.value = v; QTY = v;
};

window.addToCart = function () {
  OS.cart.add(CURRENT_PRODUCT, QTY);
};

window.buyNow = function () {
  OS.whatsapp.buy(CURRENT_PRODUCT, QTY);
};

window.toggleWish = async function () {
  if (!OS.user()) { OS.toast('Wishlist requires admin login', 'info'); return; }
  try {
    const { inWishlist } = await OS.wishlist.toggle(CURRENT_PRODUCT.id);
    IN_WISHLIST = inWishlist;
    const btn = document.getElementById('wish-btn');
    if (btn) btn.querySelector('span').textContent = inWishlist ? 'In wishlist' : 'Wishlist';
    OS.toast(inWishlist ? 'Added to wishlist' : 'Removed from wishlist', 'success');
  } catch (e) { OS.toast(e.message, 'error'); }
};

window.submitReview = async function () {
  if (!OS.user()) { OS.toast('Please log in first', 'error'); return; }
  const rating = Number(document.getElementById('star-picker').dataset.picked) || 5;
  const comment = document.getElementById('review-comment').value.trim();
  try {
    await OS.reviews.create({ productId: CURRENT_PRODUCT.id, rating, comment });
    OS.toast('Review posted — thanks!', 'success');
    setTimeout(() => location.reload(), 900);
  } catch (e) { OS.toast(e.message, 'error'); }
};
