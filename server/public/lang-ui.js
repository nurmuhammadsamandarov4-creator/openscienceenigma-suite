(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function buildSelector() {
    const wrap = document.createElement("div");
    wrap.id = "langSelector";
    wrap.style.position = "relative";
    wrap.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    wrap.style.userSelect = "none";
    wrap.style.zIndex = "9999";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.border = "1px solid rgba(0, 0, 0, 0.08)";
    btn.style.background = "rgba(255, 255, 255, 0.7)";
    btn.style.backdropFilter = "blur(16px)";
    btn.style.borderRadius = "9999px";
    btn.style.padding = "8px 16px";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.gap = "8px";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)";
    btn.style.transition = "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)";

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-1px)';
      btn.style.background = 'rgba(255, 255, 255, 0.9)';
      btn.style.borderColor = 'rgba(37, 99, 235, 0.25)';
      btn.style.boxShadow = '0 6px 24px rgba(37, 99, 235, 0.06)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.background = 'rgba(255, 255, 255, 0.7)';
      btn.style.borderColor = 'rgba(0, 0, 0, 0.08)';
      btn.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
    });

    const globe = document.createElement("span");
    globe.style.display = "flex";
    globe.style.alignItems = "center";
    globe.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    `;

    const label = document.createElement("span");
    label.style.fontSize = "13px";
    label.style.fontWeight = "600";
    label.style.color = "#1e293b";
    label.style.letterSpacing = "0.3px";

    const chevron = document.createElement("span");
    chevron.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
    chevron.style.display = "flex";
    chevron.style.alignItems = "center";
    chevron.style.transition = "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";

    btn.appendChild(globe);
    btn.appendChild(label);
    btn.appendChild(chevron);

    const menu = document.createElement("div");
    menu.style.position = "absolute";
    menu.style.top = "46px";
    menu.style.right = "0";
    menu.style.minWidth = "150px";
    menu.style.background = "rgba(255, 255, 255, 0.9)";
    menu.style.backdropFilter = "blur(24px)";
    menu.style.border = "1px solid rgba(0, 0, 0, 0.06)";
    menu.style.borderRadius = "16px";
    menu.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.01)";
    menu.style.padding = "6px";
    menu.style.zIndex = "99999";
    
    // Animation states
    menu.style.opacity = "0";
    menu.style.transform = "translateY(-8px) scale(0.95)";
    menu.style.pointerEvents = "none";
    menu.style.transition = "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
    menu.style.transformOrigin = "top right";
    
    let menuOpen = false;

    function item(text, langCode) {
      const it = document.createElement("button");
      it.type = "button";
      it.style.width = "100%";
      it.style.textAlign = "left";
      it.style.border = "none";
      it.style.background = "transparent";
      it.style.borderRadius = "10px";
      it.style.padding = "8px 12px";
      it.style.cursor = "pointer";
      it.style.fontSize = "13px";
      it.style.fontWeight = "550";
      it.style.color = "#334155";
      it.style.display = "flex";
      it.style.justifyContent = "space-between";
      it.style.alignItems = "center";
      it.style.transition = "all 0.15s ease";
      it.style.position = "relative";
      it.style.zIndex = "999999";
      it.style.pointerEvents = "auto";
      
      const currentLang = window.__i18n.getLang();
      if (currentLang === langCode) {
        it.style.background = "rgba(37, 99, 235, 0.06)";
        it.style.color = "#2563eb";
        it.innerHTML = `<span>${text}</span><span style="width: 6px; height: 6px; border-radius: 50%; background-color: #2563eb;"></span>`;
      } else {
        it.textContent = text;
      }

      it.addEventListener("mouseenter", () => {
        it.style.background = "rgba(37, 99, 235, 0.08)";
        it.style.color = "#1d4ed8";
        it.style.transform = "translateX(2px)";
      });
      it.addEventListener("mouseleave", () => {
        if (currentLang === langCode) {
          it.style.background = "rgba(37, 99, 235, 0.06)";
          it.style.color = "#2563eb";
        } else {
          it.style.background = "transparent";
          it.style.color = "#334155";
        }
        it.style.transform = "translateX(0)";
      });
      it.addEventListener("click", (e) => {
        console.log("Language item clicked:", langCode);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.__i18n.setLang(langCode);
        closeMenu();
        refreshLabel();
        try {
          window.location.reload();
        } catch (err) {
          console.error("Reload error:", err);
        }
      });
      return it;
    }

    function refreshLabel() {
      const lang = window.__i18n.getLang();
      label.textContent = (lang === "ru" ? "RU" : lang === "en" ? "EN" : "UZ");
    }

    menu.appendChild(item("English", "en"));
    menu.appendChild(item("Русский", "ru"));
    menu.appendChild(item("Oʻzbekcha", "uz"));

    function closeMenu() {
      menuOpen = false;
      menu.style.opacity = "0";
      menu.style.transform = "translateY(-8px) scale(0.95)";
      menu.style.pointerEvents = "none";
      chevron.style.transform = "rotate(0deg)";
    }

    function openMenu() {
      menuOpen = true;
      menu.style.opacity = "1";
      menu.style.transform = "translateY(0) scale(1)";
      menu.style.pointerEvents = "auto";
      chevron.style.transform = "rotate(180deg)";
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menuOpen) closeMenu();
      else openMenu();
    });

    document.addEventListener("click", () => closeMenu());

    wrap.appendChild(btn);
    wrap.appendChild(menu);

    // refresh label initially
    refreshLabel();
    return wrap;
  }

  ready(function () {
    if (!window.__i18n) return;

    // Avoid duplicates - clean up any statically saved duplicate element
    const existing = document.getElementById("langSelector");
    if (existing) {
      existing.remove();
    }

    const selector = buildSelector();

    // Try to place next to the auth CTA in the top navbar (no overlap)
    const cta = document.querySelector('[data-auth-button="cta"]');
    if (cta && cta.parentElement) {
      let wrap = document.getElementById("authLangWrap");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.id = "authLangWrap";
        wrap.style.display = "flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "10px";
        const parent = cta.parentElement;
        parent.insertBefore(wrap, cta);
        wrap.appendChild(cta);
      }
      wrap.appendChild(selector);
    } else {
      // Fallback: fixed in corner (pages without navbar)
      selector.style.position = "fixed";
      selector.style.top = "12px";
      selector.style.right = "12px";
      selector.style.zIndex = "99999";
      document.body.appendChild(selector);
    }

    window.__i18n.applyLang();
  });
})();

// Brand theme: override Tailwind orange accents with a saved primary color
(function () {
  function applyColor(c) {
    if (!c) return;
    document.documentElement.style.setProperty('--color-orange-500', c);
    document.documentElement.style.setProperty('--color-orange-600', c);
  }

  fetch('/api/site/theme')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var c = data && data.theme && data.theme.primaryColor;
      applyColor(c);
    })
    .catch(function () {});
})();
