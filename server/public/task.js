function getTaskId() {
  const u = new URL(location.href);
  return u.searchParams.get("id");
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

async function loadTask() {
  const id = getTaskId();
  const box = document.getElementById("taskBox");
  const subsBox = document.getElementById("subsBox");

  if (!id) {
    box.innerHTML = "<b>Task ID yo‘q</b>";
    return;
  }

  const res = await fetch("/api/tasks/" + encodeURIComponent(id));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    box.innerHTML = `<b>Error:</b> ${escapeHtml(data.error || "unknown")}`;
    return;
  }

  const t = data.task;
  const atts = Array.isArray(data.attachments) ? data.attachments : [];
  const attHtml = atts.length ? "<ul>" + atts.map(a => `<li><a href="/uploads/${encodeURIComponent(a.stored_name)}" target="_blank">${escapeHtml(a.original_name)}</a></li>`).join("") + "</ul>"
                             : "<div class='muted'>Нет файлов</div>";

  box.innerHTML = `
    <div class="muted">Owner: <b>${escapeHtml(t.owner_name)}</b> • ${t.created_at} • Status: ${escapeHtml(t.status)}</div>
    <h2 style="margin:10px 0 6px;">Описание</h2>
    <div>${escapeHtml(t.description).replace(/\n/g,"<br>")}</div>
    <h3 style="margin:14px 0 6px;">Файлы</h3>
    ${attHtml}
  `;

  // If current user is owner -> load submissions
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    subsBox.textContent = "Войдите, чтобы увидеть ответы владельца (если вы владелец).";
    return;
  }

  const sres = await fetch(`/api/tasks/${encodeURIComponent(id)}/submissions?userId=${encodeURIComponent(userId)}`);
  const sdata = await sres.json().catch(() => ({}));
  if (!sres.ok) {
    subsBox.textContent = "Нет доступа или пока нет ответов.";
    return;
  }

  const subs = Array.isArray(sdata.submissions) ? sdata.submissions : [];
  if (!subs.length) {
    subsBox.textContent = "Пока нет ответов.";
    return;
  }

  subsBox.innerHTML = subs.map((s) => {
    const files = (s.attachments || []).map(a => `<li><a href="/uploads/${encodeURIComponent(a.stored_name)}" target="_blank">${escapeHtml(a.original_name)}</a></li>`).join("");
    return `
      <div style="border-bottom:1px solid #eef2f7; padding:10px 0;">
        <div><b>${escapeHtml(s.sender_name)}</b> <span class="muted">(${escapeHtml(s.sender_email)})</span></div>
        <div class="muted">${s.created_at}</div>
        <div style="margin-top:6px;">${escapeHtml(s.message || "").replace(/\n/g,"<br>")}</div>
        ${files ? `<div style="margin-top:6px;"><b>Files:</b><ul>${files}</ul></div>` : ""}
      </div>
    `;
  }).join("");
}

document.getElementById("sendBtn").addEventListener("click", async () => {
  const id = getTaskId();
  const userId = localStorage.getItem("user_id");
  const sendMsg = document.getElementById("sendMsg");

  if (!userId) {
    sendMsg.textContent = "Сначала войдите (login).";
    return;
  }

  const message = document.getElementById("message").value.trim();
  const filesEl = document.getElementById("files");
  const files = filesEl.files ? Array.from(filesEl.files) : [];

  const fd = new FormData();
  fd.append("userId", userId);
  fd.append("message", message);
  for (const f of files) fd.append("files", f);

  sendMsg.textContent = "Отправка...";
  const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/submissions`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    sendMsg.textContent = (data.error || `Error (HTTP ${res.status})`);
    return;
  }

  sendMsg.textContent = "✅ Отправлено";
  document.getElementById("message").value = "";
  filesEl.value = "";
  // reload to show in owner view (if owner)
  loadTask();
});

loadTask();
