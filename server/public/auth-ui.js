(async function () {
  const buttons = Array.from(document.querySelectorAll("[data-auth-button=\"cta\"]"));
  if (!buttons.length) return;

  const userId = localStorage.getItem("user_id");

  // Validate that userId still exists on server.
  // If server restarted / DB reset / user deleted, treat as logged out.
  let isLoggedIn = false;
  if (userId) {
    try {
      const res = await fetch("/api/dashboard/" + encodeURIComponent(userId), { credentials: "same-origin" });
      isLoggedIn = res.ok;
      if (!res.ok) {
        localStorage.removeItem("user_id");
      }
    } catch (e) {
      // If network/server error: keep UX simple -> show Get Started
      localStorage.removeItem("user_id");
      isLoggedIn = false;
    }
  }

  buttons.forEach((btn) => {
    if (isLoggedIn) {
      btn.textContent = (window.t ? window.t("cta_logout") : "Log out");
      btn.setAttribute("href", "#");
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch (e) {}
        localStorage.removeItem("user_id");
        localStorage.removeItem("admin_id");
        localStorage.removeItem("ose_admin_user");
        // hard reset (drop any query params)
        window.location.replace("/");
      });
    } else {
      btn.textContent = (window.t ? window.t("cta_signup") : "Sign Up");
      btn.setAttribute("href", "/public/signup.html");
    }
  });

  // Extra logout hooks (if theme has a separate logout link/button)
  const extraLogoutEls = Array.from(document.querySelectorAll('[data-auth-action="logout"], #logoutBtn, a[href="/logout"]'));
  extraLogoutEls.forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch (e) {}
      localStorage.removeItem("user_id");
      localStorage.removeItem("admin_id");
      localStorage.removeItem("ose_admin_user");
      window.location.replace("/");
    });
  });
})();
