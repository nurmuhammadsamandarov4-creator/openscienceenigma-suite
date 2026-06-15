function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function formatTime(s) {
  try {
    const iso = String(s || "").replace(" ", "T") + "Z";
    return new Date(iso).toLocaleString();
  } catch (e) { return s || ""; }
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

async function load() {
  const userId = localStorage.getItem("user_id");
  if (!userId) { location.href = "/public/signup.html"; return; }

  const msg = document.getElementById("msg");
  const rows = document.getElementById("rows");
  msg.textContent = window.t?window.t('admin_loading'):'Loading...';

  const res = await fetch("/api/admin/tasks/" + encodeURIComponent(userId));
  const data = await res.json().catch(()=>({}));

  if (!res.ok) {
    msg.textContent = data.error || (window.t?window.t('admin_error'):'Error');
    return;
  }

  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  msg.textContent = tasks.length ? "" : (window.t?window.t('admin_no_orders'):'No orders yet');

  rows.innerHTML = "";
  tasks.forEach((t, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td><b>${escapeHtml(t.owner_name)}</b><div class="muted">${escapeHtml(t.owner_email)}</div></td>
      <td>${escapeHtml(t.description).slice(0, 180)}${(t.description||"").length>180?"...":""}<div class="muted">${formatTime(t.created_at)}</div></td>
      <td><span class="status-badge ${statusClass(t.status)}">${escapeHtml(statusLabel(t.status))}</span></td>
      <td><b>${t.submissions_count}</b></td>
      <td><a class="btn btn-primary" href="/public/admin-order.html?id=${encodeURIComponent(t.id)}">${(window.t?window.t("open_link"):"Open")}</a></td>
    `;
    rows.appendChild(tr);
  });
  if (window.__i18n && window.__i18n.applyLang) window.__i18n.applyLang();
}

document.getElementById("logoutBtn").addEventListener("click", ()=>{
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_email");
  location.href = "/";
});

load();
