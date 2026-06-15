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

async function markDone() {
  const id = getId();
  const adminId = localStorage.getItem("user_id");
  const sendMsg = document.getElementById("sendMsg");
  if (!adminId) { sendMsg.textContent = window.t?window.t('order_login_required'):'Please login'; return; }

  if (!confirm((window.t?window.t('admin_done_btn'):'Complete') + '?')) return;

  sendMsg.textContent = window.t?window.t('processing'):'Processing...';
  const res = await fetch("/api/admin/tasks/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, taskId: Number(id) })
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    sendMsg.textContent = data.error || `Error (HTTP ${res.status})`;
    return;
  }
  sendMsg.textContent = window.t?window.t('admin_done_success'):'✅ Completed';
  await load();
}

async function markPaid() {
  const id = getId();
  const adminId = localStorage.getItem("user_id");
  const sendMsg = document.getElementById("sendMsg");
  if (!adminId) { sendMsg.textContent = window.t?window.t('order_login_required'):'Please login'; return; }

  if (!confirm((window.t?window.t('admin_paid_btn'):'Paid') + '?')) return;

  sendMsg.textContent = window.t?window.t('processing'):'Processing...';
  const res = await fetch("/api/admin/tasks/mark-paid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, taskId: Number(id) })
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    sendMsg.textContent = data.error || `Error (HTTP ${res.status})`;
    return;
  }

  const comm = data.commission?.amount_cents ? fmtUSD(data.commission.amount_cents) : null;
  sendMsg.textContent = comm
    ? (window.t?window.t('admin_paid_success_tpl',{amount:comm}):`✅ Paid! Referral +${comm}`)
    : (window.t?window.t('admin_paid_success'):'✅ Paid marked');
  await load();
}

async function load() {
  const userId = localStorage.getItem("user_id");
  if (!userId) { location.href = "/public/signup.html"; return; }

  const id = getId();
  const orderBox = document.getElementById("orderBox");
  const subsBox = document.getElementById("subsBox");

  const res = await fetch("/api/tasks/" + encodeURIComponent(id) + "?userId=" + encodeURIComponent(userId));
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    orderBox.innerHTML = "<b>Error:</b> " + escapeHtml(data.error || "unknown");
    subsBox.textContent = "";
    return;
  }

  const t = data.task;
  const atts = Array.isArray(data.attachments) ? data.attachments : [];
  const attHtml = atts.length 
    ? `<div class="modern-file-list">` + atts.map(a => `
        <a class="modern-file-card" href="/uploads/${encodeURIComponent(a.stored_name)}" target="_blank">
          <div class="file-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div class="file-info">
            <span class="file-name" title="${escapeHtml(a.original_name)}">${escapeHtml(a.original_name)}</span>
          </div>
          <div class="file-download-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </div>
        </a>
      `).join("") + "</div>"
    : `<div class="no-files-notice">${(window.t?window.t('order_no_files'):'No files')}</div>`;

  const paid = Number(t.is_paid || 0) === 1;
  const paidAmount = Number(t.paid_amount_cents || 0);

  const statusColorClass = statusClass(t.status);
  const statusText = statusLabel(t.status);

  orderBox.innerHTML = `
    <div class="order-meta-grid">
      <div class="meta-item-card">
        <span class="meta-label">${window.t ? window.t('admin_user') : 'User'}</span>
        <span class="meta-value">${escapeHtml(t.owner_name)}</span>
        <span class="meta-subvalue">${escapeHtml(t.owner_email)}</span>
      </div>
      <div class="meta-item-card">
        <span class="meta-label">${window.t ? window.t('th_status') : 'Status'}</span>
        <div><span class="status-badge ${statusColorClass}">${escapeHtml(statusText)}</span></div>
        <div>
          ${paid 
            ? `<span class="paid-badge done">${escapeHtml(window.t ? window.t('paid_label') : 'PAID')} ${fmtUSD(paidAmount || t.service_price_cents || 0)}</span>` 
            : `<span class="paid-badge unpaid">UNPAID</span>`
          }
        </div>
      </div>
      <div class="meta-item-card">
        <span class="meta-label">Selected Service</span>
        <span class="meta-value">${escapeHtml(t.service_name || "Custom Service")}</span>
        <span class="meta-subvalue price-tag">${fmtUSD(t.service_price_cents || 0)}</span>
      </div>
      <div class="meta-item-card">
        <span class="meta-label">Created Date</span>
        <span class="meta-value date-value">${t.created_at}</span>
        <span class="meta-subvalue">ID: #${id}</span>
      </div>
    </div>
    
    <div class="order-details-content">
      <div class="desc-section">
        <span class="section-title">${window.t ? window.t('order_desc_title') : 'Description'}</span>
        <div class="desc-body">${escapeHtml(t.description).replace(/\n/g, "<br>")}</div>
      </div>
      
      <div class="files-section">
        <span class="section-title">${window.t ? window.t('order_your_files') : 'Files'}</span>
        <div class="file-list-container">
          ${attHtml}
        </div>
      </div>
    </div>
  `;

  // Disable Paid button if already paid
  const paidBtn = document.getElementById('paidBtn');
  if (paidBtn) {
    paidBtn.disabled = paid;
    if (paid) paidBtn.style.opacity = '0.6';
  }

  await loadSubs();

  // If completed, block further messages/files
  if (String(t.status || '').toLowerCase() === 'done') {
    const sendBtn = document.getElementById('sendBtn');
    const msgEl = document.getElementById('message');
    const uploadZone = document.getElementById('uploadZone');
    const doneBtn = document.getElementById('doneBtn');
    if (sendBtn) sendBtn.disabled = true;
    if (msgEl) msgEl.disabled = true;
    if (uploadZone) {
      uploadZone.style.opacity = '0.5';
      uploadZone.style.pointerEvents = 'none';
    }
    if (doneBtn) doneBtn.style.display = 'none';
    const sendMsg = document.getElementById('sendMsg');
    if (sendMsg) sendMsg.textContent = window.t?window.t('order_closed_msg'):'✅ Completed.';
  }
  if (window.__i18n && window.__i18n.applyLang) window.__i18n.applyLang();
}

