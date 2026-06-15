function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

function tt(k){ return (window.t ? window.t(k) : k); }
function fmt(tpl, vars){
  let s = String(tpl || "");
  Object.entries(vars || {}).forEach(([k,v]) => { s = s.replaceAll("{"+k+"}", String(v)); });
  return s;
}

function fmtUSD(cents){
  const v = Number(cents||0)/100;
  return "$" + v.toFixed(2);
}

function parseUsdInputToCents(v){
  if (v === null || v === undefined) return { kind: 'cancel' };
  const s = String(v).trim();
  if (s === '') return { kind: 'keep' };
  if (s.toLowerCase() === 'auto') return { kind: 'auto' }; // clear override
  const num = Number(s);
  if (!Number.isFinite(num)) return { kind: 'invalid' };
  return { kind: 'value', cents: Math.round(num * 100) };
}

function openInvitedModal(referrerId, invited){
  const back = document.getElementById('modalBackdrop');
  const title = document.getElementById('modalTitle');
  const sub = document.getElementById('modalSub');
  const msg = document.getElementById('modalMsg');
  const rows = document.getElementById('invitedRows');

  title.textContent = `Invited by #${referrerId}`;
  sub.textContent = `${invited.length} users`;
  msg.textContent = '';
  rows.innerHTML = '';

  invited.forEach((p, idx)=>{
    const when = p.created_at ? new Date(p.created_at.replace(" ","T") + "Z").toLocaleString() : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(p.name||'')}</td>
      <td>${escapeHtml(p.email||'')}</td>
      <td>${escapeHtml(when)}</td>
    `;
    rows.appendChild(tr);
  });

  back.style.display = 'flex';
}

function closeModal(){
  document.getElementById('modalBackdrop').style.display = 'none';
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', (e)=>{
  if (e.target.id === 'modalBackdrop') closeModal();
});

document.getElementById("logoutBtn").addEventListener("click", ()=>{
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_email");
  location.href = "/";
});

function formatLocal(dt){
  if (!dt) return '';
  try {
    return new Date(String(dt).replace(" ","T") + "Z").toLocaleString();
  } catch { return String(dt); }
}

function setSearchVisible(isVisible){
  const wrap = document.getElementById('searchResultsWrap');
  if (!wrap) return;
  wrap.style.display = isVisible ? 'block' : 'none';
}

function renderSearchResults(rows){
  const tbody = document.getElementById('searchRows');
  const msg = document.getElementById('searchMsg');
  tbody.innerHTML = '';
  if (!rows || !rows.length){
    msg.textContent = 'No matches.';
    setSearchVisible(false);
    return;
  }
  msg.textContent = `Found ${rows.length} user(s).`;
  setSearchVisible(true);

  rows.forEach((r)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${escapeHtml(r.user_name||'')}</b><div class="muted">${escapeHtml(r.user_email||'')}</div><div class="muted">#${escapeHtml(r.user_id)}</div></td>
      <td>${escapeHtml(formatLocal(r.user_created_at))}</td>
      <td>${r.referrer_user_id ? (`<b>${escapeHtml(r.referrer_name||'')}</b><div class="muted">${escapeHtml(r.referrer_email||'')}</div><div class="muted">#${escapeHtml(r.referrer_user_id)} · <code>${escapeHtml(r.referrer_code||'')}</code></div>`) : ('—')}</td>
      <td>${r.referrer_user_id ? escapeHtml(formatLocal(r.referral_created_at)) : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function doSearch(adminId){
  const input = document.getElementById('searchInput');
  const msg = document.getElementById('searchMsg');
  const q = String(input?.value || '').trim();
  if (!q){
    msg.textContent = 'Type a name or email to search.';
    setSearchVisible(false);
    return;
  }
  msg.textContent = 'Searching...';
  setSearchVisible(false);
  const res = await fetch(`/api/admin/referrals/${encodeURIComponent(adminId)}/lookup?q=${encodeURIComponent(q)}`);
  const data = await res.json().catch(()=>({}));
  if (!res.ok){
    msg.textContent = data.error || 'Search error';
    return;
  }
  renderSearchResults(Array.isArray(data.results) ? data.results : []);
}

function wireSearch(adminId){
  const btn = document.getElementById('searchBtn');
  const clearBtn = document.getElementById('clearSearchBtn');
  const input = document.getElementById('searchInput');
  if (btn) btn.addEventListener('click', ()=>doSearch(adminId));
  if (input) input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') doSearch(adminId); });
  if (clearBtn) clearBtn.addEventListener('click', ()=>{
    if (input) input.value = '';
    const msg = document.getElementById('searchMsg');
    if (msg) msg.textContent = '';
    const tbody = document.getElementById('searchRows');
    if (tbody) tbody.innerHTML = '';
    setSearchVisible(false);
  });
}

async function load(){
  const adminId = localStorage.getItem('user_id');
  if (!adminId) { location.href = '/public/signup.html'; return; }

  wireSearch(adminId);

  const msgEl = document.getElementById('msg');
  const tbody = document.getElementById('rows');
  msgEl.textContent = 'Loading...';

  const res = await fetch('/api/admin/referrals/' + encodeURIComponent(adminId));
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    msgEl.textContent = data.error || 'Error';
    return;
  }

  const users = Array.isArray(data.users) ? data.users : [];
  msgEl.textContent = users.length ? '' : 'No users';
  tbody.innerHTML = '';

  users.forEach((u)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><b>${escapeHtml(u.name)}</b><div class="muted">${escapeHtml(u.email)}</div></td>
      <td><code>${escapeHtml(u.referral_code)}</code></td>
      <td>${u.referrer_user_id ? ('#' + u.referrer_user_id) : '-'}</td>
      <td><span class="pill">${Number(u.referrals_count||0)}</span></td>
      <td><b>${fmtUSD(u.total_commission_cents)}</b></td>
      <td><b>${fmtUSD(u.wallet_balance_cents)}</b></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-outline" data-act="invited" data-id="${u.id}">${escapeHtml(tt("admin_btn_invited"))}</button>
        <button class="btn btn-primary" data-act="earnings" data-id="${u.id}">${escapeHtml(tt("admin_btn_earnings"))}</button>
        <button class="btn btn-outline" data-act="adjust" data-id="${u.id}">${escapeHtml(tt("admin_btn_adjust"))}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-act="invited"]').forEach((btn)=>{
    btn.addEventListener('click', async ()=>{
      const referrerId = btn.getAttribute('data-id');
      const r = await fetch(`/api/admin/referrals/${encodeURIComponent(adminId)}/invited/${encodeURIComponent(referrerId)}`);
      const j = await r.json().catch(()=>({}));
      if (!r.ok) {
        alert(j.error || 'Error');
        return;
      }
      openInvitedModal(referrerId, Array.isArray(j.invited) ? j.invited : []);
    });
  });

  tbody.querySelectorAll('button[data-act="adjust"]').forEach((btn)=>{
    btn.addEventListener('click', async ()=>{
      const targetUserId = Number(btn.getAttribute('data-id'));
      const usd = prompt('Delta amount in USD (example: 5 or -3.25):');
      if (usd === null) return;
      const cents = Math.round(Number(usd) * 100);
      if (!Number.isFinite(cents)) { alert('Invalid number'); return; }
      const reason = prompt('Reason (optional):') || '';

      const r = await fetch('/api/admin/wallet-adjust', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ adminId: Number(adminId), targetUserId, delta_cents: cents, reason })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) {
        alert(j.error || 'Error');
        return;
      }
      alert('New wallet balance: ' + fmtUSD(j.wallet_balance_cents));
      await load();
    });
  });

  tbody.querySelectorAll('button[data-act="earnings"]').forEach((btn)=>{
    btn.addEventListener('click', async ()=>{
      const referrerId = Number(btn.getAttribute('data-id'));

      const r = await fetch(`/api/admin/referral-earnings/${encodeURIComponent(adminId)}/${encodeURIComponent(referrerId)}`);
      const j = await r.json().catch(()=>({}));
      if (!r.ok) {
        alert(j.error || 'Error');
        return;
      }

      const computed = j.computed || {};
      const ov = j.override || null;

      // What user currently sees in dashboard (override takes precedence)
      const curTotal = (ov && ov.total_cents !== null && ov.total_cents !== undefined) ? ov.total_cents : computed.total_cents;
      const curEarned = (ov && ov.earned_cents !== null && ov.earned_cents !== undefined) ? ov.earned_cents : computed.earned_cents;
      const curPaid = (ov && ov.paid_cents !== null && ov.paid_cents !== undefined) ? ov.paid_cents : computed.paid_cents;

      alert(
        'Referral earnings override\n\n' +
        '• Enter USD value to set\n' +
        '• Leave blank to keep current\n' +
        '• Type "auto" to reset to automatic calculation\n'
      );

      const a = parseUsdInputToCents(prompt(`Total (USD) — current ${fmtUSD(curTotal)}\n(blank=keep, auto=reset):`, ''));
      if (a.kind === 'cancel') return;
      const b = parseUsdInputToCents(prompt(`Earned (USD) — current ${fmtUSD(curEarned)}\n(blank=keep, auto=reset):`, ''));
      if (b.kind === 'cancel') return;
      const c = parseUsdInputToCents(prompt(`Paid (USD) — current ${fmtUSD(curPaid)}\n(blank=keep, auto=reset):`, ''));
      if (c.kind === 'cancel') return;

      if (a.kind === 'invalid' || b.kind === 'invalid' || c.kind === 'invalid') {
        alert('Invalid number. Try again.');
        return;
      }

      // Convert to cents or null
      const total_cents = a.kind === 'value' ? a.cents : (a.kind === 'auto' ? null : undefined);
      const earned_cents = b.kind === 'value' ? b.cents : (b.kind === 'auto' ? null : undefined);
      const paid_cents = c.kind === 'value' ? c.cents : (c.kind === 'auto' ? null : undefined);

      // If keep => don't send field (undefined). We'll build payload accordingly.
      const payload = { adminId: Number(adminId), referrerId };
      if (total_cents !== undefined) payload.total_cents = total_cents;
      if (earned_cents !== undefined) payload.earned_cents = earned_cents;
      if (paid_cents !== undefined) payload.paid_cents = paid_cents;

      const up = await fetch('/api/admin/referral-earnings/update', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const upj = await up.json().catch(()=>({}));
      if (!up.ok) {
        alert(upj.error || 'Error');
        return;
      }
      alert('Updated. (Dashboard will show new values.)');
      await load();
    });
  });
}

load().catch((e)=>{
  console.error(e);
  const msgEl = document.getElementById('msg');
  if (msgEl) msgEl.textContent = String(e?.message || e);
});

// refresh translations after dynamic HTML updates
const __oldRenderUsers = renderUsers;
renderUsers = function(list){ __oldRenderUsers(list); if (window.__i18n && window.__i18n.applyLang) window.__i18n.applyLang(); };
