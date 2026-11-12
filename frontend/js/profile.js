document.addEventListener("DOMContentLoaded", () => {
  const user = GenreSenseAuth.requireAuth();
  if (!user) return;

  document.body.innerHTML = GenreSenseUI.buildAppShell({
    active: "profile",
    title: "Profile",
    subtitle: "Manage your profile image and default genre preference.",
    content: `<section class="profile-grid"><section class="card profile-panel__hero"><div class="profile-panel__identity"><label class="avatar-upload" for="photo-input"><img id="profile-avatar-image" alt="Profile picture" style="display:none;"><span id="profile-avatar-fallback">${GenreSenseUI.userInitial(user)}</span><span class="avatar-upload__hint">+</span></label><input id="photo-input" type="file" accept="image/*" hidden><div class="profile-panel__text"><h3 class="profile-panel__name" data-user-name>${user.username}</h3><p class="profile-panel__email" data-user-email>${user.email}</p></div></div><p class="profile-panel__copy">Upload a profile image to personalize the header and profile page.</p></section><section class="stack"><div class="card"><div class="card__header"><div><h3 class="card__title">User details</h3><p class="card__subtitle">Update the profile details shown across this device session.</p></div></div><div class="form-stack"><div class="field"><label for="profile-username">Username</label><input id="profile-username" class="input" type="text" value="${user.username || ""}" placeholder="Username"></div><div class="field"><label for="profile-email">Email</label><input id="profile-email" class="input" type="email" value="${user.email || ""}" placeholder="Email address"></div><div class="profile-action-row"><button id="save-details" class="btn btn--primary" type="button">Save details</button><span id="details-state" class="save-state"></span></div></div></div><div class="card"><div class="card__header"><div><h3 class="card__title">Default genre</h3><p class="card__subtitle">This preference is highlighted throughout prediction results.</p></div></div><div class="form-stack"><div class="field"><label for="genre-select">Default genre</label><select id="genre-select" class="select"><option value="educational">Educational</option><option value="informational">Informational</option><option value="awareness">Awareness</option><option value="promotional">Promotional</option><option value="entertainment">Entertainment</option><option value="emotional">Emotional</option><option value="spiritual">Spiritual</option></select></div><div class="profile-action-row"><button id="save-genre" class="btn btn--primary" type="button">Save preference</button><span id="save-state" class="save-state"></span></div></div></div><div class="card"><div class="card__header"><div><h3 class="card__title">How this affects the app</h3></div></div><div class="stack"><div class="metric"><div class="metric__value">Identity</div><div class="metric__label">Username and email update instantly across the local session on this device.</div></div><div class="metric"><div class="metric__value">Persist</div><div class="metric__label">Default genre and avatar continue using the existing FastAPI endpoints.</div></div><div class="metric"><div class="metric__value">Reuse</div><div class="metric__label">Profile changes propagate across the shared shell immediately.</div></div></div></div></section></section>`
  });

  GenreSenseUI.initShell();

  const genreSelect = GenreSenseUI.qs("#genre-select");
  const saveButton = GenreSenseUI.qs("#save-genre");
  const saveState = GenreSenseUI.qs("#save-state");
  const usernameInput = GenreSenseUI.qs("#profile-username");
  const emailInput = GenreSenseUI.qs("#profile-email");
  const saveDetailsButton = GenreSenseUI.qs("#save-details");
  const detailsState = GenreSenseUI.qs("#details-state");
  const photoInput = GenreSenseUI.qs("#photo-input");
  const avatarImage = GenreSenseUI.qs("#profile-avatar-image");
  const avatarFallback = GenreSenseUI.qs("#profile-avatar-fallback");

  genreSelect.value = user.default_genre || "entertainment";

  function renderAvatar() {
    const current = GenreSenseAuth.getUser();
    if (current && current.profile_pic) {
      avatarImage.src = current.profile_pic;
      avatarImage.style.display = "block";
      avatarFallback.style.display = "none";
    } else {
      avatarImage.style.display = "none";
      avatarFallback.style.display = "grid";
      avatarFallback.textContent = GenreSenseUI.userInitial(current || user);
    }
  }
  function resetMessage(node, successText) {
    window.setTimeout(() => { if (node.textContent === successText) node.textContent = ""; }, 1800);
  }

  saveDetailsButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    if (username.length < 3) {
      detailsState.textContent = "Username must be at least 3 characters.";
      GenreSenseUI.showToast(detailsState.textContent, "error");
      return;
    }
    if (username.includes(" ")) {
      detailsState.textContent = "Username cannot contain spaces.";
      GenreSenseUI.showToast(detailsState.textContent, "error");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      detailsState.textContent = "Enter a valid email address.";
      GenreSenseUI.showToast(detailsState.textContent, "error");
      return;
    }
    GenreSenseAuth.updateUser({ username, email });
    GenreSenseUI.updateUserChrome();
    GenreSenseUI.qsa("[data-user-name]").forEach((node) => { node.textContent = username; });
    GenreSenseUI.qsa("[data-user-email]").forEach((node) => { node.textContent = email; });
    detailsState.textContent = "Saved on this device.";
    GenreSenseUI.showToast("Profile details updated.", "success");
    resetMessage(detailsState, "Saved on this device.");
  });

  saveButton.addEventListener("click", async () => {
    saveButton.disabled = true;
    saveState.textContent = "Saving preference...";
    try {
      const response = await GenreSenseApi.post("/user/update-genre", { user_id: user.id, default_genre: genreSelect.value });
      GenreSenseAuth.updateUser({ default_genre: response.default_genre });
      saveState.textContent = "Saved successfully.";
      GenreSenseUI.showToast("Default genre updated.", "success");
      GenreSenseUI.updateUserChrome();
    } catch (error) {
      saveState.textContent = error.message;
      GenreSenseUI.showToast(error.message, "error");
    } finally {
      saveButton.disabled = false;
      resetMessage(saveState, "Saved successfully.");
    }
  });

  photoInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("user_id", user.id);
    formData.append("file", file);
    saveState.textContent = "Uploading avatar...";
    try {
      const response = await GenreSenseApi.upload("/user/update-profile-pic", formData);
      GenreSenseAuth.updateUser({ profile_pic: response.profile_pic });
      renderAvatar();
      GenreSenseUI.updateUserChrome();
      saveState.textContent = "Avatar updated.";
      GenreSenseUI.showToast("Profile image updated.", "success");
    } catch (error) {
      saveState.textContent = error.message;
      GenreSenseUI.showToast(error.message, "error");
    } finally {
      photoInput.value = "";
      resetMessage(saveState, "Avatar updated.");
    }
  });

  renderAvatar();
});
