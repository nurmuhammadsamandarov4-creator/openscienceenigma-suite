function getId() {
  const u = new URL(location.href);
  return u.searchParams.get("id");
}
function fmtUSD(cents){
  const v = (Number(cents || 0) / 100);
  return "$" + v.toFixed(2);
}
function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
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

// Hook up the file attach button triggers
const filesInput = document.getElementById("files");
const attachBtn = document.getElementById("attachBtn");
const fileCountIndicator = document.getElementById("fileCountIndicator");

if (attachBtn && filesInput) {
  attachBtn.addEventListener("click", () => filesInput.click());
  filesInput.addEventListener("change", () => {
    const count = filesInput.files ? filesInput.files.length : 0;
    if (fileCountIndicator) {
      fileCountIndicator.textContent = count ? `(${count} file)` : "";
    }
  });
}

async function load() {
  const userId = localStorage.getItem("user_id");
  if (!userId) { location.href = "/public/signup.html"; return; }

  const id = getId();
  if (!id) return;

  const orderBox = document.getElementById("orderBox");
  const subsMsg = document.getElementById("subsMsg");
  const subsBox = document.getElementById("subsBox");

  // Fetch Order details
  const res = await fetch("/api/tasks/" + encodeURIComponent(id) + "?userId=" + encodeURIComponent(userId));
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    orderBox.innerHTML = "<b>Error:</b> " + escapeHtml(data.error || "unknown");
    subsMsg.textContent = "";
    return;
  }

  const t = data.task;
  const atts = Array.isArray(data.attachments) ? data.attachments : [];

  // Populate primary description
  orderBox.innerHTML = `
    <div style="font-size: 0.975rem; line-height: 1.7; color: var(--text-main); white-space: pre-line;">${escapeHtml(t.description)}</div>
  `;

  // Populate sidebar metadata card
  const sidebarMetaBox = document.getElementById("sidebarMetaBox");
  if (sidebarMetaBox) {
    sidebarMetaBox.style.display = "block";
    const metaStatus = document.getElementById("metaStatus");
    const metaCreated = document.getElementById("metaCreated");
    const metaPlanName = document.getElementById("metaPlanName");
    const metaPaidAmount = document.getElementById("metaPaidAmount");

    const paid = Number(t.is_paid || 0) === 1;
    const paidAmount = Number(t.paid_amount_cents || 0);
    const paidLabelText = window.t ? window.t('paid_label') : 'PAID';
    const unpaidLabelText = window.t ? window.t('unpaid_label') : 'UNPAID';
    const paidPillHtml = paid
      ? `<span class="pill done">${escapeHtml(paidLabelText)}</span> ${fmtUSD(paidAmount || t.service_price_cents || 0)}`
      : `<span class="pill open" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">${escapeHtml(unpaidLabelText)}</span>`;

    if (metaStatus) metaStatus.innerHTML = `<span class="pill ${statusClass(t.status)}">${escapeHtml(statusLabel(t.status))}</span>`;
    if (metaCreated) metaCreated.textContent = t.created_at || "-";
    if (metaPlanName) metaPlanName.innerHTML = `<b>${escapeHtml(t.service_name || "")}</b> (${fmtUSD(t.service_price_cents || 0)})`;
    if (metaPaidAmount) metaPaidAmount.innerHTML = paidPillHtml;
  }

  // Populate sidebar user attachments
  const sidebarFilesBox = document.getElementById("sidebarFilesBox");
  const metaFilesContainer = document.getElementById("metaFilesContainer");
  if (sidebarFilesBox && metaFilesContainer) {
    if (atts.length) {
      sidebarFilesBox.style.display = "block";
      metaFilesContainer.innerHTML = atts.map(a => `
        <a href="/uploads/${encodeURIComponent(a.stored_name)}" target="_blank" class="file-download-card">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${escapeHtml(a.original_name)}</span>
        </a>
      `).join("");
    } else {
      sidebarFilesBox.style.display = "none";
      metaFilesContainer.innerHTML = "";
    }
  }

  // Fetch admin replies (submissions)
  const sres = await fetch(`/api/tasks/${encodeURIComponent(id)}/submissions?userId=${encodeURIComponent(userId)}`);
  const sdata = await sres.json().catch(()=>({}));
  if (!sres.ok) {
    subsMsg.textContent = sdata.error || (window.t?window.t('order_no_replies'):'No replies');
    subsBox.innerHTML = "";
    return;
  }

  const subs = Array.isArray(sdata.submissions) ? sdata.submissions : [];
  if (!subs.length) {
    subsMsg.textContent = window.t?window.t('order_no_replies'):'No replies yet.';
    subsBox.innerHTML = "";
    return;
  }
  subsMsg.textContent = "";

  subsBox.innerHTML = subs.map((s, idx) => {
    // Determine sender role using owner check
    const isSupport = Number(s.sender_user_id) !== Number(t.owner_user_id);
    const files = (s.attachments || []).map(a => `
      <a href="/uploads/${encodeURIComponent(a.stored_name)}" target="_blank" class="file-download-card">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${escapeHtml(a.original_name)}</span>
      </a>
    `).join("");

    const badgeHtml = isSupport 
      ? `<span class="badge">Support Team</span>` 
      : `<span class="badge" style="background: #e2e8f0; color: #475569;">You</span>`;

    return `
      <div class="timeline-item ${isSupport ? 'admin' : ''}" style="animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: ${idx * 0.08}s;">
        <div class="timeline-header">
          <div class="timeline-sender">
            <span>${escapeHtml(s.sender_name || (isSupport ? 'Admin' : 'User'))}</span>
            ${badgeHtml}
          </div>
          <span class="timeline-time">${s.created_at}</span>
        </div>
        <div class="timeline-content">${escapeHtml(s.message || "").replace(/\n/g,"<br>")}</div>
        ${files ? `<div class="timeline-files">${files}</div>` : ""}
      </div>
    `;
  }).join("");

  // Disable replies if order is closed/done
  if (String(t.status || '').toLowerCase() === 'done') {
    const sendBtn = document.getElementById('sendBtn');
    const msgEl = document.getElementById('message');
    const filesEl = document.getElementById('files');
    if (sendBtn) sendBtn.disabled = true;
    if (msgEl) msgEl.disabled = true;
    if (filesEl) filesEl.disabled = true;
    const sendMsg = document.getElementById('sendMsg');
    if (sendMsg) {
      sendMsg.innerHTML = `<span style="color:#16a34a; font-weight:600;">${window.t?window.t('order_closed_msg'):'✅ Completed.'}</span>`;
    }
  }
  if (window.__i18n && window.__i18n.applyLang) window.__i18n.applyLang();
}

