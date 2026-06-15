async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");
  msg.textContent = "Logging in...";

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(()=>({}));

  if (!res.ok) {
    msg.textContent = data.error || `Error (HTTP ${res.status})`;
    return;
  }

  const user = data.user;

  // Save session locally
  localStorage.setItem("user_id", user.id);
  localStorage.setItem("user_email", user.email);

  // Verify admin access via server (single source of truth)
  const check = await fetch("/api/admin/tasks/" + encodeURIComponent(user.id));
  if (!check.ok) {
    const cd = await check.json().catch(()=>({}));
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    msg.textContent = cd.error || "Bu account admin emas.";
    return;
  }

  window.location.href = "/public/admin.html";
}

document.getElementById("btn").addEventListener("click", login);
document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
