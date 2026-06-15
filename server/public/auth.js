// Toggle UI
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => container.classList.add("active"));
loginBtn.addEventListener('click', () => container.classList.remove("active"));

// Helpers
async function postJSON(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, data: json };
}

function setMsg(el, text, isError=false) {
  el.textContent = text;
  el.style.color = isError ? "#b00020" : "#0b6b2f";
}

// Signup flow (DIRECT): create user and login immediately (no email/code)
const suName = document.getElementById("su_name");
const suEmail = document.getElementById("su_email");
const suPass = document.getElementById("su_password");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const suMsg = document.getElementById("su_msg");

sendCodeBtn.addEventListener("click", async () => {
  const name = suName.value.trim();
  const email = suEmail.value.trim();
  const password = suPass.value;

  if (!name) return setMsg(suMsg, "Name kerak", true);
  if (!email) return setMsg(suMsg, "Email kerak", true);
  if (!password || password.length < 6) return setMsg(suMsg, "Password kamida 6 ta belgidan iborat bo‘lsin", true);

  setMsg(suMsg, "Signing up...");
  const r = await postJSON("/api/signup-direct", { name, email, password });

  if (!r.ok) {
    setMsg(suMsg, r.data.error || "Error", true);
    return;
  }

  // Save user_id (demo auth)
  localStorage.setItem("user_id", r.data.user.id);

  // Go home (dashboard link is on /)
  window.location.href = "/";
});

// Login
const siEmail = document.getElementById("si_email");
const siPass = document.getElementById("si_password");
const loginBtnSubmit = document.getElementById("loginBtnSubmit");
const siMsg = document.getElementById("si_msg");

loginBtnSubmit.addEventListener("click", async () => {
  setMsg(siMsg, "Logging in...");
  const r = await postJSON("/api/login", {
    email: siEmail.value.trim(),
    password: siPass.value
  });

  if (!r.ok) {
    setMsg(siMsg, r.data.error || "Login failed", true);
    return;
  }

  localStorage.setItem("user_id", r.data.user.id);
  window.location.href = "/";
});
