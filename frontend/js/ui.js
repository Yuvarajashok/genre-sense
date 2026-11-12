(function () {
  const themeKey = "genresense_theme";
  const pageTransitionDuration = 280;
  let toastRoot;
  let modalRoot;
  let transitionInFlight = false;
  let pageTransitionsBound = false;

  function qs(selector, scope) { return (scope || document).querySelector(selector); }
  function qsa(selector, scope) { return Array.from((scope || document).querySelectorAll(selector)); }
  function capitalize(value) { return String(value || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  function userInitial(user) { return user && user.username ? user.username.charAt(0).toUpperCase() : "G"; }
  function currentTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function themeButtonLabel(theme) { return theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"; }
  function getThemePalette() {
    return {
      theme: currentTheme(),
      primary: cssVar("--color-primary") || "#2563eb",
      primaryStrong: cssVar("--color-primary-strong") || "#1d4ed8",
      accent: cssVar("--color-accent") || "#14b8a6",
      accentStrong: cssVar("--color-accent-strong") || "#0f766e",
      text: cssVar("--color-text") || "#0f172a",
      textSoft: cssVar("--color-text-soft") || "#475569",
      textFaint: cssVar("--color-text-faint") || "#64748b",
      border: cssVar("--color-border") || "#e2e8f0",
      card: cssVar("--color-card") || "#ffffff",
      bgSoft: cssVar("--color-bg-soft") || "#f1f5f9",
      success: cssVar("--color-success") || "#10b981",
      warning: cssVar("--color-warning") || "#f59e0b",
      danger: cssVar("--color-danger") || "#ef4444"
    };
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    window.dispatchEvent(new CustomEvent("genresense:themechange", { detail: { theme, palette: getThemePalette() } }));
    return theme;
  }
  function initTheme() {
    const savedTheme = localStorage.getItem(themeKey);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme || (prefersDark ? "dark" : "light");
    return applyTheme(theme);
  }
  function syncThemeButtons() {
    const label = themeButtonLabel(currentTheme());
    qsa("[data-theme-toggle]").forEach((button) => { button.textContent = label; button.setAttribute("aria-label", label); });
  }
  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(themeKey, next);
    syncThemeButtons();
    return next;
  }
  function isTransitionableLink(link) {
    if (!link) return false;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    if (link.getAttribute("rel") === "external") return false;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return url.href !== window.location.href;
  }
  function navigateWithTransition(url) {
    if (!url || transitionInFlight) return;
    transitionInFlight = true;
    document.body.classList.add("page-transitioning");
    window.setTimeout(() => { window.location.href = url; }, pageTransitionDuration);
  }
  function bindPageTransitions() {
    if (pageTransitionsBound) return;
    pageTransitionsBound = true;
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!isTransitionableLink(link)) return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      navigateWithTransition(link.href);
    });
  }
  function ensureToastRoot() {
    if (!toastRoot) { toastRoot = document.createElement("div"); toastRoot.className = "toast-stack"; document.body.appendChild(toastRoot); }
    return toastRoot;
  }
  function showToast(message, type) {
    const root = ensureToastRoot();
    const toast = document.createElement("div");
    toast.className = `toast toast--${type || "info"}`;
    toast.innerHTML = `<strong>${type === "error" ? "Error" : type === "success" ? "Success" : "Notice"}</strong><div style="margin-top:6px;color:var(--color-text-soft);">${message}</div>`;
    root.appendChild(toast);
    window.setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(8px)"; window.setTimeout(() => toast.remove(), 220); }, 2800);
  }
  function ensureModalRoot() {
    if (!modalRoot) {
      modalRoot = document.createElement("div");
      modalRoot.className = "modal";
      modalRoot.innerHTML = '<div class="modal__panel"></div>';
      modalRoot.addEventListener("click", (event) => { if (event.target === modalRoot) closeModal(); });
      document.body.appendChild(modalRoot);
    }
    return modalRoot;
  }
  function openModal(title, bodyHtml, actions) {
    const modal = ensureModalRoot();
    const panel = qs(".modal__panel", modal);
    panel.innerHTML = `<div class="card__header"><div><h3 class="card__title">${title}</h3></div><button class="btn btn--ghost btn--icon" type="button" data-modal-close>&times;</button></div><div style="color:var(--color-text-soft);line-height:1.6;">${bodyHtml}</div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">${actions || '<button class="btn btn--primary" type="button" data-modal-close>Close</button>'}</div>`;
    qsa("[data-modal-close]", panel).forEach((button) => button.addEventListener("click", closeModal));
    modal.classList.add("is-open");
  }
  function closeModal() { if (modalRoot) modalRoot.classList.remove("is-open"); }
  function initShell() {
    initTheme();
    syncThemeButtons();
    bindPageTransitions();
    qsa("[data-theme-toggle]").forEach((button) => {
      if (button.dataset.themeBound === "true") return;
      button.dataset.themeBound = "true";
      button.addEventListener("click", () => toggleTheme());
    });
    qsa("[data-sidebar-toggle]").forEach((button) => {
      if (button.dataset.sidebarBound === "true") return;
      button.dataset.sidebarBound = "true";
      button.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    });
    qsa("[data-sidebar-close]").forEach((node) => {
      if (node.dataset.sidebarCloseBound === "true") return;
      node.dataset.sidebarCloseBound = "true";
      node.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
    });
    updateUserChrome();
    document.body.classList.add("page-fade");
  }
  function updateUserChrome() {
    const user = window.GenreSenseAuth && window.GenreSenseAuth.getUser();
    if (!user) return;
    qsa("[data-user-name]").forEach((node) => { node.textContent = user.username || "Guest"; });
    qsa("[data-user-email]").forEach((node) => { node.textContent = user.email || ""; });
    qsa("[data-avatar-link]").forEach((link) => link.setAttribute("href", "/page/profile"));
    qsa("[data-logo-link]").forEach((link) => link.setAttribute("href", "/page/dashboard"));
    qsa("[data-avatar-image]").forEach((img) => { if (user.profile_pic) { img.src = user.profile_pic; img.style.display = "block"; } else { img.style.display = "none"; } });
    qsa("[data-avatar-fallback]").forEach((node) => { node.textContent = userInitial(user); node.style.display = user.profile_pic ? "none" : "grid"; });
  }
  function buildAppShell(options) {
    const user = window.GenreSenseAuth.getUser() || {};
    const nav = [
      { href: "/page/dashboard", key: "dashboard", label: "Dashboard", icon: "▣" },
      { href: "/page/history", key: "history", label: "History", icon: "◷" },
      { href: "/page/profile", key: "profile", label: "Profile", icon: "◉" },
      { href: "/page/about", key: "about", label: "About", icon: "◎" }
    ];
    return `<div class="sidebar-overlay" data-sidebar-close></div><div class="app-shell"><aside class="sidebar"><a href="/page/dashboard" class="sidebar__brand" data-logo-link><div class="sidebar__logo"><img src="/css/gs_logo.png" alt="GenreSense logo"></div><div><div class="sidebar__title">GenreSense</div></div></a><nav class="sidebar__nav">${nav.map((item) => `<a href="${item.href}" class="nav-link ${options.active === item.key ? "active" : ""}"><span class="nav-link__icon">${item.icon}</span><span>${item.label}</span></a>`).join("")}</nav><div class="sidebar__footer"><button class="btn btn--ghost" type="button" data-theme-toggle>Dark Mode</button><button class="btn btn--secondary" type="button" onclick="GenreSenseAuth.logout()">Logout</button></div></aside><div class="main-shell"><header class="topbar"><div style="display:flex;align-items:flex-start;gap:14px;"><button class="btn btn--ghost btn--icon mobile-toggle" type="button" data-sidebar-toggle aria-label="Open menu">≡</button><div><h1 class="topbar__title">${options.title}</h1><p class="topbar__subtitle">${options.subtitle}</p></div></div><div class="topbar__actions"><a href="/page/profile" class="user-chip" data-avatar-link><div class="avatar"><img data-avatar-image alt="Profile avatar" style="display:none;"><span data-avatar-fallback>${userInitial(user)}</span></div><div><div style="font-weight:600;" data-user-name>${user.username || "Guest"}</div><div style="color:var(--color-text-faint);font-size:0.85rem;">Profile</div></div></a></div></header><main class="page-content">${options.content}<footer style="margin-top:28px;padding:18px 0 8px;border-top:1px solid var(--color-border);color:var(--color-text-faint);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;"><span>Powered by Genre Sense</span><a href="https://www.instagram.com/genre_sense" target="_blank" rel="noreferrer">Instagram: genre_sense</a></footer></main></div></div>`;
  }
  function destroyChart(chart) { if (chart && typeof chart.destroy === "function") chart.destroy(); }
  document.addEventListener("DOMContentLoaded", initShell);
  window.GenreSenseUI = { qs, qsa, capitalize, formatDate, userInitial, showToast, openModal, closeModal, buildAppShell, initShell, updateUserChrome, destroyChart, toggleTheme, getThemePalette, currentTheme, navigateWithTransition };
})();
