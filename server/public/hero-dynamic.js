(function(){
  "use strict";

  const API = "/api/site/hero";

  function getLang(){
    try{
      const v = (localStorage.getItem("ose_lang")||"").toLowerCase();
      if (v==="en"||v==="ru"||v==="uz") return v;
    }catch(e){}
    return "uz";
  }

  function pickLang(obj, lang){
    if (!obj || typeof obj !== "object") return "";
    return (obj[lang] || obj.en || obj.ru || obj.uz || "");
  }

  function qs(id){ return document.getElementById(id); }

  async function loadHero(){
    try{
      const res = await fetch(API, { cache: "no-store", credentials:"include" });
      const json = await res.json().catch(()=> ({}));
      if (!json || !json.ok || !json.hero) return null;
      return json.hero;
    }catch(e){
      return null;
    }
  }

  function apply(hero){
    if (!hero) return;
    const lang = getLang();
    const h = hero[lang] || hero.en || hero.uz || hero.ru || {};
    // Badge: if admin sets full badge text, prefer that
    const badgeEl = qs("oseHeroBadge");
    const badgeText = (h.badge || "").trim();
    if (badgeEl && badgeText){
      // Replace pill content with just the badge text (keeps the pill styling)
      badgeEl.innerHTML = '<span id="oseHeroBadgeText"></span>';
      const t = qs("oseHeroBadgeText");
      if (t) t.textContent = badgeText;
    }

    const titleEl = qs("oseHeroTitle");
    if (titleEl && h.title) titleEl.textContent = h.title;

    const subEl = qs("oseHeroSubtitle");
    if (subEl && h.subtitle) subEl.textContent = h.subtitle;

    const cta1 = qs("oseHeroCtaPrimary");
    if (cta1){
      if (h.ctaPrimaryLabel) cta1.textContent = h.ctaPrimaryLabel;
      if (h.ctaPrimaryHref) cta1.setAttribute("href", h.ctaPrimaryHref);
    }

    const cta2 = qs("oseHeroCtaSecondary");
    if (cta2){
      if (h.ctaSecondaryLabel) cta2.textContent = h.ctaSecondaryLabel;
      if (h.ctaSecondaryHref) cta2.setAttribute("href", h.ctaSecondaryHref);
    }

    const stats = Array.isArray(h.stats) ? h.stats : [];
    const slots = [
      {v:"oseHeroStat0Val", l:"oseHeroStat0Label"},
      {v:"oseHeroStat1Val", l:"oseHeroStat1Label"},
      {v:"oseHeroStat2Val", l:"oseHeroStat2Label"},
    ];
    slots.forEach((slot, i) => {
      const valEl = qs(slot.v);
      const labEl = qs(slot.l);
      const it = stats[i];
      if (!it){
        // hide if missing
        if (valEl && valEl.parentElement) valEl.parentElement.style.display = "none";
        return;
      }
      if (valEl && it.value) {
        const raw = String(it.value).trim();
        const cleaned = raw.replace(/\s*(x|%)\s*$/i,'').trim();
        valEl.textContent = cleaned || raw;
      }
      if (labEl && it.label) labEl.textContent = it.label;
    });
  }

  let cachedHero = null;

  async function refresh(){
    cachedHero = await loadHero();
    if (cachedHero) apply(cachedHero);
  }

  // Initial load after DOM ready
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  // Re-apply on language changes
  window.addEventListener("ose:lang", () => {
    if (cachedHero) apply(cachedHero);
    else refresh();
  });
})();
