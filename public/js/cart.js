// public/js/cart.js
document.addEventListener('DOMContentLoaded', render);

function render () {
  const items = OS.cart.get();
  const itemsEl = document.getElementById('cart-items');
  const sumEl   = document.getElementById('cart-summary');

  if (!items.length) {
    itemsEl.innerHTML = `
      <div class="empty"><div class="ico">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Find something you love.</p>
        <a href="/shop" class="btn btn-primary mt-4">Browse the shop</a>
      </div>`;
    sumEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = items.map(i => `
    <div class="cart-item">
      <img src="${OS.escape(i.image)}" alt="${OS.escape(i.name)}" onerror="this.src='https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200'">
      <div>
        <a href="/product?id=${i.id}" style="font-weight:600;">${OS.escape(i.name)}</a>
        <div class="muted small">${OS.naira(i.price)} each</div>
        <div style="display:flex;gap:.5rem;align-items:center;margin-top:.5rem;flex-wrap:wrap;">
          <div class="qty">
            <button onclick="setQty(${i.id}, ${i.quantity - 1})" ${i.quantity <= 1 ? 'disabled' : ''}>−</button>
            <input type="number" value="${i.quantity}" min="1" onchange="setQty(${i.id}, this.value)">
            <button onclick="setQty(${i.id}, ${i.quantity + 1})">+</button>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="removeItem(${i.id})" style="color:var(--danger);">Remove</button>
        </div>
      </div>
      <div style="font-weight:700;color:var(--orange);font-family:var(--font-display);font-size:1.2rem;">
        ${OS.naira(i.price * i.quantity)}
      </div>
    </div>
  `).join('');

  const subtotal = OS.cart.subtotal();
  const delivery = subtotal > 200000 ? 0 : 3500;
  const total = subtotal + delivery;

  sumEl.innerHTML = `
    <div class="cart-summary">
      <h3 style="margin-bottom:1rem;">Order summary</h3>
      <div class="summary-row"><span>Subtotal (${OS.cart.count()} items)</span><span>${OS.naira(subtotal)}</span></div>
      <div class="summary-row"><span>Delivery</span><span>Discuss on WhatsApp</span></div>
      <div class="summary-row total"><span>Total</span><span>${OS.naira(subtotal)}</span></div>
      <button class="btn btn-success btn-lg btn-block mt-4" onclick="orderViaWhatsApp()">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="margin-right:.4rem;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Order all on WhatsApp
      </button>
      <button class="btn btn-ghost btn-block" onclick="clearCart()" style="color:var(--muted);margin-top:.5rem;">Clear cart</button>
      <div style="padding:1rem;background:var(--orange-50);border-radius:var(--radius-sm);margin-top:1rem;font-size:.85rem;color:var(--ink-2);">
        ✓ Order details auto-filled in WhatsApp<br>
        ✓ Discuss payment & delivery directly with us<br>
        ✓ Same-day pickup in Ogbomoso
      </div>
    </div>
  `;
}

window.orderViaWhatsApp = function () {
  OS.whatsapp.buyCart(OS.cart.get());
};

window.setQty = function (id, qty) {
  const q = Number(qty);
  if (q <= 0) return removeItem(id);
  OS.cart.update(id, q);
  render();
};

window.removeItem = function (id) {
  OS.cart.remove(id);
  render();
  OS.toast('Item removed', 'info');
};

window.clearCart = function () {
  if (!confirm('Clear all items from your cart?')) return;
  OS.cart.clear();
  render();
};
