function mustLogin() {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "/public/signup.html";
    return null;
  }
  return userId;
}

function fmtUSD(cents) {
  const v = (Number(cents || 0) / 100);
  return "$" + v.toFixed(2);
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

// Global lists to hold dynamic service values and files in memory
let loadedServicesList = [];
let selectedFiles = [];
let cart = {}; // { SVC100: 1, SVC200: 2 }

// DOM Elements
const filesEl = document.getElementById("files");
const submitBtn = document.getElementById("submitBtn");
const msg = document.getElementById("msg");
const descEl = document.getElementById("desc");
const serviceSelect = document.getElementById("serviceSelect");
const serviceNote = document.getElementById("serviceNote");
const dropzone = document.getElementById("dropzone");
const fileList = document.getElementById("fileList");
const serviceCardsContainer = document.getElementById("serviceCards");
const customAmountInput = document.getElementById("customAmountInput");
const clearCustomAmountBtn = document.getElementById("clearCustomAmountBtn");
const planNameEl = document.getElementById("summaryPlanName");
const originalPriceEl = document.getElementById("summaryOriginalPrice");
const discountRowEl = document.getElementById("summaryDiscountRow");
const discountAmountEl = document.getElementById("summaryDiscountAmount");
const totalPriceEl = document.getElementById("summaryTotalPrice");
const errorBanner = document.getElementById("errorBanner");

// Service feature bullet points
const serviceFeatures = {
  SVC100: ["Statistical Review of methods and tests for appropriateness", "Expert feedback on methods, results, and statistical analysis in research with actionable recommendations", "Statistical Review certificate confirming adherence to statistical reporting best practices"],
  SVC200: ["Complex quantitative data analysis (multivariate analysis, ANOVA, ANACOVA) using SPSS, R, STATA", "Identification of key results to establish significance", "Drawing of inferences and presenting relevant results in tables/graphs", "Interpretation of results in light of research questions"],
  SVC300: ["Research Design and Methods", "Systematic Review and Data Collection", "Data Analysis", "Manuscript Finalisation", "Research Publication"],
  SVC400: ["Language editing and proofreading", "Grammar, spelling, and punctuation correction", "Clarity and readability improvement"],
  SVC500: ["Full manuscript editing", "Structural and logical flow improvements", "Journal formatting and style guide compliance", "Language polishing for academic tone"],
  SVC600: ["Comprehensive editing + statistical review", "Custom turnaround time", "Unlimited revision rounds", "Dedicated editor and statistician support"],
};

// Drag and drop attachment event handlers
if (dropzone && filesEl) {
  dropzone.addEventListener("click", () => filesEl.click());
  
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  });

  filesEl.addEventListener("change", () => {
    if (filesEl.files) {
      addFiles(filesEl.files);
    }
  });
}

