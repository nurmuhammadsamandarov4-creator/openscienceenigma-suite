async function load() {
  const userId = localStorage.getItem('user_id');
  if (!userId) { location.href = '/public/signup.html'; return; }

  // Admin-only access
  try {
    const r = await fetch('/api/is-admin/' + encodeURIComponent(userId));
    const j = await r.json().catch(()=>({}));
    if (!r.ok || !j.isAdmin) {
      location.href = '/public/dashboard.html';
      return;
    }
  } catch (e) {
    location.href = '/public/dashboard.html';
    return;
  }

  const list = document.getElementById("list");
  const msg = document.getElementById("msg");
  msg.textContent = "Loading...";

  const res = await fetch("/api/tasks");
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    msg.textContent = data.error || "Error";
    return;
  }

  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  if (!tasks.length) {
    list.innerHTML = "<div class='muted'>Пока нет открытых заданий.</div>";
    msg.textContent = "";
    return;
  }

  list.innerHTML = tasks.map(t => `
    <div class="item">
      <div class="item-content">
        <div class="item-title">#${t.id} — ${escapeHtml(t.description).slice(0, 160)}${t.description.length>160?"...":""}</div>
        <div class="item-meta">Owner: <b>${escapeHtml(t.owner_name)}</b> • ${t.created_at}</div>
      </div>
      <div>
        <a class="btn btn-primary" href="/public/task.html?id=${encodeURIComponent(t.id)}">Открыть</a>
      </div>
    </div>
  `).join("");

  msg.textContent = "";
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

load();
