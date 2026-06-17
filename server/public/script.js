// Mobile menu open/close
const openMenu = document.getElementById('openMenu');
const closeMenu = document.getElementById('closeMenu');
const mobileMenu = document.getElementById('mobileMenu');

openMenu.addEventListener('click', () => {
    mobileMenu.classList.remove('h-0');
    mobileMenu.classList.add('h-92');
});

closeMenu.addEventListener('click', () => {
    mobileMenu.classList.remove('h-92');
    mobileMenu.classList.add('h-0');
});

// Dynamic website content: Team section
async function loadTeamSection() {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/site/team', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    const team = json?.team || {};
    const members = Array.isArray(team.members) ? team.members : [];
    const softMembers = Array.isArray(team.softScienceBoard) ? team.softScienceBoard : [];
    const hardMembers = Array.isArray(team.hardScienceBoard) ? team.hardScienceBoard : [];

    const fillMarquee = (gridEl, list) => {
      if (!gridEl || !gridEl.querySelector) return;
      const setA = gridEl.querySelector('[data-team-set="a"]');
      const setB = gridEl.querySelector('[data-team-set="b"]');
      const html = (list || []).map((m) => {
        const name = (m && m.name) ? String(m.name) : '';
        const role = (m && m.role) ? String(m.role) : '';
        const desc = (m && m.description) ? String(m.description) : '';
        const imageUrl = (m && m.imageUrl) ? String(m.imageUrl) : '';
        const safeName = escapeHtml(name || '');
        const safeRole = escapeHtml(role || '');
        const safeDesc = escapeHtml(desc || '');
        const safeImg = escapeHtml(imageUrl || '');
        return `
<div class="ose-electric-card">
  <div class="ose-electric-inner group relative overflow-hidden">
    <img src="${safeImg}" alt="${safeName}" class="team-img transition-transform duration-500 group-hover:scale-110" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=600'" />
    <h3 class="team-name">${safeName || 'Untitled'}</h3>
    <p class="team-role">${safeRole}</p>
    ${safeDesc ? `<div class="absolute inset-0 bg-black/80 flex items-center justify-center p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm text-center overflow-y-auto backdrop-blur-sm" style="z-index: 10;"><p class="leading-relaxed" style="font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${safeDesc}</p></div>` : ''}
  </div>
</div>`;
      }).join('');
      if (setA && setB) {
        setA.innerHTML = html;
        setB.innerHTML = html;
      } else {
        // Fallback: if markup structure differs, just duplicate content
        gridEl.innerHTML = html + html;
      }
    };

    // Fill main team marquee
    fillMarquee(grid, members);
    const mainSection = grid.closest('section');
    if (mainSection) {
      mainSection.style.display = members.length ? '' : 'none';
    }

    // Boards (optional)
    const softGrid = document.getElementById('softScienceBoardGrid');
    if (softGrid) {
      fillMarquee(softGrid, softMembers);
      const softSection = softGrid.closest('section');
      if (softSection) {
        softSection.style.display = softMembers.length ? '' : 'none';
      }
    }

    const hardGrid = document.getElementById('hardScienceBoardGrid');
    if (hardGrid) {
      fillMarquee(hardGrid, hardMembers);
      const hardSection = hardGrid.closest('section');
      if (hardSection) {
        hardSection.style.display = hardMembers.length ? '' : 'none';
      }
    }
  } catch (e) {
    // ignore
  }
}

// Dynamic website content: Video section
function toYouTubeEmbedUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    // If already embed URL
    if (/youtube\.com\/embed\//i.test(raw)) return raw;
    const u = new URL(raw);
    // youtu.be/<id>
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '').trim();
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    // youtube.com/watch?v=<id>
    const v = u.searchParams.get('v');
    if (v) return `https://www.youtube.com/embed/${v}?rel=0`;
    // youtube.com/shorts/<id>
    const parts = u.pathname.split('/').filter(Boolean);
    const shortsIdx = parts.indexOf('shorts');
    if (shortsIdx !== -1 && parts[shortsIdx + 1]) {
      return `https://www.youtube.com/embed/${parts[shortsIdx + 1]}?rel=0`;
    }
  } catch (e) {
    // ignore
  }
  return '';
}

async function loadVideoSection() {
  const host = document.getElementById('videoPlayer');
  if (!host) return;

  try {
    const res = await fetch('/api/site/video', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    const video = json?.video || {};
    const mode = String(video?.mode || 'youtube').toLowerCase() === 'file' ? 'file' : 'youtube';
    const youtubeUrl = String(video?.youtubeUrl || '');
    const fileUrl = String(video?.fileUrl || '');

    if (mode === 'file' && fileUrl) {
      const src = fileUrl.replace(/"/g, '&quot;');
      host.innerHTML = `
        <video class="absolute inset-0 w-full h-full object-cover" controls playsinline preload="metadata" src="${src}"></video>
      `;
      return;
    }

    const embed = toYouTubeEmbedUrl(youtubeUrl);
    if (embed) {
      const src = embed.replace(/"/g, '&quot;');
      host.innerHTML = `
        <iframe
          class="absolute inset-0 w-full h-full"
          src="${src}"
          title="YouTube video"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      `;
      return;
    }

    host.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">Video not configured yet.</div>`;
  } catch (e) {
    host.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">Could not load video.</div>`;
  }
}



// Dynamic website content: Testimonials section (3 languages)
let __testimonialsData = null;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCurrentLang() {
  try {
    if (window.__i18n && typeof window.__i18n.getLang === 'function') return window.__i18n.getLang();
  } catch (e) {}
  const l = (localStorage.getItem('ose_lang') || '').toLowerCase();
  return (l === 'uz' || l === 'ru' || l === 'en') ? l : 'uz';
}

function starSvg(fill = '#FB923C') {
  // fill defaults to orange; for highlighted (orange) cards we pass white to match the original design
  return `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.2792 1.65876C10.5567 1.0556 11.4433 1.0556 11.7208 1.65876L13.7063 5.97412C13.8173 6.21551 14.0457 6.38135 14.3089 6.41285L19.0104 6.97542C19.6673 7.05407 19.931 7.86591 19.4452 8.3171L15.9701 11.544C15.7756 11.7247 15.6884 11.9987 15.7401 12.2624L16.6625 16.9704C16.7914 17.6283 16.0741 18.1494 15.4974 17.8249L11.3693 15.5006C11.1382 15.3705 10.8618 15.3705 10.6307 15.5006L6.5026 17.8249C5.92594 18.1494 5.20857 17.6283 5.33755 16.9704L6.25986 12.2624C6.31155 11.9987 6.22439 11.7247 6.02994 11.544L2.55482 8.3171C2.06903 7.86591 2.33274 7.05407 2.98964 6.97542L7.69113 6.41285C7.9543 6.38135 8.1827 6.21551 8.29375 5.97412L10.2792 1.65876Z" fill="${fill}"/>
    </svg>`;
}

function renderTestimonials() {
  const host = document.getElementById('testimonialsCards');
  if (!host || !__testimonialsData) return;

  // Ensure layout is consistent even if some Tailwind utility classes are missing in precompiled CSS.
  host.style.display = 'flex';
  host.style.flexWrap = 'wrap';
  host.style.gap = '32px';
  host.style.alignItems = 'center';
  host.style.justifyContent = 'center';

  const lang = getCurrentLang();
  const pack = (__testimonialsData && (__testimonialsData[lang] || __testimonialsData.uz || __testimonialsData.en || {})) || {};

  const titleEl = document.getElementById('testimonialsTitle');
  const subEl = document.getElementById('testimonialsSubtitle');

  if (titleEl && pack.title) titleEl.textContent = pack.title;
  if (subEl && pack.subtitle) subEl.textContent = pack.subtitle;

  const items = Array.isArray(pack.items) ? pack.items : [];
  const section = host.closest('section');
  if (!items.length) {
    host.innerHTML = '';
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  host.innerHTML = items
    .slice(0, 6)
    .map((it) => {
      const name = escapeHtml(it?.name);
      const username = escapeHtml(it?.username);
      const text = escapeHtml(it?.text);
      const avatarUrl = escapeHtml(it?.avatarUrl);
      const rating = Math.max(1, Math.min(5, Number(it?.rating || 5)));
      const highlight = !!it?.highlight;

      // IMPORTANT: this section is rendered dynamically, so relying on Tailwind classes can break if
      // the precompiled CSS doesn't include them. Use inline styles for the critical layout so the
      // cards always match the original design (3 cards per row, small avatars).

      const bgColor = highlight ? '#F97316' : '#FFFFFF';
      const cardText = highlight ? '#FFFFFF' : '#18181B';
      const bodyText = highlight ? 'rgba(255,255,255,0.92)' : '#52525B';
      const userText = highlight ? 'rgba(255,255,255,0.85)' : '#71717A';

      const starFill = highlight ? '#FFFFFF' : '#FB923C';
      const stars = Array.from({ length: rating }).map(() => starSvg(starFill)).join('');

      return `
        <div
          class="ose-testimonial-card"
          style="width:320px;max-width:100%;padding:24px;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,0.08);background:${bgColor};color:${cardText};"
        >
          <div style="display:flex;align-items:center;gap:4px;">${stars}</div>
          <p style="margin-top:16px;line-height:1.75;color:${bodyText};font-size:16px;">${text}</p>
          <div style="display:flex;align-items:center;gap:12px;margin-top:18px;">
            <img
              src="${avatarUrl}"
              alt="${name}"
              loading="lazy"
              style="width:40px;height:40px;border-radius:9999px;object-fit:cover;flex:0 0 auto;"
            />
            <div style="line-height:1.1;">
              <div style="font-weight:600;font-size:16px;">${name}</div>
              <div style="margin-top:4px;font-size:14px;color:${userText};">${username}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function loadTestimonialsSection() {
  const host = document.getElementById('testimonialsCards');
  if (!host) return;
  try {
    const res = await fetch('/api/site/testimonials', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    __testimonialsData = json?.testimonials || null;
    renderTestimonials();
  } catch (e) {
    // ignore
  }
}



// -------------------- Pricing (3-lang CMS) --------------------
let __pricingData = null;
let __pricingBilling = 'monthly';

function setBillingUI() {
  const mBtn = document.getElementById('pricingMonthlyBtn');
  const yBtn = document.getElementById('pricingYearlyBtn');
  if (!mBtn || !yBtn) return;

  if (__pricingBilling === 'monthly') {
    mBtn.classList.add('bg-orange-500','text-white');
    mBtn.classList.remove('text-orange-500');
    yBtn.classList.remove('bg-orange-500','text-white');
    yBtn.classList.add('text-orange-500');
  } else {
    yBtn.classList.add('bg-orange-500','text-white');
    yBtn.classList.remove('text-orange-500');
    mBtn.classList.remove('bg-orange-500','text-white');
    mBtn.classList.add('text-orange-500');
  }
}

function applyText(el, value) {
  if (!el) return;
  el.textContent = value ?? '';
}

function applyFeature(key, idx, value) {
  const el = document.querySelector(`[data-i18n="${key}_f${idx}"]`);
  if (!el) return;
  const row = el.closest('.flex.items-center.gap-2') || el.parentElement;
  if (!value) {
    if (row) row.style.display = 'none';
    return;
  }
  if (row) row.style.display = '';
  el.textContent = value;
}

function renderPricing() {
  if (!__pricingData) return;

  const lang = (window.__i18n && typeof window.__i18n.getLang === 'function' ? window.__i18n.getLang() : 'en');
  const pack = __pricingData?.[lang] || __pricingData?.en || null;
  if (!pack) return;

  applyText(document.querySelector('[data-i18n="pricing_title"]'), pack.title);
  applyText(document.querySelector('[data-i18n="pricing_desc"]'), pack.subtitle);
  applyText(document.querySelector('[data-i18n="pricing_billing_monthly"]'), pack.billingMonthly);
  applyText(document.querySelector('[data-i18n="pricing_billing_yearly"]'), pack.billingYearly);
  applyText(document.querySelector('[data-i18n="pricing_discount_badge"]'), pack.discountBadge);

  const cardsWrap = document.getElementById('pricingCards');
  const isEditing = __pricingBilling === 'yearly';
  const plans = isEditing 
    ? (Array.isArray(pack.editingPlans) ? pack.editingPlans : [])
    : (Array.isArray(pack.plans) ? pack.plans : []);

  if (cardsWrap) {
    const section = cardsWrap.closest('section');
    if (!plans.length) {
      cardsWrap.innerHTML = '';
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    const checkSvg = `\
<svg aria-hidden="true" class="lucide lucide-check size-4 text-orange-500" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">\
  <path d="M20 6 9 17l-5-5"></path>
</svg>`;

    const getPrice = (p) => {
      return isEditing ? (p.priceYearly || p.priceMonthly) : (p.priceMonthly || p.priceYearly);
    };

    const safe = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c] || c);

    // Set inline styles on the container to bypass Tailwind compilation issues
    cardsWrap.style.display = 'flex';
    cardsWrap.style.flexWrap = 'wrap';
    cardsWrap.style.alignItems = 'stretch';
    cardsWrap.style.justifyContent = 'center';
    cardsWrap.style.gap = '2rem';
    cardsWrap.style.maxWidth = '72rem';
    cardsWrap.style.marginLeft = 'auto';
    cardsWrap.style.marginRight = 'auto';
    cardsWrap.style.marginTop = '3rem';

    cardsWrap.innerHTML = plans.map((p, idx) => {
      const feats = Array.isArray(p.features) ? p.features : [];
      let href = p.ctaHref ? String(p.ctaHref).trim() : '#';
      const cartAttrs = `data-cart-item="1" data-cart-name="${safe(p.name)}" data-cart-price="${safe(getPrice(p))}" data-cart-service="${safe((p.ctaHref||'').split('service=')[1]||p.key||'')}"`;

      const checkSvgBlue = `
<svg aria-hidden="true" class="lucide lucide-check flex-shrink-0" style="width:16px; height:16px; color:#2563eb;" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 6 9 17l-5-5"></path>
</svg>`;

      let cardHtml = '';

      if (isEditing) {
          // Render 3 Editing plans
          if (idx === 0) {
              // Premium Editing Plus
              cardHtml = `
<div class="relative p-6 pb-8 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col" style="flex: 1 1 300px; min-width: 300px; max-width: 384px; display: flex; flex-direction: column;">
  <h3 class="text-2xl font-bold text-gray-900 mt-2 mb-4">${safe(p.name)}</h3>
  <p class="text-gray-600 text-sm mb-6 leading-relaxed">${safe(p.description)}</p>
  <div style="flex:1; margin-bottom:1.5rem;">
    <div class="space-y-4">
      ${feats.map((f) => `<div class="flex items-start gap-3">${checkSvgBlue}<p class="text-gray-700 text-sm leading-snug"><span>${safe(f)}</span></p></div>`).join('')}
    </div>
  </div>
  <a class="block w-full text-center py-3 rounded-full text-blue-600 bg-white border border-blue-600 font-medium hover:bg-blue-50 transition" href="${safe(href)}" ${cartAttrs}><span>${safe(p.ctaLabel)}</span></a>
</div>`;
          } else if (idx === 1) {
              // Premium Editing (Featured with blue pill badge)
              cardHtml = `
<div class="relative p-6 pb-8 rounded-xl border-2 bg-white flex flex-col" style="flex: 1 1 300px; min-width: 300px; max-width: 384px; display: flex; flex-direction: column; border-color: #2563eb; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.15), 0 4px 6px -2px rgba(37, 99, 235, 0.1);">
  <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full flex items-center gap-1 shadow" style="background-color: #2563eb; white-space: nowrap;">
      ✦ MOST POPULAR ✦
  </div>
  <h3 class="text-2xl font-bold text-gray-900 mt-2 mb-4">${safe(p.name)}</h3>
  <p class="text-gray-600 text-sm mb-6 leading-relaxed">${safe(p.description)}</p>
  <div style="flex:1; margin-bottom:1.5rem;">
    <div class="space-y-4">
      ${feats.map((f) => `<div class="flex items-start gap-3">${checkSvgBlue}<p class="text-gray-700 text-sm leading-snug"><span>${safe(f)}</span></p></div>`).join('')}
    </div>
  </div>
  <a class="block w-full text-center py-3 rounded-full text-white bg-blue-700 font-medium hover:bg-blue-800 transition" href="${safe(href)}" style="background-color: #1d4ed8;" ${cartAttrs}><span>${safe(p.ctaLabel)}</span></a>
  <div class="text-center mt-3">
      <a href="#" class="text-blue-600 font-medium text-sm hover:underline">View Sample</a>
  </div>
</div>`;
          } else {
              // Advanced Editing
              cardHtml = `
<div class="relative p-6 pb-8 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col" style="flex: 1 1 300px; min-width: 300px; max-width: 384px; display: flex; flex-direction: column;">
  <h3 class="text-2xl font-bold text-gray-900 mt-2 mb-4">${safe(p.name)}</h3>
  <p class="text-gray-600 text-sm mb-6 leading-relaxed">${safe(p.description)}</p>
  <div style="flex:1; margin-bottom:1.5rem;">
    <div class="space-y-4">
      ${feats.map((f) => `<div class="flex items-start gap-3">${checkSvgBlue}<p class="text-gray-700 text-sm leading-snug"><span>${safe(f)}</span></p></div>`).join('')}
    </div>
  </div>
  <a class="block w-full text-center py-3 rounded-full text-blue-600 bg-white border border-blue-600 font-medium hover:bg-blue-50 transition" href="${safe(href)}" ${cartAttrs}><span>${safe(p.ctaLabel)}</span></a>
</div>`;
          }
      } else {
          // Render 3 Data Analysis plans
          if (idx === 0) {
              // Rapid Statistical Review
              cardHtml = `
<div class="relative p-6 pb-8 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col" style="flex: 1 1 300px; min-width: 300px; max-width: 384px; display: flex; flex-direction: column;">
  <h3 class="text-2xl font-bold text-gray-900 mt-2 mb-6">${safe(p.name)}</h3>
  <div class="flex items-center gap-2 mb-4">
    <div class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-orange-100 text-orange-600" style="background-color: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 0.375rem;">
      <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l5-5c.94-.94.94-2.48 0-3.42L12 2Z"></path>
        <path d="M6 8h.01"></path>
      </svg>
    </div>
    <span class="text-xs font-bold text-gray-900 uppercase tracking-wide">QUALITATIVE REVIEW ON A QUICK TIMELINE</span>
  </div>
  <p class="text-gray-700 text-sm mb-8 leading-relaxed"><span class="font-bold text-gray-900">When to use:</span> When you want an expert to help you correct misses and errors in statistical methods and reporting before journal submission</p>
  
  <div class="mt-auto">
      <a class="block w-full text-center py-3 rounded-full text-blue-600 bg-white border border-blue-600 font-medium hover:bg-blue-50 transition" href="${safe(href)}" ${cartAttrs}><span>${safe(p.ctaLabel)}</span></a>
      <div class="text-center mt-3 mb-6">
          <a href="#" class="text-blue-600 font-medium text-sm hover:underline">View Sample</a>
      </div>
      <div class="space-y-4">
        ${feats.map((f) => `<div class="flex items-start gap-3">${checkSvgBlue}<p class="text-gray-700 text-sm leading-snug"><span>${safe(f)}</span></p></div>`).join('')}
      </div>
  </div>
</div>`;
          } else if (idx === 1) {
              // Inferential Statistical Analysis
              cardHtml = `
<div class="relative p-6 pb-8 rounded-xl border-2 bg-white flex flex-col" style="flex: 1 1 300px; min-width: 300px; max-width: 384px; display: flex; flex-direction: column; border-color: #2563eb; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.15), 0 4px 6px -2px rgba(37, 99, 235, 0.1);">
  <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full flex items-center gap-1 shadow" style="background-color: #2563eb; white-space: nowrap;">
      ✦ MOST POPULAR ✦
  </div>
  <h3 class="text-2xl font-bold text-gray-900 mt-4 mb-6">${safe(p.name)}</h3>
  <div class="flex items-center gap-2 mb-4">
    <div class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-blue-100 text-blue-600" style="background-color: #dbeafe; color: #2563eb; display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 0.375rem;">
      <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"></path>
        <path d="M3 20h18"></path>
      </svg>
    </div>
    <span class="text-xs font-bold text-gray-900 uppercase tracking-wide bg-blue-100 px-1 py-0.5">STATS EXPERT IN SPSS, R AND STATA.</span>
  </div>
  <p class="text-gray-700 text-sm mb-8 leading-relaxed"><span class="font-bold text-gray-900">When to use:</span> When you want an expert to analyze your data and draw inferences that best answer your research questions</p>
  
  <div class="mt-auto">
      <a class="block w-full text-center py-3 rounded-full text-white bg-blue-700 font-medium hover:bg-blue-800 transition mb-6" href="${safe(href)}" style="background-color: #1d4ed8;" ${cartAttrs}><span>${safe(p.ctaLabel)}</span></a>
      <div class="space-y-4">
        ${feats.map((f) => `<div class="flex items-start gap-3">${checkSvgBlue}<p class="text-gray-700 text-sm leading-snug"><span>${safe(f)}</span></p></div>`).join('')}
      </div>
  </div>
</div>`;
          } else {
              // Custom Statistical Support
              cardHtml = `
<div class="relative p-6 pb-8 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col" style="flex: 1 1 300px; min-width: 300px; max-width: 384px; display: flex; flex-direction: column;">
  <h3 class="text-2xl font-bold text-gray-900 mt-2 mb-6">${safe(p.name)}</h3>
  <div class="flex items-center gap-2 mb-4">
    <div class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-yellow-100 text-yellow-600" style="background-color: #fef9c3; color: #ca8a04; display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 0.375rem;">
      <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
      </svg>
    </div>
    <span class="text-xs font-bold text-gray-900 uppercase tracking-wide">TAILORED FOR YOUR CUSTOM NEEDS</span>
  </div>
  <p class="text-gray-700 text-sm mb-8 leading-relaxed"><span class="font-bold text-gray-900">When to use:</span> When you are unsure of the exact service that may help you report statistics with rigor and/or you have a custom need</p>
  
  <div class="mt-auto">
      <a class="block w-full text-center py-3 rounded-full text-blue-600 bg-white border border-blue-600 font-medium hover:bg-blue-50 transition mb-6" href="${safe(href)}" ${cartAttrs}><span>${safe(p.ctaLabel)}</span></a>
      <div class="space-y-4">
        ${feats.map((f) => `<div class="flex items-start gap-3">${checkSvgBlue}<p class="text-gray-700 text-sm leading-snug"><span>${safe(f)}</span></p></div>`).join('')}
      </div>
  </div>
</div>`;
          }
      }

      return cardHtml;
    }).join('');
  }

  setBillingUI();
}

async function loadPricingSection() {
  try {
    const res = await fetch('/api/site/pricing', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    __pricingData = json?.pricing || null;

    // attach toggle handlers once
    const mBtn = document.getElementById('pricingMonthlyBtn');
    const yBtn = document.getElementById('pricingYearlyBtn');
    if (mBtn && !mBtn.__oseBound) {
      mBtn.__oseBound = true;
      mBtn.addEventListener('click', () => { __pricingBilling = 'monthly'; renderPricing(); });
    }
    if (yBtn && !yBtn.__oseBound) {
      yBtn.__oseBound = true;
      yBtn.addEventListener('click', () => { __pricingBilling = 'yearly'; renderPricing(); });
    }

    renderPricing();
  } catch (e) {
    // ignore
  }
}


// -------------------- Core Features (3-lang CMS) --------------------
let __featuresData = null;

function renderFeatures() {
  const wrap = document.getElementById('featuresCards');
  if (!wrap) return;

  if (!__featuresData) {
    wrap.innerHTML = '';
    return;
  }

  const lang = getCurrentLang();
  const pack = (__featuresData?.[lang] || __featuresData?.uz || __featuresData?.en || {}) || {};

  const tEl = document.getElementById('featuresTitle');
  const sEl = document.getElementById('featuresSubtitle');
  const ctaTextEl = document.getElementById('featuresCtaText');
  const ctaBtnEl = document.getElementById('featuresCtaBtn');
  const ctaBtnText = document.getElementById('featuresCtaBtnText');

  if (tEl && typeof pack.title === 'string' && pack.title.trim()) tEl.textContent = pack.title;
  if (sEl && typeof pack.subtitle === 'string' && pack.subtitle.trim()) sEl.textContent = pack.subtitle;
  if (ctaTextEl && typeof pack.ctaText === 'string' && pack.ctaText.trim()) ctaTextEl.textContent = pack.ctaText;
  if (ctaBtnText && typeof pack.ctaButtonLabel === 'string' && pack.ctaButtonLabel.trim()) ctaBtnText.textContent = pack.ctaButtonLabel;

  // keep button text visible even if href is empty
  if (ctaBtnEl) {
    const href = (typeof pack.ctaButtonHref === 'string' ? pack.ctaButtonHref.trim() : '') || '#';
    ctaBtnEl.setAttribute('href', href);
    ctaBtnEl.setAttribute('rel', 'noopener');
  }

  const items = Array.isArray(pack.items) ? pack.items : [];
  const section = wrap.closest('section');
  if (!items.length) {
    wrap.innerHTML = '';
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  const palette = [
    {
      bg: 'bg-orange-100',
      iconBg: 'bg-orange-500',
      icon: `<svg aria-hidden=\"true\" fill=\"none\" height=\"24\" width=\"24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 8V4H8\"/><rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"2\"/><path d=\"M2 14h2\"/><path d=\"M20 14h2\"/><path d=\"M15 13v2\"/><path d=\"M9 13v2\"/></svg>`,
    },
    {
      bg: 'bg-green-100',
      iconBg: 'bg-green-500',
      icon: `<svg aria-hidden=\"true\" fill=\"none\" height=\"24\" width=\"24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"3\" y=\"3\" width=\"8\" height=\"8\" rx=\"2\"/><path d=\"M7 11v4a2 2 0 0 0 2 2h4\"/><rect x=\"13\" y=\"13\" width=\"8\" height=\"8\" rx=\"2\"/></svg>`,
    },
    {
      bg: 'bg-blue-100',
      iconBg: 'bg-blue-500',
      icon: `<svg aria-hidden=\"true\" fill=\"none\" height=\"24\" width=\"24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"m13 2-2 2.5h3L12 7\"/><path d=\"M10 14v-3\"/><path d=\"M14 14v-3\"/><path d=\"M7 14h10\"/><path d=\"M8 14v5a4 4 0 0 0 8 0v-5\"/><path d=\"M12 19v3\"/></svg>`,
    },
    {
      bg: 'bg-pink-100',
      iconBg: 'bg-pink-500',
      icon: `<svg aria-hidden=\"true\" fill=\"none\" height=\"24\" width=\"24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z\"/><path d=\"m9 12 2 2 4-4\"/></svg>`,
    },
  ];

  wrap.innerHTML = items.map((it, i) => {
    const p = palette[i % palette.length];
    return `
      <div class=\"flex flex-col items-start p-6 rounded-3xl ${p.bg}\">
        <div class=\"${p.iconBg} shadow-[inset_0_4px_4px_rgba(255,255,255,0.25),0_4px_10px_rgba(0,0,0,0.15)] p-2 aspect-square rounded-xl text-white\">
          ${p.icon}
        </div>
        <h3 class=\"mt-4 font-semibold text-lg\">${escapeHtml(it?.title || '')}</h3>
        <p class=\"mt-2 text-zinc-500 text-base/7\">${escapeHtml(it?.description || '')}</p>
      </div>`;
  }).join('');
}

async function loadFeaturesSection() {
  try {
    const res = await fetch('/api/site/features', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    __featuresData = json?.features || null;
    renderFeatures();
  } catch (e) {
    // ignore
  }
}



// -------------------- FAQ (3-lang CMS) --------------------
let __faqData = null;

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFaq() {
  const listEl = document.getElementById('faqList');
  if (!listEl) return;

  if (!__faqData) return; // keep fallback HTML

  const lang = getCurrentLang();
  const pack = (__faqData?.[lang] || __faqData?.uz || __faqData?.en || {}) || {};
  const items = Array.isArray(pack.items) ? pack.items : [];

  const titleEl = document.getElementById('faqTitle');
  const descEl = document.getElementById('faqDesc');
  const ctaTitleEl = document.getElementById('faqCtaTitle');
  const ctaBtnEl = document.getElementById('faqCtaBtn');

  if (titleEl && pack.title) titleEl.textContent = pack.title;
  if (descEl && pack.subtitle) descEl.textContent = pack.subtitle;

  if (ctaTitleEl && pack.ctaTitle) ctaTitleEl.textContent = pack.ctaTitle;
  if (ctaBtnEl) {
    if (pack.ctaButtonLabel) ctaBtnEl.textContent = pack.ctaButtonLabel;
    if (pack.ctaButtonHref) ctaBtnEl.setAttribute('href', pack.ctaButtonHref);
  }

  if (!items.length) {
    listEl.innerHTML = '';
    const section = listEl.closest('section');
    if (section) section.style.display = 'none';
    return;
  }
  const section = listEl.closest('section');
  if (section) section.style.display = '';

  listEl.innerHTML = items.map((it, idx) => {
    const q = escapeHtml(it?.q || it?.question || '');
    const a = escapeHtml(it?.a || it?.answer || '');
    const open = idx === 0 ? ' open=""' : '';
    return `
<details class="group bg-gray-50 border border-gray-200 rounded-xl"${open}>
  <summary class="flex items-center justify-between p-6 select-none">
    <h3 class="font-medium text-base">${q}</h3>
    <svg aria-hidden="true" class="lucide lucide-chevron-down group-open:-rotate-180 transition-transform duration-200" fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  </summary>
  <p class="text-sm/6 text-zinc-500 max-w-md p-6 pt-0">${a}</p>
</details>`;
  }).join('\n');
}

async function loadFaqSection() {
  try {
    const res = await fetch('/api/site/faq', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    __faqData = json?.faq || null;
    renderFaq();
  } catch (e) {
    // ignore
  }
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadTeamSection());
  document.addEventListener('DOMContentLoaded', () => loadVideoSection());
  document.addEventListener('DOMContentLoaded', () => loadTestimonialsSection());
  document.addEventListener('DOMContentLoaded', () => loadPricingSection());
  document.addEventListener('DOMContentLoaded', () => loadFeaturesSection());
  document.addEventListener('DOMContentLoaded', () => loadFaqSection());
  window.addEventListener('ose:lang', () => { renderTestimonials(); renderPricing(); renderFeatures(); renderFaq(); });
} else {
  loadTeamSection();
  loadVideoSection();
  loadTestimonialsSection();
  loadPricingSection();
  loadFeaturesSection();
  loadFaqSection();
  window.addEventListener('ose:lang', () => { renderTestimonials(); renderPricing(); renderFeatures(); renderFaq(); });
}




// ==========================================
// AI Chat Widget Logic (Pure CSS Global)
// ==========================================
(function initAIChat() {
  if (document.getElementById('ose-ai-widget')) return;

  const styleHtml = `
    <style>
      #ose-ai-widget {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 999999;
        font-family: 'Plus Jakarta Sans', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        pointer-events: none;
      }

      /* Chat Toggle Button */
      .ose-ai-btn {
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: white;
        border: none;
        border-radius: 999px;
        padding: 14px 24px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(234, 88, 12, 0.4);
        transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        position: relative;
        overflow: hidden;
        pointer-events: auto;
      }
      .ose-ai-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(234, 88, 12, 0.5);
      }
      .ose-ai-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.7s ease;
      }
      .ose-ai-btn:hover::before {
        left: 100%;
      }

      /* Chat Window */
      .ose-ai-window {
        width: 360px;
        max-width: calc(100vw - 40px);
        height: 500px;
        max-height: calc(100vh - 100px);
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        border-radius: 24px;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        
        /* Animation */
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: bottom right;
      }
      .ose-ai-window.is-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      /* Header */
      .ose-ai-header {
        background: #fff;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .ose-ai-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ose-ai-avatar {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #fff8f1, #ffeade);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(249, 115, 22, 0.2);
      }
      .ose-ai-avatar svg {
        width: 18px; height: 18px;
        color: #ea580c;
      }
      .ose-ai-title {
        font-weight: 700;
        font-size: 15px;
        color: #0f172a;
        margin: 0;
        line-height: 1.2;
      }
      .ose-ai-status {
        font-size: 12px;
        color: #10b981;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .ose-ai-dot {
        width: 6px; height: 6px;
        background: #10b981;
        border-radius: 50%;
        animation: ose-pulse 2s infinite;
      }
      .ose-ai-close {
        background: none; border: none;
        color: #94a3b8; cursor: pointer;
        transition: color 0.2s;
        padding: 4px;
      }
      .ose-ai-close:hover { color: #0f172a; }

      /* Messages Area */
      .ose-ai-messages {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Bubbles */
      .ose-msg-row {
        display: flex;
        flex-direction: column;
      }
      .ose-msg-row.ai { align-items: flex-start; }
      .ose-msg-row.user { align-items: flex-end; }

      .ose-msg-bubble {
        max-width: 85%;
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 2px 5px rgba(0,0,0,0.02);
      }
      .ose-msg-row.ai .ose-msg-bubble {
        background: #ffffff;
        color: #334155;
        border: 1px solid rgba(0,0,0,0.04);
        border-radius: 20px 20px 20px 4px;
      }
      .ose-msg-row.user .ose-msg-bubble {
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: #ffffff;
        border-radius: 20px 20px 4px 20px;
      }

      /* Input Area */
      .ose-ai-input-area {
        background: #fff;
        padding: 16px;
        border-top: 1px solid rgba(0,0,0,0.05);
      }
      .ose-ai-form {
        display: flex;
        gap: 8px;
        align-items: center;
        background: #f1f5f9;
        padding: 6px;
        border-radius: 999px;
        border: 1px solid transparent;
        transition: border-color 0.2s;
      }
      .ose-ai-form:focus-within {
        border-color: rgba(249, 115, 22, 0.4);
        background: #fff;
      }
      .ose-ai-input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 8px 12px;
        font-size: 14px;
        outline: none;
        color: #0f172a;
      }
      .ose-ai-input::placeholder { color: #94a3b8; }
      .ose-ai-submit {
        background: #ea580c;
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
      }
      .ose-ai-submit:hover { background: #c2410c; }
      .ose-ai-submit:disabled { opacity: 0.5; cursor: not-allowed; }

      /* Typing indicator */
      .ose-typing {
        display: flex; gap: 4px;
        padding: 6px 4px;
      }
      .ose-typing-dot {
        width: 6px; height: 6px;
        background: #cbd5e1;
        border-radius: 50%;
        animation: ose-bounce 1.4s infinite ease-in-out both;
      }
      .ose-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .ose-typing-dot:nth-child(2) { animation-delay: -0.16s; }

      @keyframes ose-pulse {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      @keyframes ose-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      @media (max-width: 600px) {
        #ose-ai-widget { bottom: 20px; right: 20px; }
        .ose-ai-window { width: calc(100vw - 40px); height: 60vh; }
        .ose-ai-btn span { display: none; }
        .ose-ai-btn { padding: 14px; }
      }
    </style>
  `;

  const widgetHtml = `
    <div id="ose-ai-widget">
      <div id="ose-ai-window" class="ose-ai-window">
        <div class="ose-ai-header">
          <div class="ose-ai-header-left">
            <div class="ose-ai-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div>
              <h3 class="ose-ai-title">AI Support Assistant</h3>
              <div class="ose-ai-status">
                <div class="ose-ai-dot"></div> Online
              </div>
            </div>
          </div>
          <button id="ose-ai-close" class="ose-ai-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div id="ose-ai-messages" class="ose-ai-messages">
          <div class="ose-msg-row ai">
            <div class="ose-msg-bubble">Hello! Welcome to OpenScienceEnigma. How can I help you today?</div>
          </div>
        </div>
        <div class="ose-ai-input-area">
          <form id="ose-ai-form" class="ose-ai-form">
            <input type="text" id="ose-ai-input" class="ose-ai-input" placeholder="Type your message..." autocomplete="off">
            <button type="submit" id="ose-ai-submit" class="ose-ai-submit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      </div>
      <button id="ose-ai-toggle" class="ose-ai-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span>AI Support</span>
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', styleHtml + widgetHtml);

  const toggleBtn = document.getElementById('ose-ai-toggle');
  const chatWindow = document.getElementById('ose-ai-window');
  const closeBtn = document.getElementById('ose-ai-close');
  const form = document.getElementById('ose-ai-form');
  const input = document.getElementById('ose-ai-input');
  const messages = document.getElementById('ose-ai-messages');
  const submitBtn = document.getElementById('ose-ai-submit');

  function toggle() {
    chatWindow.classList.toggle('is-open');
    if (chatWindow.classList.contains('is-open')) input.focus();
  }

  toggleBtn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);

  function addMessage(text, isUser = false) {
    const row = document.createElement('div');
    row.className = 'ose-msg-row ' + (isUser ? 'user' : 'ai');
    row.innerHTML = `<div class="ose-msg-bubble">${escapeHtml(text)}</div>`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTyping() {
    const id = 'typ-' + Date.now();
    const row = document.createElement('div');
    row.id = id;
    row.className = 'ose-msg-row ai';
    row.innerHTML = `
      <div class="ose-msg-bubble">
        <div class="ose-typing">
          <div class="ose-typing-dot"></div>
          <div class="ose-typing-dot"></div>
          <div class="ose-typing-dot"></div>
        </div>
      </div>
    `;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return id;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, true);
    input.value = '';
    submitBtn.disabled = true;

    const typId = addTyping();

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text })
      });
      const data = await res.json();
      document.getElementById(typId)?.remove();
      if (data.error) addMessage(data.error);
      else addMessage(data.answer || 'Something went wrong.');
    } catch (err) {
      document.getElementById(typId)?.remove();
      addMessage('Network error. Try again.');
    } finally {
      submitBtn.disabled = false;
      input.focus();
    }
  });

  // Escape HTML helper if not exists
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
})();
