/**
 * OSE Animation System — stable, lightweight
 */
(function () {
  'use strict';

  /* ── CSS ─────────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    /* Scroll progress bar */
    #ose-progress {
      position: fixed;
      top: 0; left: 0;
      height: 3px;
      width: 0%;
      background: linear-gradient(90deg, #3C50E0, #6366f1);
      z-index: 999999;
      pointer-events: none;
      transition: width 0.1s linear;
    }

    /* Navbar glass on scroll */
    .ose-nav-scrolled {
      background: rgba(255,255,255,0.88) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      box-shadow: 0 1px 32px rgba(0,0,0,0.07) !important;
    }

    /* Scroll reveal */
    .ose-hidden {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1),
                  transform 0.65s cubic-bezier(0.16,1,0.3,1);
      will-change: opacity, transform;
    }
    .ose-hidden.ose-shown {
      opacity: 1;
      transform: translateY(0);
    }

    /* Team card hover lift */
    .ose-electric-card {
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1),
                  box-shadow 0.3s cubic-bezier(0.16,1,0.3,1) !important;
    }
    .ose-electric-card:hover {
      transform: translateY(-6px) scale(1.02) !important;
      box-shadow: 0 20px 48px rgba(0,0,0,0.14) !important;
    }

    /* Sparkle pulse */
    @keyframes ose-spin-slow {
      to { transform: rotate(345deg); }
      from { transform: rotate(-15deg); }
    }

    /* Counter number */
    .ose-count-el {
      display: inline-block;
    }
  `;
  document.head.appendChild(style);

  /* ── Progress bar ───────────────────────────────────────────── */
  const bar = document.createElement('div');
  bar.id = 'ose-progress';
  document.body.prepend(bar);

  window.addEventListener('scroll', function () {
    var scrolled = window.scrollY;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
  }, { passive: true });

  /* ── Navbar glass ───────────────────────────────────────────── */
  var nav = document.querySelector('nav.fixed');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('ose-nav-scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  /* ── Intersection Observer reveal ──────────────────────────── */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('ose-shown');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function markReveal(selector, delay) {
    document.querySelectorAll(selector).forEach(function (el, i) {
      el.classList.add('ose-hidden');
      el.style.transitionDelay = (delay || 0) + (i * 0.08) + 's';
      revealObserver.observe(el);
    });
  }

  /* ── Stats counter ──────────────────────────────────────────── */
  function countUp(el, target, duration) {
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  function setupCounters() {
    ['oseHeroStat0Val', 'oseHeroStat1Val', 'oseHeroStat2Val'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var target = parseFloat(el.textContent) || 0;
      el.textContent = '0';
      var obs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          countUp(el, target, 1400);
          obs.disconnect();
        }
      }, { threshold: 0.5 });
      obs.observe(el);
    });
  }

  /* ── Team card hover (applied after dynamic load) ───────────── */
  function applyCardHover() {
    // CSS handles it via .ose-electric-card selector — no JS needed
  }

  /* ── Init on DOM ready ──────────────────────────────────────── */
  function init() {
    setupCounters();

    // Reveal section headings and descriptions
    markReveal('section h2', 0);
    markReveal('section > div > p.text-zinc-500', 0.12);
    markReveal('.border-y .flex.flex-col.items-center', 0);

    // Re-observe after team/pricing sections render dynamically
    setTimeout(function () {
      markReveal('#pricingCards > div', 0);
      markReveal('#testimonialsCards > div', 0);
    }, 1200);
    setTimeout(function () {
      markReveal('#pricingCards > div', 0);
      markReveal('#testimonialsCards > div', 0);
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
