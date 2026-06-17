// Cart system
(function () {
  const CART_KEY = 'ose_cart';

  // Each cart item: { name, price, service, href, qty }
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  function parsePrice(str) {
    const m = String(str || '').replace(/,/g, '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  }

  function getTotal() {
    return getCart().reduce((sum, c) => sum + parsePrice(c.price) * (c.qty || 1), 0);
  }

  function getTotalCount() {
    return getCart().reduce((sum, c) => sum + (c.qty || 1), 0);
  }

  function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(c => c.service === item.service);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    saveCart(cart);
    renderCartBadge();
    showToast(item.name);
    openCart();
  }

  function removeFromCart(service) {
    saveCart(getCart().filter(c => c.service !== service));
    renderCart();
    renderCartBadge();
  }

  function incrementQty(service) {
    const cart = getCart();
    const item = cart.find(c => c.service === service);
    if (item) { item.qty = (item.qty || 1) + 1; saveCart(cart); renderCart(); renderCartBadge(); }
  }

  function decrementQty(service) {
    const cart = getCart();
    const item = cart.find(c => c.service === service);
    if (item) {
      item.qty = (item.qty || 1) - 1;
      if (item.qty < 1) item.qty = 1;
      saveCart(cart);
      renderCart();
      renderCartBadge();
    }
  }

  function showToast(name) {
    const old = document.getElementById('cart-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'cart-toast';
    t.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
      <span><b>${escHtml(name)}</b> savatchangizga qo'shildi!</span>`;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #e2e8f0;border-left:4px solid #22c55e;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:#0f172a;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:999999;white-space:nowrap;animation:slideUp 0.3s ease;';
    document.body.appendChild(t);
    setTimeout(() => t && t.remove(), 3500);
  }

  function renderCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = getTotalCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function renderCart() {
    const list = document.getElementById('cart-items-list');
    const footer = document.getElementById('cart-footer');
    const totalEl = document.getElementById('cart-total');
    if (!list) return;
    const cart = getCart();
    if (cart.length === 0) {
      list.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;gap:12px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p style="color:#94a3b8;font-size:14px;margin:0;">Savatcha bo'sh</p></div>`;
      if (footer) footer.style.display = 'none';
      return;
    }
    list.innerHTML = cart.map(item => {
      const qty = item.qty || 1;
      const svc = escHtml(item.service);
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;color:#0f172a;margin-bottom:6px;">${escHtml(item.name)}</div>
          <div style="font-size:13px;color:#2563eb;font-weight:600;">${escHtml(item.price)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <button onclick="window.__cart.decrement('${svc}')" style="width:28px;height:28px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;font-size:16px;font-weight:700;color:#0f172a;display:flex;align-items:center;justify-content:center;line-height:1;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">−</button>
          <span style="min-width:20px;text-align:center;font-size:14px;font-weight:700;color:#0f172a;">${qty}</span>
          <button onclick="window.__cart.increment('${svc}')" style="width:28px;height:28px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;font-size:16px;font-weight:700;color:#0f172a;display:flex;align-items:center;justify-content:center;line-height:1;transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">+</button>
        </div>
        <button onclick="window.__cart.remove('${svc}')" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:20px;line-height:1;padding:2px;flex-shrink:0;transition:color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">×</button>
      </div>`;
    }).join('');
    if (footer) footer.style.display = 'block';
    const total = getTotal();
    if (totalEl) totalEl.textContent = total > 0 ? `$${total.toLocaleString('en-US')}` : '—';
  }

  function openCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.style.transform = 'translateX(0)';
    if (overlay) overlay.style.display = 'block';
    renderCart();
  }
  function closeCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.style.transform = 'translateX(100%)';
    if (overlay) overlay.style.display = 'none';
  }

  function proceedToOrder() {
    const cart = getCart();
    if (!cart.length) return;
    const first = cart[0];
    window.location.href = first.href || `/public/create-task.html?service=${first.service}`;
  }

  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function injectUI() {
    const style = document.createElement('style');
    style.textContent = `@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(style);

    const html = `
<div id="cart-overlay" onclick="window.__cart.close()" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.35);z-index:99998;backdrop-filter:blur(2px);transition:opacity 0.2s;"></div>
<div id="cart-drawer" style="position:fixed;top:0;right:0;width:380px;max-width:96vw;height:100vh;background:#fff;z-index:99999;box-shadow:-8px 0 40px rgba(0,0,0,0.13);transform:translateX(100%);transition:transform 0.32s cubic-bezier(0.16,1,0.3,1);display:flex;flex-direction:column;font-family:'Plus Jakarta Sans',sans-serif;">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #e2e8f0;">
    <div style="display:flex;align-items:center;gap:10px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span style="font-weight:700;font-size:16px;color:#0f172a;">Savatcha</span>
    </div>
    <button onclick="window.__cart.close()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:24px;line-height:1;padding:4px;transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">×</button>
  </div>

  <div id="cart-items-list" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;"></div>

  <div id="cart-footer" style="display:none;padding:20px 24px;border-top:1px solid #e2e8f0;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <span style="font-size:14px;color:#64748b;">Jami summa:</span>
      <span id="cart-total" style="font-size:20px;font-weight:800;color:#0f172a;"></span>
    </div>
    <button onclick="window.__cart.proceed()" style="width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;transition:background 0.2s;letter-spacing:0.3px;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">Zakaz berish →</button>
  </div>
</div>`;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);

    // Cart icon in navbar
    const authWrap = document.getElementById('authLangWrap');
    if (authWrap) {
      const btn = document.createElement('button');
      btn.id = 'cart-nav-btn';
      btn.onclick = openCart;
      btn.title = 'Savatcha';
      btn.style.cssText = 'position:relative;background:none;border:none;cursor:pointer;padding:6px 8px;display:flex;align-items:center;color:#0f172a;';
      btn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <span id="cart-badge" style="display:none;position:absolute;top:0;right:0;background:#ef4444;color:#fff;font-size:10px;font-weight:700;min-width:16px;height:16px;border-radius:8px;padding:0 3px;align-items:center;justify-content:center;line-height:1;"></span>`;
      authWrap.insertBefore(btn, authWrap.firstChild);
    }

    renderCartBadge();
    renderCart();
  }

  function interceptPricingClicks() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[data-cart-item]');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      addToCart({
        name: link.dataset.cartName || 'Xizmat',
        price: link.dataset.cartPrice || '',
        service: link.dataset.cartService || '',
        href: link.href
      });
    });
  }

  window.__cart = {
    add: addToCart,
    remove: removeFromCart,
    increment: incrementQty,
    decrement: decrementQty,
    open: openCart,
    close: closeCart,
    proceed: proceedToOrder
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectUI(); interceptPricingClicks(); });
  } else {
    injectUI(); interceptPricingClicks();
  }
})();
