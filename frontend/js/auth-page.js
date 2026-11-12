document.addEventListener("DOMContentLoaded", () => {
  if (GenreSenseAuth.getUser()) {
    if (window.GenreSenseUI && typeof window.GenreSenseUI.navigateWithTransition === "function") {
      window.GenreSenseUI.navigateWithTransition("/page/dashboard");
    } else {
      window.location.href = "/page/dashboard";
    }
    return;
  }

  GenreSenseUI.initShell();

  const cardShell = document.querySelector("[data-auth-card-shell]");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const message = document.getElementById("auth-message");
  const forgotLink = document.getElementById("forgot-password-link");
  const showSignupButton = document.getElementById("switch-signup");
  const showLoginButton = document.getElementById("switch-login");

  function setMode(mode) {
    const loginActive = mode === "login";
    if (cardShell) {
      cardShell.classList.toggle("is-signup", !loginActive);
    }
    loginForm.classList.toggle("auth-pro__form--active", loginActive);
    signupForm.classList.toggle("auth-pro__form--active", !loginActive);
    loginForm.toggleAttribute("inert", !loginActive);
    signupForm.toggleAttribute("inert", loginActive);
    loginForm.setAttribute("aria-hidden", String(!loginActive));
    signupForm.setAttribute("aria-hidden", String(loginActive));
    message.textContent = "";
  }

  function setMessage(text, type) {
    message.textContent = text || "";
    message.style.color = type === "error" ? "var(--color-danger)" : type === "success" ? "var(--color-success)" : "var(--color-text-faint)";
  }

  if (showSignupButton) {
    showSignupButton.addEventListener("click", () => setMode("signup"));
  }
  if (showLoginButton) {
    showLoginButton.addEventListener("click", () => setMode("login"));
  }

  if (forgotLink) {
    forgotLink.addEventListener("click", (event) => {
      event.preventDefault();
      GenreSenseUI.openModal(
        "Password reset",
        "Password reset is not available yet in the current backend. Use your existing account password or create a new account for now.",
        '<button class="btn btn--primary" type="button" data-modal-close>OK</button>'
      );
    });
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;
    setMessage("", "");
    try {
      const payload = await GenreSenseApi.post("/auth/login", {
        username: document.getElementById("login-username").value.trim(),
        password: document.getElementById("login-password").value.trim()
      });
      GenreSenseAuth.login(payload.user);
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = signupForm.querySelector("button[type='submit']");
    const payload = {
      username: document.getElementById("signup-username").value.trim(),
      email: document.getElementById("signup-email").value.trim(),
      password: document.getElementById("signup-password").value.trim(),
      default_genre: document.getElementById("signup-genre").value
    };

    if (payload.username.length < 3) {
      setMessage("Username must be at least 3 characters.", "error");
      return;
    }
    if (payload.username.includes(" ")) {
      setMessage("Username cannot contain spaces.", "error");
      return;
    }
    if (payload.password.length < 6) {
      setMessage("Password must be at least 6 characters.", "error");
      return;
    }

    button.disabled = true;
    setMessage("", "");
    try {
      await GenreSenseApi.post("/auth/signup", payload);
      signupForm.reset();
      setMode("login");
      setMessage("Account created. Sign in to continue.", "success");
      GenreSenseUI.showToast("Signup successful.", "success");
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  setMode("login");
});