document.getElementById("sendBtn")?.addEventListener("click", async () => {
  if (document.getElementById('sendBtn')?.disabled) return;
  const id = getId();
  const userId = localStorage.getItem("user_id");
  const sendMsg = document.getElementById("sendMsg");
  if (!userId) { 
    sendMsg.innerHTML = `<span style="color:#ef4444;">${window.t?window.t('order_login_required'):'Please login'}</span>`; 
    return; 
  }
  if (!id) return;

  const message = document.getElementById("message")?.value?.trim() || "";
  const files = filesInput?.files ? Array.from(filesInput.files) : [];

  if (!message && !files.length) {
    sendMsg.innerHTML = `<span style="color:#ef4444;">Iltimos, xabar yozing yoki fayl biriktiring.</span>`;
    return;
  }

  const fd = new FormData();
  fd.append("userId", userId);
  fd.append("message", message);
  for (const f of files) fd.append("files", f);

  sendMsg.innerHTML = `<span style="color:var(--text-muted);">${window.t?window.t('order_sending'):'Sending...'}</span>`;
  const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/submissions`, { method: "POST", body: fd });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    sendMsg.innerHTML = `<span style="color:#ef4444;">${data.error || `Error (HTTP ${res.status})`}</span>`;
    return;
  }
  sendMsg.innerHTML = `<span style="color:#16a34a; font-weight:600;">${window.t?window.t('order_sent'):'✅ Sent'}</span>`;
  
  if (document.getElementById("message")) document.getElementById("message").value = "";
  if (filesInput) filesInput.value = "";
  if (fileCountIndicator) fileCountIndicator.textContent = "";
  
  await load();
});

load();
