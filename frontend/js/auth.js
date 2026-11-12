(function () {
  const STORAGE_KEY = "genresense_user";
  function redirect(url) {
    if (window.GenreSenseUI && typeof window.GenreSenseUI.navigateWithTransition === "function") {
      window.GenreSenseUI.navigateWithTransition(url);
      return;
    }
    window.location.href = url;
  }
  function getUser() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (error) { localStorage.removeItem(STORAGE_KEY); return null; } }
  function setUser(user) { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); }
  function clearUser() { localStorage.removeItem(STORAGE_KEY); }
  function requireAuth() { const user = getUser(); if (!user) { redirect("/"); return null; } return user; }
  function login(user) { setUser(user); redirect("/page/dashboard"); }
  function logout() { clearUser(); redirect("/"); }
  function updateUser(patch) { const current = getUser(); if (!current) return null; const next = Object.assign({}, current, patch); setUser(next); return next; }
  window.GenreSenseAuth = { getUser, setUser, clearUser, requireAuth, login, logout, updateUser };
})();
