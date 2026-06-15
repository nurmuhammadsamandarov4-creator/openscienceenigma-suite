// ╔══════════════════════════════════════════════════════════════╗
// ║          OSE Premium Visual Editor  v3.0                    ║
// ║          Modern glassmorphic dark-mode content editor       ║
// ╚══════════════════════════════════════════════════════════════╝

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('editMode') !== '1') return;

    if (document.getElementById('ose-editor-toolbar')) {
        console.log('[OSE Editor] Already initialized, skipping.');
        return;
    }

    // ─── Admin Auth Check ───────────────────────────────────────
    let adminId = null;
    const idKeys = ['user_id', 'admin_id', 'adminId', 'ose_admin_id', 'oseAdminId'];
    for (const key of idKeys) {
        const v = localStorage.getItem(key);
        if (v && !isNaN(Number(v)) && Number(v) > 0) { adminId = Number(v); break; }
    }
    if (!adminId) {
        try {
            const u = JSON.parse(localStorage.getItem('ose_admin_user') || 'null');
            if (u?.id) adminId = Number(u.id);
        } catch (_) {}
    }
    if (!adminId) {
        alert("Visual editordan foydalanish uchun admin bo'lib kiring.");
        window.location.href = '/public/admin-login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }

    // Verify admin silently
    fetch('/api/dashboard/' + adminId).catch(() => {});

    console.log('⚡ OSE Premium Visual Editor v3.0 Loaded');

    // ─── State ──────────────────────────────────────────────────
    let siteData = null;
    let currentLang = localStorage.getItem('ose_lang') || 'uz';
    let activeSidebarSection = null;
    const originalFetch = window.fetch;

    // ─── 1. INJECT CSS ──────────────────────────────────────────
    const style = document.createElement('style');
    style.id = 'ose-editor-styles';
    style.innerHTML = `
        /* ── Base ── */
        .editor-mode [contenteditable="true"] {
            outline: 2px dashed rgba(99, 102, 241, 0.5) !important;
            outline-offset: 3px;
            cursor: text;
            border-radius: 4px;
            transition: outline 0.2s ease, background 0.2s ease;
        }
        .editor-mode [contenteditable="true"]:hover {
            outline: 2px solid #6366f1 !important;
            background: rgba(99, 102, 241, 0.06) !important;
        }
        .editor-mode [contenteditable="true"]:focus {
            outline: 2px solid #10b981 !important;
            background: rgba(16, 185, 129, 0.05) !important;
        }
        .editor-mode a { pointer-events: none !important; }

        /* ── Floating Toolbar ── */
        #ose-editor-toolbar {
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(9, 12, 24, 0.88);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            color: #f1f5f9;
            padding: 8px 16px;
            border-radius: 9999px;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.09), 0 20px 50px rgba(0,0,0,0.55), 0 0 40px rgba(99,102,241,0.08);
            z-index: 10000000;
            display: flex;
            gap: 10px;
            align-items: center;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            font-size: 13px;
            user-select: none;
            transition: box-shadow 0.3s ease;
        }
        #ose-editor-toolbar:hover {
            box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 24px 60px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.14);
        }
        .ose-toolbar-brand {
            font-weight: 800;
            font-size: 13px;
            background: linear-gradient(135deg, #a78bfa, #6366f1, #38bdf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.3px;
            padding-right: 6px;
        }
        .ose-toolbar-divider {
            width: 1px;
            height: 20px;
            background: rgba(255,255,255,0.1);
        }
        .ose-toolbar-lang {
            background: rgba(255,255,255,0.07);
            color: #cbd5e1;
            border: 1px solid rgba(255,255,255,0.1);
            padding: 5px 10px;
            border-radius: 9999px;
            font-weight: 600;
            outline: none;
            cursor: pointer;
            font-size: 12px;
            font-family: inherit;
            transition: all 0.2s;
        }
        .ose-toolbar-lang:hover { background: rgba(255,255,255,0.12); }
        .ose-toolbar-lang option { background: #0f172a; }
        #ose-cancel-btn {
            padding: 7px 14px;
            border-radius: 9999px;
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            font-family: inherit;
            background: rgba(255,255,255,0.06);
            color: #94a3b8;
            transition: all 0.2s ease;
        }
        #ose-cancel-btn:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }
        #ose-save-btn {
            padding: 7px 18px;
            border-radius: 9999px;
            border: none;
            cursor: pointer;
            font-weight: 700;
            font-size: 12px;
            font-family: inherit;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
            transition: all 0.2s ease;
        }
        #ose-save-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }
        #ose-save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* ── Section Overlays ── */
        .ose-section-host {
            position: relative !important;
        }
        .ose-edit-overlay-btn {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(99, 102, 241, 0.92);
            backdrop-filter: blur(8px);
            color: white;
            border: none;
            padding: 7px 14px 7px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            cursor: pointer;
            z-index: 9900;
            opacity: 0;
            transform: translateY(-4px);
            transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s;
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .ose-section-host:hover .ose-edit-overlay-btn { opacity: 1; transform: translateY(0); }
        .ose-edit-overlay-btn:hover { background: rgba(79, 70, 229, 0.98); }

        /* ── Sidebar Panel ── */
        #ose-sidebar {
            position: fixed;
            top: 0;
            right: -500px;
            width: 460px;
            height: 100vh;
            background: rgba(7, 10, 20, 0.97);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            border-left: 1px solid rgba(255,255,255,0.07);
            box-shadow: -12px 0 60px rgba(0,0,0,0.7);
            z-index: 10000100;
            transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            color: #e2e8f0;
        }
        #ose-sidebar.open { right: 0; }

        .ose-sb-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-shrink: 0;
        }
        .ose-sb-title {
            font-size: 16px;
            font-weight: 800;
            color: white;
            letter-spacing: -0.3px;
        }
        .ose-sb-subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
        }
        .ose-sb-close {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
            color: #64748b;
            width: 30px;
            height: 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        .ose-sb-close:hover { background: rgba(255,255,255,0.12); color: white; }

        .ose-sb-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            scrollbar-width: thin;
            scrollbar-color: rgba(99,102,241,0.3) transparent;
        }
        .ose-sb-body::-webkit-scrollbar { width: 4px; }
        .ose-sb-body::-webkit-scrollbar-track { background: transparent; }
        .ose-sb-body::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }

        .ose-sb-footer {
            padding: 16px 24px;
            border-top: 1px solid rgba(255,255,255,0.07);
            display: flex;
            gap: 10px;
            background: rgba(0,0,0,0.3);
            flex-shrink: 0;
        }
        .ose-btn-apply {
            flex: 1;
            padding: 11px;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
            font-family: inherit;
            border: none;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            box-shadow: 0 4px 16px rgba(99,102,241,0.3);
            transition: all 0.2s;
        }
        .ose-btn-apply:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
        .ose-btn-close {
            flex: 1;
            padding: 11px;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
            font-family: inherit;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.04);
            color: #94a3b8;
            transition: all 0.2s;
        }
        .ose-btn-close:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }

        /* ── Sidebar Tabs ── */
        .ose-tabs {
            display: flex;
            gap: 4px;
            background: rgba(255,255,255,0.04);
            padding: 4px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.07);
        }
        .ose-tab {
            flex: 1;
            padding: 6px 0;
            border: none;
            border-radius: 7px;
            background: none;
            color: #64748b;
            font-weight: 600;
            font-size: 11px;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        .ose-tab:hover { color: #94a3b8; }
        .ose-tab.active { background: rgba(99,102,241,0.2); color: #a78bfa; }

        /* ── Form Controls ── */
        .ose-field {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .ose-label {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .ose-input, .ose-textarea, .ose-select {
            width: 100%;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 9px;
            padding: 9px 13px;
            color: #e2e8f0;
            font-size: 13px;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .ose-input:focus, .ose-textarea:focus, .ose-select:focus {
            border-color: rgba(99,102,241,0.6);
            background: rgba(99,102,241,0.05);
            box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .ose-input::placeholder, .ose-textarea::placeholder { color: #334155; }
        .ose-textarea { resize: vertical; min-height: 72px; }
        .ose-select { cursor: pointer; }
        .ose-select option { background: #0f172a; }
        .ose-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        /* ── Card Items ── */
        .ose-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 12px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            position: relative;
            transition: border-color 0.2s;
        }
        .ose-card:hover { border-color: rgba(99,102,241,0.2); }
        .ose-card-head {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .ose-card-avatar {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            object-fit: cover;
            background: #1e293b;
            flex-shrink: 0;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .ose-card-avatar.circle { border-radius: 50%; }
        .ose-card-del {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.2);
            color: #ef4444;
            width: 26px;
            height: 26px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .ose-card-del:hover { background: rgba(239,68,68,0.2); }

        .ose-add-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            width: 100%;
            padding: 10px;
            border: 2px dashed rgba(255,255,255,0.1);
            background: transparent;
            border-radius: 10px;
            color: #475569;
            font-weight: 700;
            font-size: 12px;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ose-add-btn:hover { border-color: rgba(99,102,241,0.4); color: #818cf8; background: rgba(99,102,241,0.05); }

        /* ── Upload Wrapper ── */
        .ose-upload-row {
            display: flex;
            gap: 6px;
        }
        .ose-upload-row .ose-input { flex: 1; }
        .ose-mini-upload {
            padding: 0 12px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.06);
            color: #94a3b8;
            font-size: 11px;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
            transition: all 0.2s;
            height: 37px;
        }
        .ose-mini-upload:hover { background: rgba(255,255,255,0.12); color: white; }

        /* ── Section Header ── */
        .ose-section-hd {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 10px;
            margin-bottom: 4px;
        }
        .ose-section-hd-icon {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            flex-shrink: 0;
        }
        .ose-section-hd-text { font-size: 13px; font-weight: 700; color: #cbd5e1; }
        .ose-section-hd-sub { font-size: 11px; color: #475569; }

        /* ── Fieldset Group ── */
        .ose-group {
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 10px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .ose-group-title {
            font-size: 11px;
            font-weight: 700;
            color: #6366f1;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        /* ── Radio Row ── */
        .ose-radio-row {
            display: flex;
            gap: 14px;
        }
        .ose-radio-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #94a3b8;
            cursor: pointer;
            transition: color 0.2s;
        }
        .ose-radio-label:hover { color: #e2e8f0; }
        .ose-radio-label input[type="radio"] {
            accent-color: #6366f1;
            width: 14px;
            height: 14px;
        }

        /* ── Checkbox ── */
        .ose-check-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #94a3b8;
            cursor: pointer;
            transition: color 0.2s;
        }
        .ose-check-label:hover { color: #e2e8f0; }
        .ose-check-label input[type="checkbox"] { accent-color: #6366f1; width: 14px; height: 14px; }

        /* ── Items List ── */
        .ose-items-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .ose-items-heading {
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .ose-items-heading::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,255,255,0.06);
        }

        /* ── Toast ── */
        #ose-toast {
            position: fixed;
            bottom: 28px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: rgba(16,185,129,0.95);
            backdrop-filter: blur(16px);
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 14px;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            box-shadow: 0 10px 40px rgba(16,185,129,0.35);
            z-index: 99999999;
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
        }
        #ose-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    `;
    document.head.appendChild(style);
    document.body.classList.add('editor-mode');

    // ─── 2. TOOLBAR ─────────────────────────────────────────────
    const toolbar = document.createElement('div');
    toolbar.id = 'ose-editor-toolbar';
    toolbar.innerHTML = `
        <span class="ose-toolbar-brand">✦ Visual Editor</span>
        <div class="ose-toolbar-divider"></div>
        <select class="ose-toolbar-lang" id="ose-lang-select">
            <option value="uz">🇺🇿 UZ</option>
            <option value="ru">🇷🇺 RU</option>
            <option value="en">🇬🇧 EN</option>
        </select>
        <div class="ose-toolbar-divider"></div>
        <button id="ose-cancel-btn">✕ Bekor</button>
        <button id="ose-save-btn">⬆ Saqlash</button>
    `;
    document.body.appendChild(toolbar);
    document.getElementById('ose-lang-select').value = currentLang;

    // ─── 3. SIDEBAR ─────────────────────────────────────────────
    const sidebar = document.createElement('div');
    sidebar.id = 'ose-sidebar';
    sidebar.innerHTML = `
        <div class="ose-sb-header">
            <div>
                <div class="ose-sb-title" id="ose-sb-title">Section Editor</div>
                <div class="ose-sb-subtitle" id="ose-sb-subtitle">Edit this section's content</div>
            </div>
            <button class="ose-sb-close" id="ose-sb-close">✕</button>
        </div>
        <div class="ose-sb-body" id="ose-sb-body"></div>
        <div class="ose-sb-footer">
            <button class="ose-btn-close" id="ose-sb-cancel">Yopish</button>
            <button class="ose-btn-apply" id="ose-sb-apply">✓ Qo'llash</button>
        </div>
    `;
    document.body.appendChild(sidebar);

    // ─── 4. TOAST ───────────────────────────────────────────────
    const toastEl = document.createElement('div');
    toastEl.id = 'ose-toast';
    document.body.appendChild(toastEl);
    function showToast(msg, color = '#10b981') {
        toastEl.innerText = msg;
        toastEl.style.background = `rgba(${color === '#ef4444' ? '239,68,68' : '16,185,129'},0.95)`;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3000);
    }

    // ─── 5. FETCH INTERCEPTOR ───────────────────────────────────
    function patchFetch() {
        window.fetch = async function(url, options) {
            const cleanUrl = (typeof url === 'string' ? url : url.url || '').split('?')[0];
            if (siteData && options?.method !== 'PUT' && options?.method !== 'POST') {
                const map = {
                    '/api/site/team': { ok: true, team: siteData.team },
                    '/api/site/testimonials': { ok: true, testimonials: siteData.testimonials },
                    '/api/site/pricing': { ok: true, pricing: siteData.pricing },
                    '/api/site/features': { ok: true, features: siteData.features },
                    '/api/site/faq': { ok: true, faq: siteData.faq },
                    '/api/site/video': { ok: true, video: siteData.video },
                    '/api/site/hero': { ok: true, hero: siteData.hero },
                    '/api/site/i18n-overrides': { ok: true, i18n: siteData.i18n },
                };
                if (map[cleanUrl]) {
                    return new Response(JSON.stringify(map[cleanUrl]), { headers: { 'Content-Type': 'application/json' } });
                }
            }
            return originalFetch.apply(this, arguments);
        };
    }

    // ─── 6. LOAD SITE CONTENT ───────────────────────────────────
    async function loadSiteContent() {
        try {
            const res = await originalFetch('/api/site-content');
            const json = await res.json();
            if (!json.ok) throw new Error('Could not fetch site contents');

            siteData = {
                team: json.team || { members: [], softScienceBoard: [], hardScienceBoard: [] },
                video: json.video || { mode: 'youtube', youtubeUrl: '', fileUrl: '' },
                i18n: json.i18n || { uz: {}, ru: {}, en: {} },
                testimonials: json.testimonials || { uz: { title: '', subtitle: '', items: [] }, ru: {}, en: {} },
                pricing: json.pricing || { uz: { title: '', subtitle: '', billingMonthly: '', billingYearly: '', discountBadge: '', plans: [] }, ru: {}, en: {} },
                features: json.features || { uz: { title: '', subtitle: '', ctaText: '', ctaButtonLabel: '', ctaButtonHref: '', items: [] }, ru: {}, en: {} },
                faq: json.faq || { uz: { title: '', subtitle: '', ctaTitle: '', ctaButtonLabel: '', ctaButtonHref: '', items: [] }, ru: {}, en: {} },
                hero: json.hero || { uz: { badge: '', title: '', subtitle: '', ctaPrimaryLabel: '', ctaPrimaryHref: '', ctaSecondaryLabel: '', ctaSecondaryHref: '', stats: [] }, ru: {}, en: {} }
            };

            for (const lang of ['uz', 'ru', 'en']) {
                if (!siteData.i18n[lang]) siteData.i18n[lang] = {};
                if (!siteData.testimonials[lang]) siteData.testimonials[lang] = { title: '', subtitle: '', items: [] };
                if (!siteData.pricing[lang]) siteData.pricing[lang] = { title: '', subtitle: '', billingMonthly: '', billingYearly: '', discountBadge: '', plans: [] };
                if (!siteData.features[lang]) siteData.features[lang] = { title: '', subtitle: '', ctaText: '', ctaButtonLabel: '', ctaButtonHref: '', items: [] };
                if (!siteData.faq[lang]) siteData.faq[lang] = { title: '', subtitle: '', ctaTitle: '', ctaButtonLabel: '', ctaButtonHref: '', items: [] };
                if (!siteData.hero[lang]) siteData.hero[lang] = { badge: '', title: '', subtitle: '', ctaPrimaryLabel: '', ctaPrimaryHref: '', ctaSecondaryLabel: '', ctaSecondaryHref: '', stats: [] };
                if (!siteData.hero[lang].stats?.length) {
                    siteData.hero[lang].stats = [{ value: '99%', label: 'Uptime' }, { value: '24/7', label: 'Support' }, { value: '10x', label: 'Speed' }];
                }
            }

            patchFetch();
            makeElementsEditable();
            injectSectionOverlays();

        } catch (err) {
            console.error('[OSE Editor] Load failed:', err);
            showToast('Kontentni yuklashda xatolik: ' + err.message, '#ef4444');
        }
    }

    // ─── 7. MAKE ELEMENTS EDITABLE ──────────────────────────────
    function makeElementsEditable() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            if (el.closest('#teamGrid, #softScienceBoardGrid, #hardScienceBoardGrid, #testimonialsCards, #pricingCards, #featuresCards, #faqList, #ose-editor-toolbar, #ose-sidebar')) return;
            el.setAttribute('contenteditable', 'true');
        });
        const heroIds = ['oseHeroTitle', 'oseHeroSubtitle', 'oseHeroBadgeText', 'oseHeroBadge', 'oseHeroCtaPrimary', 'oseHeroCtaSecondary', 'oseHeroStat0Val', 'oseHeroStat0Label', 'oseHeroStat1Val', 'oseHeroStat1Label', 'oseHeroStat2Val', 'oseHeroStat2Label'];
        heroIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('contenteditable', 'true');
        });
    }

    // ─── 8. INLINE EDIT LISTENER ────────────────────────────────
    document.body.addEventListener('input', e => {
        const el = e.target;
        if (el.getAttribute('contenteditable') !== 'true') return;
        if (!siteData) return;
        const text = el.textContent.trim();
        const id = el.id;
        const key = el.getAttribute('data-i18n');
        if (id === 'oseHeroTitle') siteData.hero[currentLang].title = text;
        else if (id === 'oseHeroSubtitle') siteData.hero[currentLang].subtitle = text;
        else if (id === 'oseHeroBadgeText' || id === 'oseHeroBadge') siteData.hero[currentLang].badge = text;
        else if (id === 'oseHeroCtaPrimary') siteData.hero[currentLang].ctaPrimaryLabel = text;
        else if (id === 'oseHeroCtaSecondary') siteData.hero[currentLang].ctaSecondaryLabel = text;
        else if (id === 'oseHeroStat0Val') siteData.hero[currentLang].stats[0].value = text;
        else if (id === 'oseHeroStat0Label') siteData.hero[currentLang].stats[0].label = text;
        else if (id === 'oseHeroStat1Val') siteData.hero[currentLang].stats[1].value = text;
        else if (id === 'oseHeroStat1Label') siteData.hero[currentLang].stats[1].label = text;
        else if (id === 'oseHeroStat2Val') siteData.hero[currentLang].stats[2].value = text;
        else if (id === 'oseHeroStat2Label') siteData.hero[currentLang].stats[2].label = text;
        else if (key) {
            if (!siteData.i18n[currentLang]) siteData.i18n[currentLang] = {};
            siteData.i18n[currentLang][key] = text;
        }
    });

    // ─── 9. SECTION OVERLAYS ────────────────────────────────────
    function injectSectionOverlays() {
        const sections = [
            { selectors: ['#teamSection', 'section:has(#teamGrid)', '.team-marquee'], key: 'team', label: 'Jamoani tahrirlash', icon: '👥', desc: 'Jamoa a\'zolari va kengash' },
            { selectors: ['#featuresSection', 'section:has(#featuresCards)'], key: 'features', label: 'Xususiyatlarni tahrirlash', icon: '✨', desc: 'Features grid va CTA' },
            { selectors: ['#testimonialsSection', 'section:has(#testimonialsCards)'], key: 'testimonials', label: 'Fikrlarni tahrirlash', icon: '💬', desc: 'Foydalanuvchi sharhlari' },
            { selectors: ['#pricingSection', 'section:has(#pricingCards)'], key: 'pricing', label: 'Narxlarni tahrirlash', icon: '💎', desc: 'Narx rejalari' },
            { selectors: ['#faqSection', 'section:has(#faqList)'], key: 'faq', label: 'FAQ tahrirlash', icon: '❓', desc: 'Savol va javoblar' },
            { selectors: ['#videoSection', 'section:has(#videoPlayer)', 'section:has(iframe)'], key: 'video', label: 'Videoni tahrirlash', icon: '🎬', desc: 'Video sozlamalari' },
        ];

        sections.forEach(sec => {
            let container = null;
            for (const sel of sec.selectors) {
                try { container = document.querySelector(sel); } catch (_) {}
                if (container) break;
            }
            if (!container || container.querySelector('.ose-edit-overlay-btn')) return;
            container.classList.add('ose-section-host');
            const btn = document.createElement('button');
            btn.className = 'ose-edit-overlay-btn';
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ${sec.label}`;
            btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openSidebar(sec.key, sec.label, sec.desc); });
            container.appendChild(btn);
        });
    }

    // ─── 10. SIDEBAR OPEN/CLOSE ─────────────────────────────────
    function openSidebar(section, title = 'Editor', desc = '') {
        activeSidebarSection = section;
        document.getElementById('ose-sb-title').textContent = title;
        document.getElementById('ose-sb-subtitle').textContent = desc;
        const body = document.getElementById('ose-sb-body');
        body.innerHTML = '';
        const builders = { team: renderTeamForm, faq: renderFaqForm, features: renderFeaturesForm, testimonials: renderTestimonialsForm, pricing: renderPricingForm, video: renderVideoForm };
        if (builders[section]) builders[section](body);
        sidebar.classList.add('open');
    }
    function closeSidebar() { sidebar.classList.remove('open'); activeSidebarSection = null; }

    document.getElementById('ose-sb-close').addEventListener('click', closeSidebar);
    document.getElementById('ose-sb-cancel').addEventListener('click', closeSidebar);
    document.getElementById('ose-sb-apply').addEventListener('click', async () => {
        if (activeSidebarSection) {
            await applySidebarChanges(activeSidebarSection);
            showToast('✓ O\'zgarishlar qo\'llandi!');
            closeSidebar();
        }
    });

    // ─── 11. HELPERS ────────────────────────────────────────────
    function makeField(label, inputHtml) {
        const div = document.createElement('div');
        div.className = 'ose-field';
        div.innerHTML = `<label class="ose-label">${label}</label>${inputHtml}`;
        return div;
    }
    function makeInput(cls, val = '', placeholder = '') {
        return `<input type="text" class="ose-input ${cls}" value="${escHtml(val)}" placeholder="${placeholder}" />`;
    }
    function makeTextarea(cls, val = '') {
        return `<textarea class="ose-textarea ${cls}">${escHtml(val)}</textarea>`;
    }
    function escHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function makeUploadRow(cls, val = '') {
        return `<div class="ose-upload-row">
            ${makeInput(cls, val, 'https://...')}
            <button type="button" class="ose-mini-upload">⬆ Upload</button>
            <input type="file" accept="image/*" style="display:none;" />
        </div>`;
    }

    function bindUpload(card, imgCls, previewEl) {
        const uploadBtn = card.querySelector('.ose-mini-upload');
        const fileInput = card.querySelector('input[type="file"]');
        const urlInput = card.querySelector('.' + imgCls);
        const preview = previewEl || card.querySelector('.ose-card-avatar');
        if (!uploadBtn || !fileInput) return;
        
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        if (preview) {
            preview.style.cursor = 'pointer';
            preview.title = 'Rasm yuklash uchun bosing / Click to upload image';
            preview.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });
        }

        fileInput.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleImgUpload(fileInput, urlInput, preview);
        });
        
        if (urlInput && preview) {
            urlInput.addEventListener('input', () => { 
                preview.src = urlInput.value.trim(); 
            });
        }
    }

    async function handleImgUpload(fileInput, urlInput, previewImg) {
        const file = fileInput.files[0];
        if (!file) return;
        const btn = fileInput.previousElementSibling;
        const orig = btn.innerHTML;
        btn.innerHTML = '⏳...'; btn.disabled = true;
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await originalFetch(`/api/site/upload?admin_id=${adminId}`, { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Upload failed');
            if (json.url) { if (urlInput) urlInput.value = json.url; if (previewImg) previewImg.src = json.url; }
        } catch (err) {
            showToast('Yuklashda xatolik: ' + err.message, '#ef4444');
        } finally { btn.innerHTML = orig; btn.disabled = false; fileInput.value = ''; }
    }

    function sectionHeader(icon, title, sub) {
        const d = document.createElement('div');
        d.className = 'ose-section-hd';
        d.innerHTML = `<div class="ose-section-hd-icon" style="background:rgba(99,102,241,0.12)">${icon}</div><div><div class="ose-section-hd-text">${title}</div><div class="ose-section-hd-sub">${sub}</div></div>`;
        return d;
    }

    function itemsHeading(label) {
        const d = document.createElement('div'); d.className = 'ose-items-heading'; d.textContent = label; return d;
    }

    // ─── 12. FORM BUILDERS ──────────────────────────────────────

    // ── Team Form ──
    function renderTeamForm(container) {
        let activeTab = 'main';
        container.appendChild(sectionHeader('👥', 'Jamoa', 'Jamoa a\'zolari va ilmiy kengash'));

        const tabBar = document.createElement('div'); tabBar.className = 'ose-tabs';
        tabBar.innerHTML = `<button class="ose-tab active" data-tab="main">Jamoa</button><button class="ose-tab" data-tab="soft">Soft Board</button><button class="ose-tab" data-tab="hard">Hard Board</button>`;
        container.appendChild(tabBar);

        const listWrap = document.createElement('div'); listWrap.className = 'ose-items-list'; container.appendChild(listWrap);
        const addBtn = document.createElement('button'); addBtn.className = 'ose-add-btn'; addBtn.innerHTML = '+ A\'zo qo\'shish'; container.appendChild(addBtn);

        tabBar.querySelectorAll('.ose-tab').forEach(t => {
            t.addEventListener('click', () => {
                tabBar.querySelectorAll('.ose-tab').forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                activeTab = t.dataset.tab;
                renderList();
                addBtn.innerHTML = `+ ${activeTab === 'main' ? "A'zo" : activeTab === 'soft' ? 'Soft Board a\'zosi' : 'Hard Board a\'zosi'} qo\'shish`;
            });
        });

        function makeCard(m = {}, cls, prefix) {
            const card = document.createElement('div'); card.className = `ose-card ${cls}`;
            card.innerHTML = `
                <button class="ose-card-del" title="O'chirish">✕</button>
                <div class="ose-card-head">
                    <img class="ose-card-avatar" src="${escHtml(m.imageUrl || '')}" onerror="this.src='https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=100'" />
                    <div class="ose-field" style="flex:1">
                        <label class="ose-label">Rasm URL</label>
                        ${makeUploadRow(`${prefix}-img`, m.imageUrl || '')}
                    </div>
                </div>
                <div class="ose-grid-2">
                    ${makeField('Ism', makeInput(`${prefix}-name`, m.name || '', 'Ism Familiya')).outerHTML}
                    ${makeField('Lavozim', makeInput(`${prefix}-role`, m.role || '', 'Professor, PhD...')).outerHTML}
                </div>
            `;
            card.querySelector('.ose-card-del').addEventListener('click', () => card.remove());
            bindUpload(card, `${prefix}-img`);
            return card;
        }

        function renderList() {
            listWrap.innerHTML = '';
            const map = { main: ['sidebar-team-item', 'team-item', siteData.team.members], soft: ['sidebar-soft-item', 'soft-item', siteData.team.softScienceBoard], hard: ['sidebar-hard-item', 'hard-item', siteData.team.hardScienceBoard] };
            const [cls, prefix, list] = map[activeTab];
            (list || []).forEach(m => listWrap.appendChild(makeCard(m, cls, prefix)));
        }

        addBtn.addEventListener('click', () => {
            const map = { main: ['sidebar-team-item', 'team-item'], soft: ['sidebar-soft-item', 'soft-item'], hard: ['sidebar-hard-item', 'hard-item'] };
            const [cls, prefix] = map[activeTab];
            listWrap.appendChild(makeCard({}, cls, prefix));
        });

        renderList();
    }

    // ── FAQ Form ──
    function renderFaqForm(container) {
        const pack = siteData.faq[currentLang] || {};
        container.appendChild(sectionHeader('❓', 'FAQ', 'Savol va javoblar bo\'limi'));

        const group1 = document.createElement('div'); group1.className = 'ose-group';
        group1.innerHTML = `<div class="ose-group-title">Bo'lim sarlavhalari</div>`;
        group1.appendChild(makeField('Sarlavha', makeInput('ose-faq-title', pack.title || '', 'FAQ sarlavhasi')));
        group1.appendChild(makeField('Qo\'shimcha matn', makeInput('ose-faq-subtitle', pack.subtitle || '', 'Qisqacha tavsif')));
        container.appendChild(group1);

        const group2 = document.createElement('div'); group2.className = 'ose-group';
        group2.innerHTML = `<div class="ose-group-title">CTA qutisi</div>`;
        group2.appendChild(makeField('CTA sarlavhasi', makeInput('ose-faq-ctatitle', pack.ctaTitle || '')));
        group2.appendChild(makeField('Tugma matni', makeInput('ose-faq-ctabtn', pack.ctaButtonLabel || '')));
        group2.appendChild(makeField('Tugma havolasi', makeInput('ose-faq-ctahref', pack.ctaButtonHref || '', 'https://...')));
        container.appendChild(group2);

        container.appendChild(itemsHeading('FAQ elementlari'));
        const list = document.createElement('div'); list.className = 'ose-items-list'; container.appendChild(list);

        function makeCard(item = {}) {
            const card = document.createElement('div'); card.className = 'ose-card sidebar-faq-item';
            card.innerHTML = `
                <button class="ose-card-del">✕</button>
                ${makeField('Savol', makeInput('faq-item-q', item.q || '', 'Savol matni...')).outerHTML}
                ${makeField('Javob', makeTextarea('faq-item-a', item.a || '')).outerHTML}
            `;
            card.querySelector('.ose-card-del').addEventListener('click', () => card.remove());
            return card;
        }
        (pack.items || []).forEach(item => list.appendChild(makeCard(item)));

        const addBtn = document.createElement('button'); addBtn.className = 'ose-add-btn'; addBtn.innerHTML = '+ Savol qo\'shish';
        addBtn.addEventListener('click', () => list.appendChild(makeCard()));
        container.appendChild(addBtn);
    }

    // ── Features Form ──
    function renderFeaturesForm(container) {
        const pack = siteData.features[currentLang] || {};
        container.appendChild(sectionHeader('✨', 'Xususiyatlar', 'Core features grid'));

        const g1 = document.createElement('div'); g1.className = 'ose-group';
        g1.innerHTML = `<div class="ose-group-title">Sarlavhalar</div>`;
        g1.appendChild(makeField('Sarlavha', makeInput('ose-feat-title', pack.title || '')));
        g1.appendChild(makeField('Qo\'shimcha matn', makeInput('ose-feat-subtitle', pack.subtitle || '')));
        container.appendChild(g1);

        const g2 = document.createElement('div'); g2.className = 'ose-group';
        g2.innerHTML = `<div class="ose-group-title">CTA banner</div>`;
        g2.appendChild(makeField('CTA matni', makeInput('ose-feat-ctatext', pack.ctaText || '')));
        g2.appendChild(makeField('Tugma matni', makeInput('ose-feat-ctabtn', pack.ctaButtonLabel || '')));
        g2.appendChild(makeField('Tugma havolasi', makeInput('ose-feat-ctahref', pack.ctaButtonHref || '', 'https://...')));
        container.appendChild(g2);

        container.appendChild(itemsHeading('Xususiyatlar'));
        const list = document.createElement('div'); list.className = 'ose-items-list'; container.appendChild(list);

        function makeCard(item = {}) {
            const card = document.createElement('div'); card.className = 'ose-card sidebar-feat-item';
            card.innerHTML = `
                <button class="ose-card-del">✕</button>
                ${makeField('Xususiyat nomi', makeInput('feat-item-title', item.title || '')).outerHTML}
                ${makeField('Tavsif', makeTextarea('feat-item-desc', item.description || '')).outerHTML}
            `;
            card.querySelector('.ose-card-del').addEventListener('click', () => card.remove());
            return card;
        }
        (pack.items || []).forEach(item => list.appendChild(makeCard(item)));

        const addBtn = document.createElement('button'); addBtn.className = 'ose-add-btn'; addBtn.innerHTML = '+ Xususiyat qo\'shish';
        addBtn.addEventListener('click', () => list.appendChild(makeCard()));
        container.appendChild(addBtn);
    }

    // ── Testimonials Form ──
    function renderTestimonialsForm(container) {
        const pack = siteData.testimonials[currentLang] || {};
        container.appendChild(sectionHeader('💬', 'Sharhlar', 'Foydalanuvchi fikrlari'));

        const g1 = document.createElement('div'); g1.className = 'ose-group';
        g1.innerHTML = `<div class="ose-group-title">Sarlavhalar</div>`;
        g1.appendChild(makeField('Sarlavha', makeInput('ose-test-title', pack.title || '')));
        g1.appendChild(makeField('Qo\'shimcha matn', makeInput('ose-test-subtitle', pack.subtitle || '')));
        container.appendChild(g1);

        container.appendChild(itemsHeading('Sharhlar'));
        const list = document.createElement('div'); list.className = 'ose-items-list'; container.appendChild(list);

        function makeCard(item = {}) {
            const tid = 'hl-' + Math.random().toString(36).slice(2);
            const card = document.createElement('div'); card.className = 'ose-card sidebar-test-item';
            card.innerHTML = `
                <button class="ose-card-del">✕</button>
                <div class="ose-card-head">
                    <img class="ose-card-avatar circle" src="${escHtml(item.avatarUrl || '')}" onerror="this.src='https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=100'" />
                    <div class="ose-field" style="flex:1">
                        <label class="ose-label">Avatar URL</label>
                        ${makeUploadRow('test-item-avatar', item.avatarUrl || '')}
                    </div>
                </div>
                <div class="ose-grid-2">
                    ${makeField('Ism', makeInput('test-item-name', item.name || '')).outerHTML}
                    ${makeField('Username', makeInput('test-item-user', item.username || '', '@username')).outerHTML}
                </div>
                <div class="ose-grid-2">
                    <div class="ose-field">
                        <label class="ose-label">Reyting (1-5)</label>
                        <select class="ose-select test-item-rating">
                            ${[1,2,3,4,5].map(n => `<option value="${n}" ${(item.rating||5)===n?'selected':''}>${n} ⭐</option>`).join('')}
                        </select>
                    </div>
                    <div class="ose-field" style="justify-content:flex-end">
                        <label class="ose-label">&nbsp;</label>
                        <label class="ose-check-label" for="${tid}">
                            <input type="checkbox" id="${tid}" class="test-item-highlight" ${item.highlight ? 'checked' : ''} />
                            Ajratib ko'rsatish
                        </label>
                    </div>
                </div>
                ${makeField('Sharh matni', makeTextarea('test-item-text', item.text || '')).outerHTML}
            `;
            card.querySelector('.ose-card-del').addEventListener('click', () => card.remove());
            bindUpload(card, 'test-item-avatar');
            return card;
        }
        (pack.items || []).forEach(item => list.appendChild(makeCard(item)));

        const addBtn = document.createElement('button'); addBtn.className = 'ose-add-btn'; addBtn.innerHTML = '+ Sharh qo\'shish';
        addBtn.addEventListener('click', () => list.appendChild(makeCard()));
        container.appendChild(addBtn);
    }

    // ── Pricing Form ──
    function renderPricingForm(container) {
        const pack = siteData.pricing[currentLang] || {};
        container.appendChild(sectionHeader('💎', 'Narxlar', 'Narx rejalari va toggle'));

        const g1 = document.createElement('div'); g1.className = 'ose-group';
        g1.innerHTML = `<div class="ose-group-title">Sarlavhalar</div>`;
        g1.appendChild(makeField('Sarlavha', makeInput('ose-price-title', pack.title || '')));
        g1.appendChild(makeField('Qo\'shimcha matn', makeInput('ose-price-subtitle', pack.subtitle || '')));
        container.appendChild(g1);

        const g2 = document.createElement('div'); g2.className = 'ose-group';
        g2.innerHTML = `<div class="ose-group-title">To'lov davri</div>`;
        const grid = document.createElement('div'); grid.className = 'ose-grid-2';
        grid.appendChild(makeField('Oylik toggle matni', makeInput('ose-price-monthly', pack.billingMonthly || '', 'Oylik')));
        grid.appendChild(makeField('Yillik toggle matni', makeInput('ose-price-yearly', pack.billingYearly || '', 'Yillik')));
        g2.appendChild(grid);
        g2.appendChild(makeField('Chegirma badge matni', makeInput('ose-price-discount', pack.discountBadge || '', '-20% chegirma')));
        container.appendChild(g2);

        container.appendChild(itemsHeading('Narx rejalari'));
        const list = document.createElement('div'); list.className = 'ose-items-list'; container.appendChild(list);

        function makeCard(plan = {}) {
            const card = document.createElement('div'); card.className = 'ose-card sidebar-plan-item';
            card.innerHTML = `
                <button class="ose-card-del">✕</button>
                <div class="ose-grid-2">
                    ${makeField('Reja nomi', makeInput('plan-item-name', plan.name || '')).outerHTML}
                    ${makeField('Tavsif', makeInput('plan-item-desc', plan.description || '')).outerHTML}
                </div>
                <div class="ose-grid-2">
                    ${makeField('Oylik narx', makeInput('plan-item-pricem', plan.priceMonthly || '', '$9/oy')).outerHTML}
                    ${makeField('Yillik narx', makeInput('plan-item-pricey', plan.priceYearly || '', '$90/yil')).outerHTML}
                </div>
                <div class="ose-grid-2">
                    ${makeField('Tugma matni', makeInput('plan-item-cta', plan.ctaLabel || '', 'Boshlash')).outerHTML}
                    ${makeField('Tugma havolasi', makeInput('plan-item-href', plan.ctaHref || '', '#')).outerHTML}
                </div>
                ${makeField('Imkoniyatlar (har qatori bir narsa)', makeTextarea('plan-item-features', (plan.features||[]).join('\n'))).outerHTML}
            `;
            card.querySelector('.ose-card-del').addEventListener('click', () => card.remove());
            return card;
        }
        (pack.plans || []).forEach(p => list.appendChild(makeCard(p)));

        const addBtn = document.createElement('button'); addBtn.className = 'ose-add-btn'; addBtn.innerHTML = '+ Reja qo\'shish';
        addBtn.addEventListener('click', () => list.appendChild(makeCard()));
        container.appendChild(addBtn);
    }

    // ── Video Form ──
    function renderVideoForm(container) {
        const v = siteData.video || { mode: 'youtube', youtubeUrl: '', fileUrl: '' };
        container.appendChild(sectionHeader('🎬', 'Video', 'Video sozlamalari'));

        const g1 = document.createElement('div'); g1.className = 'ose-group';
        g1.innerHTML = `<div class="ose-group-title">Video manbai</div>
            <div class="ose-radio-row">
                <label class="ose-radio-label"><input type="radio" name="vid-mode" value="youtube" ${v.mode !== 'file' ? 'checked' : ''} /> YouTube</label>
                <label class="ose-radio-label"><input type="radio" name="vid-mode" value="file" ${v.mode === 'file' ? 'checked' : ''} /> Video fayl</label>
            </div>`;
        g1.appendChild(makeField('YouTube URL', makeInput('ose-vid-yt', v.youtubeUrl || '', 'https://www.youtube.com/watch?v=...')));
        container.appendChild(g1);

        const g2 = document.createElement('div'); g2.className = 'ose-group';
        g2.innerHTML = `<div class="ose-group-title">Video fayl</div>
            <div class="ose-field">
                <label class="ose-label">MP4 URL yoki yuklash</label>
                ${makeUploadRow('ose-vid-file', v.fileUrl || '')}
            </div>`;
        container.appendChild(g2);

        // Override upload for video
        const uploadBtn = g2.querySelector('.ose-mini-upload');
        const fileInput = g2.querySelector('input[type="file"]');
        if (fileInput) fileInput.accept = 'video/mp4,video/webm';
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files[0]; if (!file) return;
                uploadBtn.innerHTML = '⏳...'; uploadBtn.disabled = true;
                try {
                    const fd = new FormData(); fd.append('file', file);
                    const res = await originalFetch(`/api/site/video-upload?admin_id=${adminId}`, { method: 'POST', body: fd });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || 'Upload failed');
                    if (json.url) {
                        g2.querySelector('.ose-vid-file').value = json.url;
                        g2.querySelector('input[name="vid-mode"][value="file"]').checked = true;
                    }
                } catch (err) { showToast('Yuklashda xatolik: ' + err.message, '#ef4444'); }
                finally { uploadBtn.innerHTML = '⬆ Upload'; uploadBtn.disabled = false; fileInput.value = ''; }
            });
        }
    }

    // ─── 13. APPLY SIDEBAR CHANGES ──────────────────────────────
    async function applySidebarChanges(section) {
        if (section === 'team') {
            const members = [];
            document.querySelectorAll('.sidebar-team-item').forEach(el => {
                const name = el.querySelector('.team-item-name')?.value.trim();
                const role = el.querySelector('.team-item-role')?.value.trim();
                const imageUrl = el.querySelector('.team-item-img')?.value.trim();
                if (name) members.push({ name, role, imageUrl });
            });
            const softScienceBoard = [];
            document.querySelectorAll('.sidebar-soft-item').forEach(el => {
                const name = el.querySelector('.soft-item-name')?.value.trim();
                const role = el.querySelector('.soft-item-role')?.value.trim();
                const imageUrl = el.querySelector('.soft-item-img')?.value.trim();
                if (name) softScienceBoard.push({ name, role, imageUrl });
            });
            const hardScienceBoard = [];
            document.querySelectorAll('.sidebar-hard-item').forEach(el => {
                const name = el.querySelector('.hard-item-name')?.value.trim();
                const role = el.querySelector('.hard-item-role')?.value.trim();
                const imageUrl = el.querySelector('.hard-item-img')?.value.trim();
                if (name) hardScienceBoard.push({ name, role, imageUrl });
            });
            siteData.team = { members, softScienceBoard, hardScienceBoard };
            if (typeof window.loadTeamSection === 'function') await window.loadTeamSection();
        }
        else if (section === 'faq') {
            const title = document.querySelector('.ose-faq-title')?.value.trim() || '';
            const subtitle = document.querySelector('.ose-faq-subtitle')?.value.trim() || '';
            const ctaTitle = document.querySelector('.ose-faq-ctatitle')?.value.trim() || '';
            const ctaButtonLabel = document.querySelector('.ose-faq-ctabtn')?.value.trim() || '';
            const ctaButtonHref = document.querySelector('.ose-faq-ctahref')?.value.trim() || '';
            const items = [];
            document.querySelectorAll('.sidebar-faq-item').forEach(el => {
                const q = el.querySelector('.faq-item-q')?.value.trim();
                const a = el.querySelector('.faq-item-a')?.value.trim();
                if (q && a) items.push({ q, a });
            });
            siteData.faq[currentLang] = { title, subtitle, ctaTitle, ctaButtonLabel, ctaButtonHref, items };
            if (typeof window.loadFaqSection === 'function') await window.loadFaqSection();
        }
        else if (section === 'features') {
            const title = document.querySelector('.ose-feat-title')?.value.trim() || '';
            const subtitle = document.querySelector('.ose-feat-subtitle')?.value.trim() || '';
            const ctaText = document.querySelector('.ose-feat-ctatext')?.value.trim() || '';
            const ctaButtonLabel = document.querySelector('.ose-feat-ctabtn')?.value.trim() || '';
            const ctaButtonHref = document.querySelector('.ose-feat-ctahref')?.value.trim() || '';
            const items = [];
            document.querySelectorAll('.sidebar-feat-item').forEach(el => {
                const title = el.querySelector('.feat-item-title')?.value.trim();
                const description = el.querySelector('.feat-item-desc')?.value.trim();
                if (title && description) items.push({ title, description });
            });
            siteData.features[currentLang] = { title, subtitle, ctaText, ctaButtonLabel, ctaButtonHref, items };
            if (typeof window.loadFeaturesSection === 'function') await window.loadFeaturesSection();
        }
        else if (section === 'testimonials') {
            const title = document.querySelector('.ose-test-title')?.value.trim() || '';
            const subtitle = document.querySelector('.ose-test-subtitle')?.value.trim() || '';
            const items = [];
            document.querySelectorAll('.sidebar-test-item').forEach(el => {
                const name = el.querySelector('.test-item-name')?.value.trim();
                const username = el.querySelector('.test-item-user')?.value.trim();
                const text = el.querySelector('.test-item-text')?.value.trim();
                const avatarUrl = el.querySelector('.test-item-avatar')?.value.trim();
                const rating = parseInt(el.querySelector('.test-item-rating')?.value) || 5;
                const highlight = el.querySelector('.test-item-highlight')?.checked;
                if (name && text) items.push({ name, username, text, avatarUrl, rating, highlight });
            });
            siteData.testimonials[currentLang] = { title, subtitle, items };
            if (typeof window.loadTestimonialsSection === 'function') await window.loadTestimonialsSection();
        }
        else if (section === 'pricing') {
            const title = document.querySelector('.ose-price-title')?.value.trim() || '';
            const subtitle = document.querySelector('.ose-price-subtitle')?.value.trim() || '';
            const billingMonthly = document.querySelector('.ose-price-monthly')?.value.trim() || '';
            const billingYearly = document.querySelector('.ose-price-yearly')?.value.trim() || '';
            const discountBadge = document.querySelector('.ose-price-discount')?.value.trim() || '';
            const plans = [];
            document.querySelectorAll('.sidebar-plan-item').forEach(el => {
                const name = el.querySelector('.plan-item-name')?.value.trim();
                const description = el.querySelector('.plan-item-desc')?.value.trim();
                const priceMonthly = el.querySelector('.plan-item-pricem')?.value.trim();
                const priceYearly = el.querySelector('.plan-item-pricey')?.value.trim();
                const ctaLabel = el.querySelector('.plan-item-cta')?.value.trim();
                const ctaHref = el.querySelector('.plan-item-href')?.value.trim();
                const features = el.querySelector('.plan-item-features')?.value.split('\n').map(f => f.trim()).filter(Boolean);
                const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (name) plans.push({ key, name, description, priceMonthly, priceYearly, ctaLabel, ctaHref, features });
            });
            siteData.pricing[currentLang] = { title, subtitle, billingMonthly, billingYearly, discountBadge, plans };
            if (typeof window.loadPricingSection === 'function') await window.loadPricingSection();
        }
        else if (section === 'video') {
            const mode = document.querySelector('input[name="vid-mode"]:checked')?.value || 'youtube';
            const youtubeUrl = document.querySelector('.ose-vid-yt')?.value.trim() || '';
            const fileUrl = document.querySelector('.ose-vid-file')?.value.trim() || '';
            siteData.video = { mode, youtubeUrl, fileUrl };
            if (typeof window.loadVideoSection === 'function') await window.loadVideoSection();
        }
    }

    // ─── 14. LANGUAGE SWITCHER ──────────────────────────────────
    document.getElementById('ose-lang-select').addEventListener('change', e => {
        currentLang = e.target.value;
        localStorage.setItem('ose_lang', currentLang);
        window.dispatchEvent(new CustomEvent('ose:lang', { detail: { lang: currentLang } }));
        setTimeout(() => { makeElementsEditable(); injectSectionOverlays(); }, 400);
    });

    // ─── 15. CANCEL BUTTON ──────────────────────────────────────
    document.getElementById('ose-cancel-btn').addEventListener('click', () => {
        if (confirm('Kiritilgan o\'zgarishlarni bekor qilib, bosh sahifaga qaytasizmi?')) {
            window.location.href = window.location.origin + window.location.pathname;
        }
    });

    // ─── 16. SAVE BUTTON ────────────────────────────────────────
    document.getElementById('ose-save-btn').addEventListener('click', async () => {
        const btn = document.getElementById('ose-save-btn');
        const lang = localStorage.getItem('ose_lang') || 'uz';
        const savingText = lang === 'uz' ? 'Saqlanmoqda...' : lang === 'ru' ? 'Сохранение...' : 'Saving...';
        const savedText = lang === 'uz' ? 'Saqlandi! ✅' : lang === 'ru' ? 'Сохранено! ✅' : 'Saved! ✅';
        const errorText = lang === 'uz' ? 'Xatolik! ❌' : lang === 'ru' ? 'Ошибка! ❌' : 'Error! ❌';

        btn.innerText = savingText;
        btn.disabled = true;
        btn.style.background = 'linear-gradient(135deg, #eab308, #ca8a04)';

        try {
            // Sequential API saves
            const put = (url, body) => originalFetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_id: adminId, ...body }) });

            let r = await put('/api/site/i18n-overrides', { i18n: siteData.i18n });
            if (!r.ok) throw new Error('i18n saqlashda xatolik');

            r = await put('/api/site/team', { members: siteData.team.members, softScienceBoard: siteData.team.softScienceBoard, hardScienceBoard: siteData.team.hardScienceBoard });
            if (!r.ok) throw new Error('Jamoa saqlashda xatolik');

            r = await put('/api/site/testimonials', { testimonials: siteData.testimonials });
            if (!r.ok) throw new Error('Sharhlar saqlashda xatolik');

            r = await put('/api/site/pricing', { pricing: siteData.pricing });
            if (!r.ok) throw new Error('Narxlar saqlashda xatolik');

            r = await put('/api/site/features', { features: siteData.features });
            if (!r.ok) throw new Error('Xususiyatlar saqlashda xatolik');

            r = await put('/api/site/faq', { faq: siteData.faq });
            if (!r.ok) throw new Error('FAQ saqlashda xatolik');

            r = await put('/api/site/video', { mode: siteData.video.mode, youtubeUrl: siteData.video.youtubeUrl, fileUrl: siteData.video.fileUrl });
            if (!r.ok) throw new Error('Video saqlashda xatolik');

            r = await put('/api/site/hero', { hero: siteData.hero });
            if (!r.ok) throw new Error('Hero saqlashda xatolik');

            btn.innerText = savedText;
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

            const toastMsg = lang === 'uz' ? 'Sayt muvaffaqiyatli saqlandi! ✅' : lang === 'ru' ? 'Сайт успешно сохранён! ✅' : 'Website saved successfully! ✅';
            showToast(toastMsg);

            setTimeout(() => { window.location.href = '/admindashboard'; }, 1500);

        } catch (err) {
            console.error('[OSE Editor] Save failed:', err);
            btn.innerText = errorText;
            btn.disabled = false;
            btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            const errMsg = lang === 'uz' ? 'Saqlashda xatolik: ' : lang === 'ru' ? 'Ошибка сохранения: ' : 'Save error: ';
            showToast(errMsg + err.message, '#ef4444');
            setTimeout(() => { btn.innerText = lang === 'uz' ? '⬆ Saqlash' : '⬆ Save'; btn.style.background = ''; btn.disabled = false; }, 3000);
        }
    });

    // ─── 17. INITIALIZE ─────────────────────────────────────────
    loadSiteContent();
});
