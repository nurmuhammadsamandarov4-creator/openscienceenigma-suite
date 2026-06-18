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

function setMsg(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? "#b00020" : "#0b6b2f";
}

// Signup flow: Step 1 — send code, Step 2 — verify & create account
const suName     = document.getElementById("su_name");
const suEmail    = document.getElementById("su_email");
const suPass     = document.getElementById("su_password");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const codeBlock  = document.getElementById("codeBlock");
const suCode     = document.getElementById("su_code");
const verifyBtn  = document.getElementById("verifyBtn");
const suMsg      = document.getElementById("su_msg");

let pendingEmail = "";

// Step 1: request verification code
sendCodeBtn.addEventListener("click", async () => {
  const name     = suName.value.trim();
  const email    = suEmail.value.trim();
  const password = suPass.value;

  if (!name)     return setMsg(suMsg, "Name kerak", true);
  if (!email)    return setMsg(suMsg, "Email kerak", true);
  if (!password || password.length < 6) return setMsg(suMsg, "Password kamida 6 ta belgidan iborat bo'lsin", true);

  sendCodeBtn.disabled = true;
  setMsg(suMsg, "Kod yuborilmoqda...");

  const r = await postJSON("/api/request-verification", { name, email, password });

  sendCodeBtn.disabled = false;

  if (!r.ok) {
    setMsg(suMsg, r.data.error || "Xato yuz berdi", true);
    return;
  }

  pendingEmail = email;
  setMsg(suMsg, r.data.message || "Emailga 6 xonali kod yuborildi ✅");

  // Show code input, hide registration fields
  suName.style.display  = "none";
  suEmail.style.display = "none";
  suPass.style.display  = "none";
  sendCodeBtn.style.display = "none";
  codeBlock.style.display = "block";
  suCode.focus();
});

// Step 2: verify code and sign up
verifyBtn.addEventListener("click", async () => {
  const code = suCode.value.trim();
  if (!code || code.length < 4) return setMsg(suMsg, "Kodni kiriting", true);

  verifyBtn.disabled = true;
  setMsg(suMsg, "Tekshirilmoqda...");

  const r = await postJSON("/api/verify-and-signup", { email: pendingEmail, code });

  verifyBtn.disabled = false;

  if (!r.ok) {
    setMsg(suMsg, r.data.error || "Xato yuz berdi", true);
    return;
  }

  localStorage.setItem("user_id", r.data.user.id);
  setMsg(suMsg, "✅ Muvaffaqiyatli ro'yxatdan o'tdingiz! Yo'naltirilmoqda...");
  setTimeout(() => { window.location.href = "/"; }, 1000);
});

// Login
const siEmail       = document.getElementById("si_email");
const siPass        = document.getElementById("si_password");
const loginBtnSubmit = document.getElementById("loginBtnSubmit");
const siMsg         = document.getElementById("si_msg");

loginBtnSubmit.addEventListener("click", async () => {
  setMsg(siMsg, "Kirilmoqda...");
  const r = await postJSON("/api/login", {
    email:    siEmail.value.trim(),
    password: siPass.value
  });

  if (!r.ok) {
    setMsg(siMsg, r.data.error || "Login failed", true);
    return;
  }

  localStorage.setItem("user_id", r.data.user.id);
  window.location.href = "/";
});
