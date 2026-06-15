
// Injected FAQ CMS editor (vanilla) - no build step required
const ROUTE_MATCH = () => (window.location.pathname || '').includes('/admindashboard/website');

function getAdminId() {
  const keys = ['admin_id','adminId','ose_admin_id','oseAdminId'];
  for (const k of keys) {
    const v = window.localStorage?.getItem?.(k);
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function el(tag, attrs={}, children=[]) {
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs||{})) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, String(v));
  }
  for (const c of children) n.append(c);
  return n;
}

async function apiGet() {
  const res = await fetch('/api/site/faq', { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  return json?.faq || { en:{}, ru:{}, uz:{} };
}

async function apiSave(faq) {
  const body = JSON.stringify({ admin_id: getAdminId(), faq });
  const res = await fetch('/api/site/faq', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Save failed');
  return json?.faq || faq;
}

function normalizeLangPack(p) {
  return {
    title: String(p?.title || ''),
    subtitle: String(p?.subtitle || ''),
    ctaTitle: String(p?.ctaTitle || p?.ctaText || ''),
    ctaButtonLabel: String(p?.ctaButtonLabel || ''),
    ctaButtonHref: String(p?.ctaButtonHref || ''),
    items: Array.isArray(p?.items) ? p.items.map(x => ({ q: String(x?.q||x?.question||''), a: String(x?.a||x?.answer||'') })) : []
  };
}

function createModal() {
  const overlay = el('div', { class: 'ose-faq-overlay', style: `
    position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:99999;
    display:none; align-items:center; justify-content:center; padding:18px;
  `});

  const card = el('div', { class: 'ose-faq-card', style: `
    width:min(980px, 100%); max-height:90vh; overflow:auto;
    background:#fff; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.25);
    padding:16px;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  `});

  const header = el('div', { style: 'display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;' }, [
    el('div', {}, [
      el('div', { style: 'font-weight:700; font-size:16px;' }, [document.createTextNode('FAQ / Got questions (UZ • RU • EN)')]),
      el('div', { style: 'color:#6b7280; font-size:12px; margin-top:2px;' }, [document.createTextNode('Add / delete questions and save. Website updates immediately on refresh.')])
    ]),
    el('button', { type:'button', style: `
      border:1px solid #e5e7eb; background:#fff; padding:8px 10px; border-radius:10px; cursor:pointer;
    `, onclick: () => { overlay.style.display='none'; }}, [document.createTextNode('Close')])
  ]);

  const tabs = el('div', { style: 'display:flex; gap:8px; margin: 8px 0 12px;' });
  const content = el('div', {});
  const footer = el('div', { style:'display:flex; justify-content:flex-end; gap:10px; margin-top:12px; align-items:center;' });

  const msg = el('div', { style:'margin-right:auto; color:#6b7280; font-size:12px;' });
  const btnSave = el('button', { type:'button', style: `
    background:#111827; color:#fff; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;
  `}, [document.createTextNode('Save')]);
  const btnReload = el('button', { type:'button', style: `
    background:#fff; border:1px solid #e5e7eb; padding:10px 14px; border-radius:10px; cursor:pointer;
  `}, [document.createTextNode('Reload')]);

  footer.append(msg, btnReload, btnSave);

  card.append(header, tabs, content, footer);
  overlay.append(card);
  document.body.append(overlay);

  const state = {
    faq: { en:{}, ru:{}, uz:{} },
    lang: 'en',
    loading: false
  };

  function setMsg(t, ok=true) {
    msg.textContent = t || '';
    msg.style.color = ok ? '#6b7280' : '#b91c1c';
  }

  function renderLangUI() {
    content.innerHTML = '';
    const pack = state.faq[state.lang];

    const topGrid = el('div', { style:'display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;' });

    function inputRow(label, key, placeholder='') {
      const inp = el('input', { value: pack[key] || '', placeholder, style: `
        width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:10px; font-size:13px;
      `});
      inp.addEventListener('input', () => { pack[key] = inp.value; });
      return el('div', {}, [
        el('div', { style:'font-size:12px; color:#6b7280; margin-bottom:6px;' }, [document.createTextNode(label)]),
        inp
      ]);
    }

    topGrid.append(
      inputRow('Title', 'title', 'Got questions?'),
      inputRow('Subtitle', 'subtitle', 'Everything you need to know...')
    );

    const ctaGrid = el('div', { style:'display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:14px;' });
    ctaGrid.append(
      inputRow('CTA text (purple box)', 'ctaTitle', 'Still have questions? ...'),
      inputRow('CTA button label', 'ctaButtonLabel', 'Contact support')
    );
    const hrefRow = inputRow('CTA button link (href)', 'ctaButtonHref', 'https://...');
    hrefRow.style.gridColumn = '1 / -1';
    ctaGrid.append(hrefRow);

    const listHeader = el('div', { style:'display:flex; align-items:center; justify-content:space-between; margin: 6px 0 10px;' }, [
      el('div', { style:'font-weight:600; font-size:13px;' }, [document.createTextNode('Questions')]),
      el('button', { type:'button', style:'background:#fff; border:1px solid #e5e7eb; padding:8px 10px; border-radius:10px; cursor:pointer;',
        onclick: () => {
          pack.items.push({ q:'', a:'' });
          renderLangUI();
        }
      }, [document.createTextNode('+ Add question')])
    ]);

    const list = el('div', { style:'display:flex; flex-direction:column; gap:10px;' });

    pack.items.forEach((it, idx) => {
      const box = el('div', { style:'border:1px solid #e5e7eb; border-radius:12px; padding:10px;' });

      const rowTop = el('div', { style:'display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;' }, [
        el('div', { style:'font-size:12px; color:#6b7280;' }, [document.createTextNode(`Item #${idx+1}`)]),
        el('div', { style:'display:flex; gap:8px;' }, [
          el('button', { type:'button', style:'background:#fff; border:1px solid #e5e7eb; padding:6px 10px; border-radius:10px; cursor:pointer;',
            onclick: () => {
              if (idx>0) { const tmp = pack.items[idx-1]; pack.items[idx-1]=pack.items[idx]; pack.items[idx]=tmp; renderLangUI(); }
            }
          }, [document.createTextNode('Up')]),
          el('button', { type:'button', style:'background:#fff; border:1px solid #e5e7eb; padding:6px 10px; border-radius:10px; cursor:pointer;',
            onclick: () => {
              if (idx<pack.items.length-1) { const tmp = pack.items[idx+1]; pack.items[idx+1]=pack.items[idx]; pack.items[idx]=tmp; renderLangUI(); }
            }
          }, [document.createTextNode('Down')]),
          el('button', { type:'button', style:'background:#fff; border:1px solid #fecaca; color:#b91c1c; padding:6px 10px; border-radius:10px; cursor:pointer;',
            onclick: () => { pack.items.splice(idx,1); renderLangUI(); }
          }, [document.createTextNode('Delete')])
        ])
      ]);

      const q = el('input', { value: it.q || '', placeholder:'Question', style:'width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:10px; font-size:13px; margin-bottom:8px;' });
      q.addEventListener('input', () => { it.q = q.value; });

      const a = el('textarea', { placeholder:'Answer', style:'width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:10px; font-size:13px; min-height:90px; resize:vertical;' });
      a.value = it.a || '';
      a.addEventListener('input', () => { it.a = a.value; });

      box.append(rowTop, q, a);
      list.append(box);
    });

    content.append(topGrid, ctaGrid, listHeader, list);
  }

  function renderTabs() {
    tabs.innerHTML = '';
    const langs = [
      { k:'en', label:'EN' },
      { k:'ru', label:'RU' },
      { k:'uz', label:'UZ' },
    ];
    langs.forEach(({k,label}) => {
      const active = state.lang === k;
      const b = el('button', { type:'button', style: `
        border:1px solid ${active ? '#111827' : '#e5e7eb'};
        background:${active ? '#111827' : '#fff'};
        color:${active ? '#fff' : '#111827'};
        padding:8px 12px; border-radius:999px; cursor:pointer; font-size:12px; font-weight:600;
      `, onclick: () => { state.lang = k; renderTabs(); renderLangUI(); }}, [document.createTextNode(label)]);
      tabs.append(b);
    });
  }

  async function load() {
    try {
      setMsg('Loading…');
      const faq = await apiGet();
      state.faq = {
        en: normalizeLangPack(faq.en),
        ru: normalizeLangPack(faq.ru),
        uz: normalizeLangPack(faq.uz),
      };
      setMsg('');
      renderTabs();
      renderLangUI();
    } catch (e) {
      setMsg(String(e?.message || e), false);
    }
  }

  btnReload.addEventListener('click', load);

  btnSave.addEventListener('click', async () => {
    try {
      setMsg('Saving…');
      // trim & cleanup
      const out = {};
      for (const k of ['en','ru','uz']) {
        const p = state.faq[k];
        out[k] = {
          title: String(p.title||'').trim(),
          subtitle: String(p.subtitle||'').trim(),
          ctaTitle: String(p.ctaTitle||'').trim(),
          ctaButtonLabel: String(p.ctaButtonLabel||'').trim(),
          ctaButtonHref: String(p.ctaButtonHref||'').trim(),
          items: (Array.isArray(p.items)?p.items:[])
            .map(x => ({ q:String(x.q||'').trim(), a:String(x.a||'').trim() }))
            .filter(x => x.q && x.a)
        };
      }
      state.faq = {
        en: normalizeLangPack(out.en),
        ru: normalizeLangPack(out.ru),
        uz: normalizeLangPack(out.uz),
      };
      const saved = await apiSave(out);
      setMsg('Saved ✅ Refresh website to see changes.');
      // keep local state in sync with server cleaned output
      state.faq = {
        en: normalizeLangPack(saved.en),
        ru: normalizeLangPack(saved.ru),
        uz: normalizeLangPack(saved.uz),
      };
      renderLangUI();
    } catch (e) {
      setMsg(String(e?.message || e), false);
    }
  });

  overlay.__oseOpen = async () => {
    overlay.style.display='flex';
    state.lang = 'en';
    renderTabs();
    await load();
  };

  return overlay;
}

// Embed FAQ CMS inside the Website Editor page (bottom area) so it behaves like other sections.
// We keep the existing floating button as a fallback, but hide it when embedded.
function injectEmbeddedFAQSection() {
  if (!ROUTE_MATCH()) return false;
  if (document.getElementById('ose-faq-cms-embedded')) return true;

  const main = document.querySelector('main') || document.querySelector('#app') || document.body;

  // Try to place after the "Core features" editor card if we can find it.
  let anchor = null;
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'));
  for (const h of headings) {
    const t = (h.textContent || '').trim().toLowerCase();
    if (t === 'core features' || t.includes('core features')) {
      anchor = h;
      break;
    }
  }

  let insertAfter = null;
  if (anchor) {
    insertAfter = anchor.closest('div') || anchor.parentElement;
    // walk up to a card-like container if possible
    let cur = insertAfter;
    for (let i=0; i<6 && cur; i++) {
      const cls = String(cur.className || '');
      if (cls.includes('rounded') && (cls.includes('border') || cls.includes('shadow'))) { insertAfter = cur; break; }
      cur = cur.parentElement;
    }
  }

  const card = document.createElement('div');
  card.id = 'ose-faq-cms-embedded';
  card.className = 'mt-8 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark';
  card.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-4 py-4 dark:border-strokedark">
      <div>
        <h3 class="font-medium text-black dark:text-white">FAQ</h3>
        <p class="text-sm text-bodydark2">FAQ (chap tomondagi savol-javoblar) ni Core Features kabi tahrirlash: UZ / RU / EN, Add / Edit / Delete.</p>
      </div>
      <a class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90" href="/admindashboard/faq-cms.html" target="_blank" rel="noopener">Open full page</a>
    </div>
    <div class="p-4">
      <iframe src="/admindashboard/faq-cms.html" style="width:100%;height:900px;border:0;border-radius:14px;background:transparent;"></iframe>
    </div>
  `;

  if (insertAfter && insertAfter.parentElement) {
    // Put FAQ CMS at the bottom (same area style as Core Features)
    insertAfter.parentElement.appendChild(card);
  } else {
    (document.querySelector('main') || document.body).appendChild(card);
  }

  return true;
}


function injectEmbeddedHeroSection() {
  if (!ROUTE_MATCH()) return false;
  if (document.getElementById('ose-hero-cms-embedded')) return true;

  const main = document.querySelector('main') || document.querySelector('#app') || document.body;

  // Prefer placing AFTER the embedded FAQ card.
  const faqCard = document.getElementById('ose-faq-cms-embedded');
  let insertAfter = faqCard || null;

  // Fallback: place after the "FAQ" heading card if we can find it.
  if (!insertAfter) {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'));
    for (const h of headings) {
      const t = (h.textContent || '').trim().toLowerCase();
      if (t === 'faq' || t.includes('faq')) { insertAfter = h.closest('div') || h.parentElement; break; }
    }
  }

  const card = document.createElement('div');
  card.id = 'ose-hero-cms-embedded';
  card.className = 'mt-8 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark';
  card.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-4 py-4 dark:border-strokedark">
      <div>
        <h3 class="font-medium text-black dark:text-white">Hero section</h3>
        <p class="text-sm text-bodydark2">Hero yozuvlarini (badge / title / subtitle / CTA / stats) 3 tilda: UZ / RU / EN. Add / Edit / Delete.</p>
      </div>
      <a class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-center font-medium text-white hover:bg-opacity-90" href="/admindashboard/hero-cms.html" target="_blank" rel="noopener">Open full page</a>
    </div>
    <div class="p-4">
      <iframe src="/admindashboard/hero-cms.html" style="width:100%;height:1150px;border:0;border-radius:14px;background:transparent;"></iframe>
    </div>
  `;

  if (insertAfter && insertAfter.parentElement) {
    insertAfter.parentElement.appendChild(card);
  } else {
    main.appendChild(card);
  }

  return true;
}


function init() {
  const btn = el('button', { type:'button', style: `
    position:fixed; right:18px; bottom:18px; z-index:99998;
    background:#7c3aed; color:#fff; border:none; padding:10px 12px;
    border-radius:999px; box-shadow: 0 12px 30px rgba(0,0,0,.22);
    font-weight:700; cursor:pointer; font-size:12px;
  `}, [document.createTextNode('FAQ CMS')]);

  const modal = createModal();

  btn.addEventListener('click', () => modal.__oseOpen());
  document.body.append(btn);

  // Prefer embedding FAQ CMS at the bottom of the Website Editor page.
  // Keep the floating button only as a fallback.
  const updateVis = () => {
    if (!ROUTE_MATCH()) {
      btn.style.display = 'none';
      const embedded = document.getElementById('ose-faq-cms-embedded');
      if (embedded && embedded.parentElement) embedded.parentElement.removeChild(embedded);
      const heroEmbedded = document.getElementById('ose-hero-cms-embedded');
      if (heroEmbedded && heroEmbedded.parentElement) heroEmbedded.parentElement.removeChild(heroEmbedded);
      return;
    }
    const embeddedOk = injectEmbeddedFAQSection();
    const heroOk = injectEmbeddedHeroSection();
    btn.style.display = (embeddedOk && heroOk) ? 'none' : 'inline-flex';
  };
  updateVis();

  // Website editor is an SPA; retry a few times during first load, then keep a light interval.
  let tries = 0;
  const boot = setInterval(() => {
    updateVis();
    tries += 1;
    if (tries >= 20) clearInterval(boot); // ~16s
  }, 800);

  setInterval(updateVis, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