function addFiles(newFileList) {
  if (errorBanner) {
    errorBanner.style.display = "none";
    errorBanner.textContent = "";
  }
  const filesArray = Array.from(newFileList);
  
  if (selectedFiles.length + filesArray.length > 10) {
    const err = window.t ? window.t("max_files_exceeded") : "Siz ko'pi bilan 10 ta fayl yuklay olasiz.";
    alert(err);
    return;
  }

  for (const f of filesArray) {
    if (f.size > 500 * 1024 * 1024) {
      alert(`Fayl ${f.name} juda katta (limit: 500MB).`);
      return;
    }
  }

  selectedFiles = [...selectedFiles, ...filesArray];
  renderFileList();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderFileList() {
  if (!fileList) return;
  fileList.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-item";
    
    item.innerHTML = `
      <div class="file-item-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span>${escapeHtml(file.name)}</span>
        <span class="file-item-size">(${formatBytes(file.size)})</span>
      </div>
      <span class="file-item-remove" data-index="${index}">&times;</span>
    `;

    item.querySelector(".file-item-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      removeFile(index);
    });

    fileList.appendChild(item);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

// ── Cart functions ──
function addToCart(code) {
  if (!cart[code]) cart[code] = 0;
  cart[code]++;
  renderCartUI();
  updateCartSummary();
}

function updateCartQty(code, delta) {
  if (!cart[code]) cart[code] = 0;
  cart[code] = Math.max(0, cart[code] + delta);
  if (cart[code] === 0) delete cart[code];
  renderCartUI();
  updateCartSummary();
}

function renderCartUI() {
  loadedServicesList.forEach(s => {
    const qty = cart[s.code] || 0;
    const addBtn  = document.getElementById(`add-btn-${s.code}`);
    const qtyCtrl = document.getElementById(`qty-ctrl-${s.code}`);
    const qtyNum  = document.getElementById(`qty-num-${s.code}`);
    const card    = document.querySelector(`.service-card[data-code="${s.code}"]`);
    if (addBtn)  addBtn.style.display  = qty > 0 ? "none" : "flex";
    if (qtyCtrl) qtyCtrl.classList.toggle("visible", qty > 0);
    if (qtyNum)  qtyNum.textContent = qty;
    if (card)    card.classList.toggle("active", qty > 0);
  });
}

function updateCartSummary() {
  const items = loadedServicesList.filter(s => (cart[s.code] || 0) > 0);
  const summaryBody = document.querySelector(".summary-body");
  if (!summaryBody) return;

  // Find or create cart items container (replaces plan/price rows)
  let cartItemsEl = document.getElementById("summaryCartItems");
  if (!cartItemsEl) {
    cartItemsEl = document.createElement("div");
    cartItemsEl.id = "summaryCartItems";
    cartItemsEl.className = "summary-cart-items";
    // Insert before the divider
    const divider = summaryBody.querySelector(".summary-divider");
    if (divider) divider.before(cartItemsEl);
    else summaryBody.prepend(cartItemsEl);
    // Hide static plan/price rows
    if (planNameEl) planNameEl.closest(".summary-row")?.style.setProperty("display", "none");
    if (originalPriceEl) originalPriceEl.closest(".summary-row")?.style.setProperty("display", "none");
  }

  let totalCents = 0;

  if (items.length === 0) {
    cartItemsEl.innerHTML = `<div class="summary-cart-empty">No services selected</div>`;
    if (totalPriceEl) totalPriceEl.textContent = "$0.00";
    if (discountRowEl) discountRowEl.style.display = "none";
    window.__cartTotal = 0;
    return;
  }

  let totalDiscount = 0;
  let html = "";
  items.forEach(s => {
    const qty = cart[s.code];
    const priceCents    = s.display_price_cents  != null ? s.display_price_cents  : s.price_cents;
    const originalCents = s.original_price_cents != null ? s.original_price_cents : s.price_cents;
    const lineCents = priceCents * qty;
    const lineOriginal  = originalCents * qty;
    totalCents   += lineCents;
    totalDiscount += (lineOriginal - lineCents);
    html += `
      <div class="summary-cart-item">
        <div class="summary-cart-item-left">
          <span class="summary-cart-item-name">${escapeHtml(s.name)}</span>
          <span class="summary-cart-item-qty">×${qty}</span>
        </div>
        <span class="summary-cart-item-price">${fmtUSD(lineCents)}</span>
      </div>`;
  });

  cartItemsEl.innerHTML = html;

  if (totalDiscount > 0) {
    if (discountRowEl) discountRowEl.style.display = "flex";
    if (discountAmountEl) discountAmountEl.textContent = "-" + fmtUSD(totalDiscount);
  } else {
    if (discountRowEl) discountRowEl.style.display = "none";
  }

  if (totalPriceEl) totalPriceEl.textContent = fmtUSD(totalCents);
  window.__cartTotal = totalCents;
  window.__cartItems = items.map(s => ({ name: s.name, code: s.code, qty: cart[s.code], price: (s.display_price_cents != null ? s.display_price_cents : s.price_cents) / 100 }));
}

if (customAmountInput) {
  customAmountInput.addEventListener("input", () => {
    updateOrderSummary(serviceSelect ? serviceSelect.value : "");
  });
  customAmountInput.addEventListener("focus", () => {
    if (serviceCardsContainer) serviceCardsContainer.classList.add("disabled-cards");
    if (clearCustomAmountBtn) clearCustomAmountBtn.style.display = "block";
  });
}

if (clearCustomAmountBtn) {
  clearCustomAmountBtn.addEventListener("click", () => {
    if (customAmountInput) customAmountInput.value = "";
    if (serviceCardsContainer) serviceCardsContainer.classList.remove("disabled-cards");
    clearCustomAmountBtn.style.display = "none";
    updateOrderSummary(serviceSelect ? serviceSelect.value : "");
  });
}

async function loadServices() {
  if (!serviceSelect) return;

  const allowed = new Set(["SVC100", "SVC200", "SVC300", "SVC400", "SVC500", "SVC600"]);
  const u = new URL(location.href);
  const pre = (u.searchParams.get("service") || u.searchParams.get("svc") || "").trim().toUpperCase();

  try {
    const uid = localStorage.getItem('user_id');
    const url = uid ? `/api/services?userId=${encodeURIComponent(uid)}` : '/api/services';
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    const list = Array.isArray(j.services) ? j.services : [];
    
    const order = ["SVC100","SVC200","SVC300","SVC400","SVC500","SVC600"];
    loadedServicesList = list.filter(s => allowed.has(String(s.code || "").toUpperCase()))
                             .sort((a,b) => order.indexOf(a.code) - order.indexOf(b.code));

    serviceSelect.innerHTML = "";
    
    const serviceCardsContainer = document.getElementById("serviceCards");
    if (serviceCardsContainer) {
      serviceCardsContainer.innerHTML = "";
    }

    loadedServicesList.forEach((s, idx) => {
      // Setup options in select element
      const opt = document.createElement("option");
      opt.value = s.code;
      const display = (s.display_price_cents != null ? s.display_price_cents : s.price_cents);
      const original = (s.original_price_cents != null ? s.original_price_cents : s.price_cents);
      const disc = !!s.discount_applied && Number(display) < Number(original);
      opt.textContent = disc
        ? `${s.name} (${fmtUSD(display)} вместо ${fmtUSD(original)} • -${Math.round(Number(s.discount_rate||0)*100)}% 1-chi zakaz)`
        : `${s.name} (${fmtUSD(display)})`;
      serviceSelect.appendChild(opt);

      // Create service cards layout
      if (serviceCardsContainer) {
        const card = document.createElement("div");
        card.className = "service-card";
        card.dataset.code = s.code;
        card.dataset.group = ["SVC100","SVC200","SVC300"].includes(s.code) ? "data-analysis" : "editing";
        card.style.animation = "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both";
        card.style.animationDelay = (idx * 0.08) + "s";

        // Fetch bullet points from i18n
        const features = serviceFeatures[s.code] || [];
        const featuresHtml = features.map(f => {
          const trans = window.t ? window.t(f) : f;
          return `<li>${escapeHtml(trans)}</li>`;
        }).join("");

        const discBadge = disc 
          ? `<div class="service-card-badge">-${Math.round(Number(s.discount_rate||0)*100)}%</div>` 
          : "";

        const priceDisplay = fmtUSD(display);
        const originalDisplay = disc ? `<span class="service-card-original-price">${fmtUSD(original)}</span>` : "";

        const perOrder = (window.t && window.t("per_order")) || "/ order";
        card.innerHTML = `
          ${discBadge}
          <div style="width: 100%;">
            <div class="service-card-header">
              <div class="service-card-title">${escapeHtml(s.name)}</div>
            </div>
            <div class="service-card-price">
              ${priceDisplay} ${originalDisplay} <span>${perOrder}</span>
            </div>
          </div>
          <ul class="service-card-features">${featuresHtml}</ul>
          <div class="card-footer">
            <button class="btn-add-cart" id="add-btn-${s.code}">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Add
            </button>
            <div class="qty-control" id="qty-ctrl-${s.code}">
              <button class="qty-btn minus" id="minus-${s.code}">−</button>
              <span class="qty-number" id="qty-num-${s.code}">1</span>
              <button class="qty-btn" id="plus-${s.code}">+</button>
            </div>
          </div>
        `;

        card.querySelector(`#add-btn-${s.code}`).addEventListener("click", (e) => {
          e.stopPropagation();
          addToCart(s.code);
        });
        card.querySelector(`#minus-${s.code}`).addEventListener("click", (e) => {
          e.stopPropagation();
          updateCartQty(s.code, -1);
        });
        card.querySelector(`#plus-${s.code}`).addEventListener("click", (e) => {
          e.stopPropagation();
          updateCartQty(s.code, 1);
        });

        serviceCardsContainer.appendChild(card);
      }
    });

    // Tab switching
    function switchTab(tabName) {
      document.querySelectorAll('.service-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });
      document.querySelectorAll('.service-card').forEach(card => {
        card.style.display = card.dataset.group === tabName ? '' : 'none';
      });
    }

    document.querySelectorAll('.service-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Default Selection
    let defaultTab = "data-analysis";
    if (pre) {
      defaultTab = ["SVC400","SVC500","SVC600"].includes(pre) ? "editing" : "data-analysis";
    }
    switchTab(defaultTab);

  } catch (e) {
    if (serviceNote) {
      serviceNote.textContent = "Services load error: " + String(e?.message || e);
      serviceNote.style.display = "block";
    }
  }

  // Initialize empty cart summary
  updateCartSummary();
}

loadServices().then(() => {
  if (new URLSearchParams(window.location.search).get('from') === 'cart') {
    applyCartMode();
  }
});

// ── Cart Mode: hide service selection, show cart items in summary ──
function parsePriceToCents(str) {
  const n = parseFloat(String(str || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function applyCartMode() {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('ose_cart') || '[]'); } catch {}
  if (!cart.length) return;

  // Hide service selection block (cards + custom amount)
  const serviceBlock = document.getElementById('serviceCards')?.closest('.block');
  if (serviceBlock) serviceBlock.style.display = 'none';

  // Show cart items panel above description
  let totalCents = 0;
  const itemsHtml = cart.map(item => {
    const lineCents = parsePriceToCents(item.price) * (item.qty || 1);
    totalCents += lineCents;
    const qty = item.qty || 1;
    const qtyBadge = qty > 1
      ? `<span style="background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;margin-left:6px;">×${qty}</span>`
      : '';
    const lineStr = '$' + (lineCents / 100).toFixed(0);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:14px;font-weight:600;color:var(--text);">${escapeHtml(item.name)}${qtyBadge}</span>
      <span style="font-size:14px;font-weight:700;color:#2563eb;">${lineStr}</span>
    </div>`;
  }).join('');

  const cartPanel = document.createElement('div');
  cartPanel.className = 'block';
  cartPanel.innerHTML = `
    <p class="block-title" style="margin-bottom:12px;">Selected services</p>
    <div>${itemsHtml}</div>
    <div style="display:flex;justify-content:space-between;padding:12px 0;margin-top:4px;">
      <span style="font-size:15px;font-weight:700;color:var(--text);">Total</span>
      <span style="font-size:16px;font-weight:800;color:var(--text);">$${(totalCents/100).toFixed(0)}</span>
    </div>`;

  const descBlock = document.getElementById('desc')?.closest('.block');
  if (descBlock) descBlock.before(cartPanel);

  // Override summary panel on the right
  const rowsHtml = cart.map(item => {
    const lineCents = parsePriceToCents(item.price) * (item.qty || 1);
    const qty = item.qty || 1;
    const qtyLabel = qty > 1 ? ` ×${qty}` : '';
    return `<div class="summary-row">
      <span class="summary-label">${escapeHtml(item.name)}${qtyLabel}</span>
      <span class="summary-value">$${(lineCents/100).toFixed(0)}</span>
    </div>`;
  }).join('');

  const planRow = planNameEl?.closest('.summary-row');
  const priceRow = originalPriceEl?.closest('.summary-row');
  if (planRow) planRow.outerHTML = rowsHtml;
  if (priceRow) priceRow.remove();
  if (discountRowEl) discountRowEl.style.display = 'none';
  if (totalPriceEl) totalPriceEl.textContent = '$' + (totalCents / 100).toFixed(0);

  // Hide "Selected service: $X" note from API
  if (serviceNote) serviceNote.style.display = 'none';

  // Store for submit handler
  window.__cartMode = { totalCents, cart };
}

// Submit Handlers
submitBtn.addEventListener("click", async () => {
  const userId = mustLogin();
  if (!userId) return;

  if (errorBanner) {
    errorBanner.style.display = "none";
    errorBanner.textContent = "";
  }

  const description = descEl.value.trim();
  if (!description) {
    const errText = window.t ? window.t("error_desc_required") : "Iltimos, zakaz haqida batafsil yozing.";
    if (errorBanner) {
      errorBanner.textContent = errText;
      errorBanner.style.display = "block";
      errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      msg.textContent = errText;
    }
    return;
  }

  if (selectedFiles.length === 0) {
    const errText = window.t ? window.t("error_file_required") : "Iltimos, kamida bitta fayl yuklang!";
    if (errorBanner) {
      errorBanner.textContent = errText;
      errorBanner.style.display = "block";
      errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      msg.textContent = errText;
    }
    return;
  }

  let serviceCode = "SVC100";
  let customAmountCents = 0;

  if (window.__cartTotal > 0) {
    // Multi-service cart
    customAmountCents = window.__cartTotal;
    const codes = Object.keys(cart);
    serviceCode = codes.length === 1 ? codes[0] : "CART";
    // Append cart detail to description
    const cartDetail = (window.__cartItems || []).map(i => `${i.name} ×${i.qty} = $${(i.price * i.qty).toFixed(2)}`).join(", ");
    if (cartDetail) descEl.value = descEl.value + `\n\n[Services: ${cartDetail}]`;
  } else if (window.__cartMode && window.__cartMode.totalCents > 0) {
    customAmountCents = window.__cartMode.totalCents;
    serviceCode = (window.__cartMode.cart[0]?.service || serviceCode).toUpperCase();
  } else if (customAmountInput && customAmountInput.value) {
    const val = Number(customAmountInput.value);
    if (val > 0) {
      serviceCode = "CUSTOM";
      customAmountCents = Math.round(val * 100);
    }
  } else if (serviceSelect) {
    serviceCode = String(serviceSelect.value || "SVC100").trim();
  }

  submitBtn.disabled = true;
  msg.textContent = (window.t ? window.t("loading") : "Отправка...");

  const fd = new FormData();
  fd.append("userId", userId);
  fd.append("description", description);
  fd.append("serviceCode", serviceCode);
  if (customAmountCents > 0) fd.append("customAmountCents", customAmountCents);

  // Use the local selected files array (enables dynamic delete functionality)
  for (const f of selectedFiles) fd.append("files", f);

  const res = await fetch("/api/tasks", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    submitBtn.disabled = false;
    msg.textContent = (data.error || `Ошибка (HTTP ${res.status})`);
    return;
  }

  const taskId = data.taskId;
  const stripeEnabled = !!data.stripeEnabled;

  // Stripe payments integration
  if (stripeEnabled) {
    try {
      msg.textContent = (window.t ? window.t("redirecting_to_stripe") : "Redirecting to Stripe...");
      const r = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, serviceCode, customAmountCents })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        submitBtn.disabled = false;
        msg.textContent = j.error || "Stripe error";
        return;
      }

      try {
        await fetch(`/api/tasks/${encodeURIComponent(taskId)}/link-purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId, purchaseId: j.purchaseId })
        });
      } catch (e) {}

      if (window.__cartMode) localStorage.removeItem('ose_cart');
      window.location.href = j.url;
      return;
    } catch (e) {
      submitBtn.disabled = false;
      msg.textContent = String(e?.message || e);
      return;
    }
  }

  submitBtn.disabled = false;
  msg.textContent = "✅ " + (window.t ? window.t("submit_order") : "Zakazingiz ketti");
  localStorage.setItem("toast", "✅ Zakazingiz ketti");
  if (window.__cartMode) localStorage.removeItem('ose_cart');
  window.location.href = "/public/dashboard.html";
});

if (descEl) {
  descEl.addEventListener("input", () => {
    if (errorBanner) {
      errorBanner.style.display = "none";
      errorBanner.textContent = "";
    }
  });
}