async function loadSubs() {
  const userId = localStorage.getItem("user_id");
  const id = getId();
  const subsBox = document.getElementById("subsBox");

  const sres = await fetch(`/api/tasks/${encodeURIComponent(id)}/submissions?userId=${encodeURIComponent(userId)}`);
  const sdata = await sres.json().catch(()=>({}));
  if (!sres.ok) {
    subsBox.innerHTML = `<div class="no-files-notice">${sdata.error || (window.t?window.t('admin_error'):'No access')}</div>`;
    return;
  }

  const subs = Array.isArray(sdata.submissions) ? sdata.submissions : [];
  if (!subs.length) {
    subsBox.innerHTML = `<div class="no-files-notice">${window.t?window.t('order_no_replies'):'No replies yet.'}</div>`;
    return;
  }

  subsBox.innerHTML = subs.map((s) => {
    const files = (s.attachments || []).map(a => `
      <a class="reply-file-chip" href="/uploads/${encodeURIComponent(a.stored_name)}" target="_blank">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <span class="chip-name" title="${escapeHtml(a.original_name)}">${escapeHtml(a.original_name)}</span>
      </a>
    `).join("");

    const isAdmin = String(s.sender_email).toLowerCase().includes('admin') || String(s.sender_name).toLowerCase().includes('admin');
    const senderInitials = (s.sender_name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    return `
      <div class="reply-item ${isAdmin ? 'admin-reply' : 'user-reply'}">
        <div class="reply-header">
          <div class="sender-avatar">${escapeHtml(senderInitials)}</div>
          <div class="sender-details">
            <span class="sender-name">${escapeHtml(s.sender_name)}</span>
            <span class="sender-email">${escapeHtml(s.sender_email)}</span>
          </div>
          <div class="reply-time">${s.created_at}</div>
        </div>
        <div class="reply-body">${escapeHtml(s.message || "").replace(/\n/g,"<br>")}</div>
        ${files ? `
          <div class="reply-files">
            <span class="reply-files-title">${window.t?window.t('order_files_label'):'Files'}</span>
            <div class="reply-files-list">${files}</div>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

// Setup Custom File Upload Interaction
const filesInput = document.getElementById('files');
const uploadZone = document.getElementById('uploadZone');
const fileListPreview = document.getElementById('fileListPreview');

if (uploadZone && filesInput) {
  uploadZone.addEventListener('click', (e) => {
    if (e.target.closest('.preview-remove-btn')) return;
    filesInput.click();
  });
  
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  ['dragleave', 'dragend', 'drop'].forEach(evt => {
    uploadZone.addEventListener(evt, () => {
      uploadZone.classList.remove('dragover');
    });
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      filesInput.files = e.dataTransfer.files;
      updateFilePreview();
    }
  });
  
  filesInput.addEventListener('change', () => {
    updateFilePreview();
  });
}

function updateFilePreview() {
  if (!fileListPreview) return;
  const files = filesInput.files ? Array.from(filesInput.files) : [];
  if (!files.length) {
    fileListPreview.innerHTML = '';
    fileListPreview.style.display = 'none';
    return;
  }
  
  fileListPreview.style.display = 'block';
  fileListPreview.innerHTML = files.map((f, index) => {
    const sizeStr = (f.size / (1024 * 1024)).toFixed(2) + ' MB';
    return `
      <div class="preview-item">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <span class="preview-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
        <span class="preview-size">${sizeStr}</span>
        <button type="button" class="preview-remove-btn" onclick="removeSelectedFile(${index})">&times;</button>
      </div>
    `;
  }).join('');
}

window.removeSelectedFile = function(index) {
  if (!filesInput) return;
  const dt = new DataTransfer();
  const { files } = filesInput;
  for (let i = 0; i < files.length; i++) {
    if (i !== index) dt.items.add(files[i]);
  }
  filesInput.files = dt.files;
  updateFilePreview();
};

document.getElementById("sendBtn").addEventListener("click", async () => {
  if (document.getElementById('sendBtn')?.disabled) return;
  const id = getId();
  const userId = localStorage.getItem("user_id");
  const sendMsg = document.getElementById("sendMsg");

  if (!userId) { sendMsg.textContent = window.t?window.t('order_login_required'):'Please login'; return; }

  const message = document.getElementById("message").value.trim();
  const files = filesInput.files ? Array.from(filesInput.files) : [];

  const fd = new FormData();
  fd.append("userId", userId);
  fd.append("message", message);
  for (const f of files) fd.append("files", f);

  sendMsg.textContent = window.t?window.t('order_sending'):'Sending...';
  const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/submissions`, { method: "POST", body: fd });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    sendMsg.textContent = data.error || `Error (HTTP ${res.status})`;
    return;
  }

  sendMsg.textContent = window.t?window.t('admin_send_success'):'✅ Sent';
  document.getElementById("message").value = "";
  filesInput.value = "";
  updateFilePreview();
  await loadSubs();
});

document.getElementById("doneBtn").addEventListener("click", markDone);
document.getElementById("paidBtn").addEventListener("click", markPaid);

load();
