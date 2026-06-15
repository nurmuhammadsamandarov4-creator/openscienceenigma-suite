function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

async function loadDashboard() {
  const userId = localStorage.getItem("user_id");

  // Stripe return status toast
  try {
    const sp = new URLSearchParams(location.search);
    const stripeStatus = sp.get('stripe');
    if (stripeStatus) {
      const dashMsgEl = document.getElementById('dashMsg');
      if (dashMsgEl) {
        if (stripeStatus === 'success') dashMsgEl.textContent = '✅ Payment success. Webhook komissiyani avtomatik yozadi.';
        else if (stripeStatus === 'cancel') dashMsgEl.textContent = '⚠️ Payment cancelled.';
      }
      const url = new URL(location.href);
      url.searchParams.delete('stripe');
      url.searchParams.delete('purchase');
      url.searchParams.delete('session_id');
      history.replaceState({}, '', url.toString());
    }
  } catch (e) {}

  const toast = localStorage.getItem('toast');
  if (toast) {
    const dashMsgEl = document.getElementById('dashMsg');
    if (dashMsgEl) {
      dashMsgEl.textContent = toast;
    }
    localStorage.removeItem('toast');
  }

  if (!userId) {
    window.location.href = "/public/signup.html";
    return;
  }

  // Admin access validation
  try {
    const b = document.getElementById('browseOrdersBtn');
    if (b) {
      const r = await fetch('/api/is-admin/' + encodeURIComponent(userId));
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.isAdmin) b.style.display = '';
      else b.style.display = 'none';
    }
  } catch (e) {}

  const meEl = document.getElementById("me");
  const top10RemainingEl = document.getElementById("top10");
  const top3El = document.getElementById("top3Podium");
  const remainingBox = document.getElementById("top10RemainingBox");
  const refLinkBox = document.getElementById("refLinkBox");
  const refLinkInput = document.getElementById("refLinkInput");
  const copyBtn = document.getElementById("copyLinkBtn");
  const dashMsg = document.getElementById("dashMsg");

  dashMsg.textContent = (window.t ? window.t("loading") : "Loading...");

  const res = await fetch("/api/dashboard/" + encodeURIComponent(userId));
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    dashMsg.textContent = data.error || (window.t ? window.t("error_loading") : "Error loading dashboard");
    return;
  }

  const link = `${location.origin}/r/${data.user.referral_code}`;

  const initials = data.user.name ? data.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
  meEl.innerHTML = `
    <div class="profile-header-card">
      <div class="profile-avatar">${initials}</div>
      <div class="profile-info">
        <div class="profile-name">${escapeHtml(data.user.name)}</div>
        <div class="profile-email">${escapeHtml(data.user.email)}</div>
        <div class="profile-badge-pill">
          <span class="pill-dot"></span>
          ${window.t ? window.t("you_invited_tpl", {count: data.myReferrals}) : ("You invited: " + data.myReferrals + " users")}
        </div>
      </div>
    </div>
  `;

  // Update visual referral link widgets
  if (refLinkInput) {
    refLinkInput.value = link;
  }
  if (refLinkBox) {
    refLinkBox.innerHTML = `<a href="${link}">${link}</a>`;
  }

  if (copyBtn && !copyBtn.dataset.bound) {
    copyBtn.dataset.bound = "1";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(link).then(() => {
        const textSpan = document.getElementById("copyBtnText");
        const iconEl = document.getElementById("copyIcon");
        if (textSpan) textSpan.textContent = "Copied!";
        if (iconEl) {
          iconEl.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />`;
        }
        
        setTimeout(() => {
          if (textSpan) textSpan.textContent = "Copy";
          if (iconEl) {
            iconEl.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125v-10.5z" />`;
          }
        }, 2000);
      });
    });
  }

  // Clean elements
  if (top3El) top3El.innerHTML = "";
  if (top10RemainingEl) top10RemainingEl.innerHTML = "";
  if (remainingBox) remainingBox.style.display = "none";

  const leaderboardList = Array.isArray(data.top10) ? data.top10 : [];
  
  // Format visual Top 3 Podium
  const top3 = leaderboardList.slice(0, 3);
  const slots = [null, null, null]; // visual indices [Rank 2, Rank 1, Rank 3]
  top3.forEach((user, idx) => {
    if (idx === 0) slots[1] = { user, rank: 1 };
    else if (idx === 1) slots[0] = { user, rank: 2 };
    else if (idx === 2) slots[2] = { user, rank: 3 };
  });

  slots.forEach((slot) => {
    if (!slot) return;
    const { user, rank } = slot;
    const initials = user.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
    const referrals = user.referrals ?? user.referrals_count ?? 0;
    
    const card = document.createElement("div");
    card.className = `podium-card rank-${rank}`;
    card.style.animation = "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both";
    card.style.animationDelay = (rank === 1 ? 0.15 : (rank === 2 ? 0.05 : 0.25)) + "s";
    
    const crownHtml = rank === 1 ? `<div class="podium-crown">👑</div>` : "";
    
    card.innerHTML = `
      ${crownHtml}
      <div class="podium-badge">${rank}</div>
      <div class="podium-initials">${initials}</div>
      <div class="podium-name" title="${escapeHtml(user.name)}">${escapeHtml(user.name)}</div>
      <div class="podium-code"><code>${escapeHtml(user.referral_code)}</code></div>
      <div>
        <div class="podium-referrals-count">${referrals}</div>
        <div class="podium-referrals-label">Referrals</div>
      </div>
    `;
    if (top3El) top3El.appendChild(card);
  });

  // Format ranks 4-10 remaining list
  const remaining = leaderboardList.slice(3);
  if (remaining.length > 0) {
    if (remainingBox) remainingBox.style.display = "block";
    remaining.forEach((u, i) => {
      const rank = i + 4;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${rank}</b></td>
        <td>${escapeHtml(u.name)}</td>
        <td><code>${escapeHtml(u.referral_code)}</code></td>
        <td style="text-align: right; font-weight: 700; color: var(--primary-color);">${(u.referrals ?? u.referrals_count ?? 0)}</td>
      `;
      if (top10RemainingEl) top10RemainingEl.appendChild(tr);
    });
  }

  // Invited people list
  const invitedListEl = document.getElementById("invitedList");
  const invitedEmptyEl = document.getElementById("invitedEmpty");
  const invitedTableWrap = document.getElementById("invitedTableWrap");
  if (invitedListEl && invitedEmptyEl && invitedTableWrap) {
    invitedListEl.innerHTML = "";
    const invited = Array.isArray(data.invited) ? data.invited : [];
    if (invited.length === 0) {
      invitedEmptyEl.style.display = "block";
      invitedTableWrap.style.display = "none";
    } else {
      invitedEmptyEl.style.display = "none";
      invitedTableWrap.style.display = "block";
      invited.forEach((p, idx) => {
        const tr = document.createElement("tr");
        const when = p.created_at ? new Date(p.created_at.replace(" ", "T") + "Z").toLocaleString() : "";
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${escapeHtml(p.name || "")}</td>
          <td>${escapeHtml(p.email || "")}</td>
          <td>${when}</td>
        `;
        invitedListEl.appendChild(tr);
      });
    }
  }

  // Referral earnings metrics
  const summaryEl = document.getElementById("earningsSummary");
  const commListEl = document.getElementById("commissionsList");
  const commEmptyEl = document.getElementById("commissionsEmpty");
  const commissionsTableWrap = document.getElementById("commissionsTableWrap");
  const buyBtn = document.getElementById("buyServiceBtn");
  const svcSelect = document.getElementById("serviceSelect");
  const buyMsgEl = document.getElementById("buyMsg");

  function fmtUSD(cents) {
    const v = (Number(cents || 0) / 100);
    return "$" + v.toFixed(2);
  }

  if (summaryEl) {
    const sums = data.referralEarnings?.sums || {};
    const wallet = Number(data.referralEarnings?.wallet_balance_cents || 0);
    summaryEl.innerHTML = `
      <div class="metric-card">
        <div class="metric-label" data-i18n="ref_total">Total</div>
        <div class="metric-value">${fmtUSD(sums.total_cents)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label" data-i18n="ref_earned">Earned</div>
        <div class="metric-value">${fmtUSD(sums.earned_cents)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label" data-i18n="ref_paid">Paid</div>
        <div class="metric-value">${fmtUSD(sums.paid_cents)}</div>
      </div>
      <div class="metric-card wallet">
        <div class="metric-label" data-i18n="wallet">Wallet</div>
        <div class="metric-value">${fmtUSD(wallet)}</div>
      </div>
    `;
  }

  // Referral Commission History
  if (commListEl && commEmptyEl && commissionsTableWrap) {
    commListEl.innerHTML = "";
    const items = Array.isArray(data.referralEarnings?.items) ? data.referralEarnings.items : [];
    if (!items.length) {
      commEmptyEl.style.display = "block";
      commissionsTableWrap.style.display = "none";
    } else {
      commEmptyEl.style.display = "none";
      commissionsTableWrap.style.display = "block";
      items.forEach((c, idx) => {
        const when = c.created_at ? new Date(c.created_at.replace(" ", "T") + "Z").toLocaleString() : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${escapeHtml(c.buyer_name || "")} <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(c.buyer_email || "")}</div></td>
          <td><b>${escapeHtml(c.service_name || "-")}</b></td>
          <td>${fmtUSD(c.purchase_amount_cents)}</td>
          <td>${Math.round((Number(c.rate || 0) * 100))}%</td>
          <td><b>${fmtUSD(c.amount_cents)}</b></td>
          <td>${when}</td>
          <td><span class="pill done">${escapeHtml(c.status || "-")}</span></td>
        `;
        commListEl.appendChild(tr);
      });
    }
  }

  // Populate services dropdown
  if (svcSelect && Array.isArray(data.services)) {
    const current = svcSelect.value;
    svcSelect.innerHTML = "";
    data.services.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.code;
      opt.textContent = `${s.name} (${fmtUSD(s.price_cents)})`;
      svcSelect.appendChild(opt);
    });
    if (current && [...svcSelect.options].some(o=>o.value===current)) svcSelect.value = current;
  }

  // Stripe buy options hook
  if (buyBtn && svcSelect && !buyBtn.dataset.bound) {
    buyBtn.dataset.bound = "1";
    buyBtn.addEventListener("click", async () => {
      buyBtn.disabled = true;
      if (buyMsgEl) buyMsgEl.innerHTML = `<span style="color:var(--text-muted);">${window.t ? window.t("processing") : "Processing..."}</span>`;
      try {
        if (data.stripeEnabled) {
          const r = await fetch("/api/stripe/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userId, serviceCode: svcSelect.value })
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) {
            if (buyMsgEl) buyMsgEl.innerHTML = `<span style="color:#ef4444;">${j.error || "Stripe error"}</span>`;
          } else {
            if (buyMsgEl) buyMsgEl.innerHTML = `<span style="color:var(--text-muted);">${window.t ? window.t("redirecting_to_stripe") : "Redirecting to Stripe..."}</span>`;
            window.location.href = j.url;
          }
        } else {
          // Demo fallback
          const r = await fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userId, serviceCode: svcSelect.value })
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) {
            if (buyMsgEl) buyMsgEl.innerHTML = `<span style="color:#ef4444;">${j.error || "Error"}</span>`;
          } else {
            const comm = j.commission?.amount_cents;
            if (comm && buyMsgEl) {
              buyMsgEl.innerHTML = `<span style="color:#16a34a;">${window.t ? window.t("purchase_ok_comm_tpl").replace("{amount}", fmtUSD(comm)) : ("✅ Purchase OK. Commission: " + fmtUSD(comm))}</span>`;
            } else {
              if (buyMsgEl) buyMsgEl.innerHTML = `<span style="color:#16a34a;">${window.t ? window.t("purchase_ok_no_ref") : "✅ Purchase OK. No referrer for this user."}</span>`;
            }
            await loadDashboard();
          }
        }
      } catch (e) {
        if (buyMsgEl) buyMsgEl.innerHTML = `<span style="color:#ef4444;">${String(e?.message || e)}</span>`;
      } finally {
        buyBtn.disabled = false;
      }
    });
  }

  if (window.__i18n && window.__i18n.applyLang) window.__i18n.applyLang();

  // Load orders subtable
  await loadMyTasks(userId);

  dashMsg.textContent = window.t ? window.t("updated") : "✅ Updated";
  setTimeout(() => {
    dashMsg.textContent = "";
  }, 3000);
}

// Subtable: My tasks/orders
async function loadMyTasks(userId) {
  const myTasksEl = document.getElementById("myTasks");
  const myTasksEmptyEl = document.getElementById("myTasksEmpty");
  const myTasksTableWrap = document.getElementById("myTasksTableWrap");
  if (!myTasksEl || !myTasksEmptyEl) return;

  const res = await fetch("/api/my/tasks/" + encodeURIComponent(userId));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    myTasksEl.innerHTML = "";
    myTasksEmptyEl.style.display = "block";
    myTasksEmptyEl.textContent = data.error || "Error loading tasks";
    if (myTasksTableWrap) myTasksTableWrap.style.display = "none";
    return;
  }

  function statusLabel(s) {
    const v = String(s || "").toLowerCase();
    const tt = (window.t || ((k)=>k));
    if (v === "sent") return tt("status_sent");
    if (v === "in_progress") return tt("status_in_progress");
    if (v === "done") return tt("status_done");
    if (v === "open") return tt("status_open");
    return s || "-";
  }

  function statusClass(s) {
    const v = String(s || "").toLowerCase();
    if (v === "done") return "done";
    if (v === "sent") return "sent";
    if (v === "in_progress") return "in_progress";
    if (v === "open") return "open";
    return "";
  }

  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  if (!tasks.length) {
    myTasksEl.innerHTML = "";
    myTasksEmptyEl.style.display = "block";
    if (myTasksTableWrap) myTasksTableWrap.style.display = "none";
    return;
  }
  myTasksEmptyEl.style.display = "none";
  if (myTasksTableWrap) myTasksTableWrap.style.display = "block";

  myTasksEl.innerHTML = "";
  tasks.forEach((t, i) => {
    const tr = document.createElement("tr");
    const shortDesc = (t.description || "").length > 80 ? (t.description || "").slice(0, 80) + "..." : (t.description || "");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>
        <div><b>${fmtUSD(t.service_price_cents || 0)} ${window.t ? window.t("order_label") : "zakaz"}</b></div>
        <div class="muted" style="margin-top:2px; font-size:12px;">${escapeHtml(shortDesc)}</div>
      </td>
      <td><span class="pill ${statusClass(t.status)}">${statusLabel(t.status)}</span></td>
      <td><b>${t.submissions_count}</b></td>
      <td><a class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;" href="/public/order.html?id=${encodeURIComponent(t.id)}">${(window.t?window.t("open_link"):"Open")}</a></td>
    `;
    myTasksEl.appendChild(tr);
  });
}

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch (e) {}
  localStorage.removeItem("user_id");
  localStorage.removeItem("admin_id");
  localStorage.removeItem("ose_admin_user");
  window.location.href = "/";
});

loadDashboard();
