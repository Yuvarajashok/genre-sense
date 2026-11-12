document.addEventListener("DOMContentLoaded", async () => {
  const user = GenreSenseAuth.requireAuth();
  if (!user) return;

  const selectedIds = new Set();
  let allItems = [];
  let pieChart = null;
  let pieChartItems = [];

  document.body.innerHTML = GenreSenseUI.buildAppShell({
    active: "history",
    title: "History",
    subtitle: "Review saved analyses with thumbnails, genre badges, and confidence trends.",
    content: `
      <section class="page-grid">
        <div class="card">
          <div class="stat-grid">
            <div class="metric">
              <div id="metric-total" class="metric__value">0</div>
              <div class="metric__label">Total analyses</div>
            </div>
            <div class="metric">
              <div id="metric-top-genre" class="metric__value">-</div>
              <div class="metric__label">Most frequent genre</div>
            </div>
            <div class="metric">
              <div id="metric-average" class="metric__value">0%</div>
              <div class="metric__label">Average confidence</div>
            </div>
          </div>
        </div>

        <div class="card chart-card">
          <div class="card__header">
            <div>
              <span class="kicker">History Overview</span>
              <h3 class="card__title">Genre distribution</h3>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas id="genre-pie-chart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card__header">
            <div>
              <span class="kicker">Filter Records</span>
              <h3 class="card__title">Filters</h3>
            </div>
          </div>
          <div class="filters">
            <div class="field">
              <label for="genre-filter">Filter by genre</label>
              <select id="genre-filter" class="select">
                <option value="all">All genres</option>
              </select>
            </div>
            <div class="field">
              <label for="date-filter">Filter by date</label>
              <input id="date-filter" class="input" type="date">
            </div>
            <div class="field filters__action">
              <button id="clear-filters" type="button" class="btn btn--ghost">Clear filters</button>
            </div>
          </div>
        </div>

        <div id="history-selection" class="card selection-toolbar" style="display:none;">
          <div>
            <strong id="selection-count">0 selected</strong>
            <p class="selection-toolbar__text">Delete multiple saved analyses at once.</p>
          </div>
          <div class="selection-toolbar__actions">
            <button id="clear-selection" type="button" class="btn btn--ghost">Clear selection</button>
            <button id="bulk-delete" type="button" class="btn btn--danger">Delete selected</button>
          </div>
        </div>

        <div id="history-loading" class="card empty-state skeleton">
          <div style="width:100%;height:220px;"></div>
        </div>

        <div id="history-empty" class="card empty-state" style="display:none;">
          <div>
            <h3 style="margin:0 0 8px;">No history found</h3>
            <p style="margin:0;">Run a prediction to populate this page.</p>
          </div>
        </div>

        <section id="history-list" class="history-list" style="display:none;"></section>
      </section>
    `
  });

  GenreSenseUI.initShell();

  const historyList = GenreSenseUI.qs("#history-list");
  const loading = GenreSenseUI.qs("#history-loading");
  const empty = GenreSenseUI.qs("#history-empty");
  const genreFilter = GenreSenseUI.qs("#genre-filter");
  const dateFilter = GenreSenseUI.qs("#date-filter");
  const clearFilters = GenreSenseUI.qs("#clear-filters");
  const selectionBar = GenreSenseUI.qs("#history-selection");
  const selectionCount = GenreSenseUI.qs("#selection-count");
  const clearSelectionButton = GenreSenseUI.qs("#clear-selection");
  const bulkDeleteButton = GenreSenseUI.qs("#bulk-delete");

  function genreBadgeClass(genre) {
    const normalized = String(genre || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `badge badge--genre badge--genre-${normalized}`;
  }

  function thumbnailLabel(item) {
    return (item.top_genre || item.image_name || "G").charAt(0).toUpperCase();
  }

  function setMetrics(items) {
    GenreSenseUI.qs("#metric-total").textContent = String(items.length);
    const average = items.length
      ? items.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / items.length
      : 0;
    GenreSenseUI.qs("#metric-average").textContent = `${(average * 100).toFixed(1)}%`;
    const counts = items.reduce((acc, item) => {
      acc[item.top_genre] = (acc[item.top_genre] || 0) + 1;
      return acc;
    }, {});
    const topGenre = Object.keys(counts).length
      ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
      : null;
    GenreSenseUI.qs("#metric-top-genre").textContent = topGenre ? GenreSenseUI.capitalize(topGenre) : "-";
  }

  function populateGenreFilter(items) {
    const genres = Array.from(new Set(items.map((item) => item.top_genre))).sort();
    genreFilter.innerHTML = '<option value="all">All genres</option>' +
      genres.map((genre) => `<option value="${genre}">${GenreSenseUI.capitalize(genre)}</option>`).join("");
  }

  function renderChart(items) {
    if (!window.Chart) return;
    const palette = GenreSenseUI.getThemePalette();
    const counts = items.reduce((acc, item) => {
      acc[item.top_genre] = (acc[item.top_genre] || 0) + 1;
      return acc;
    }, {});
    pieChartItems = items.slice();
    GenreSenseUI.destroyChart(pieChart);
    pieChart = new Chart(GenreSenseUI.qs("#genre-pie-chart"), {
      type: "pie",
      data: {
        labels: Object.keys(counts).map((genre) => GenreSenseUI.capitalize(genre)),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: [
            palette.primary,
            palette.accent,
            palette.warning,
            palette.success,
            palette.danger,
            palette.primaryStrong,
            palette.textFaint
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: palette.textSoft
            }
          }
        }
      }
    });
  }

  function updateSelectionBar() {
    const count = selectedIds.size;
    selectionCount.textContent = `${count} selected`;
    selectionBar.style.display = count ? "flex" : "none";
    bulkDeleteButton.disabled = !count;
  }

  async function deleteItems(ids) {
    for (const id of ids) {
      await GenreSenseApi.remove(`/history/${id}`);
    }
  }

  function historyThumbnail(item) {
    if (item.image_path) {
      return `
        <div class="history-card__thumb">
          <img src="${item.image_path}" alt="${item.image_name}" class="history-card__image">
        </div>
      `;
    }
    return `
      <div class="history-card__thumb">
        <span class="history-card__thumb-fallback">${thumbnailLabel(item)}</span>
      </div>
    `;
  }

  function renderItems(items) {
    historyList.innerHTML = "";
    if (!items.length) {
      historyList.style.display = "none";
      empty.style.display = "grid";
      return;
    }

    empty.style.display = "none";
    historyList.style.display = "grid";

    items.forEach((item) => {
      const confidence = Number((Number(item.confidence || 0) * 100).toFixed(1));
      const node = document.createElement("article");
      node.className = "card history-card";
      node.innerHTML = `
        <div class="history-card__head">
          <label class="check-chip">
            <input type="checkbox" data-select-id="${item.id}" ${selectedIds.has(item.id) ? "checked" : ""}>
            <span>Select</span>
          </label>
          <span class="${genreBadgeClass(item.top_genre)}">${GenreSenseUI.capitalize(item.top_genre)}</span>
        </div>
        ${historyThumbnail(item)}
        <div class="history-card__body">
          <strong class="history-card__title">${item.image_name}</strong>
          <span class="history-card__time">${GenreSenseUI.formatDate(item.timestamp)}</span>
        </div>
        <div class="progress-block">
          <div class="progress-block__head">
            <span>Confidence</span>
            <strong>${confidence}%</strong>
          </div>
          <div class="progress progress--large">
            <div class="progress__bar" style="width:${confidence}%"></div>
          </div>
        </div>
        <div class="history-card__actions">
          <button class="btn btn--danger" type="button" data-delete-id="${item.id}">Delete</button>
        </div>
      `;
      historyList.appendChild(node);
    });

    historyList.querySelectorAll("[data-select-id]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = Number(input.getAttribute("data-select-id"));
        if (input.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateSelectionBar();
      });
    });

    historyList.querySelectorAll("[data-delete-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-delete-id");
        GenreSenseUI.openModal(
          "Delete history item",
          "This will remove the selected analysis from your saved history.",
          '<button class="btn btn--ghost" type="button" data-modal-close>Cancel</button><button class="btn btn--danger" type="button" id="confirm-delete">Delete</button>'
        );
        const confirmButton = document.getElementById("confirm-delete");
        if (confirmButton) {
          confirmButton.addEventListener("click", async () => {
            try {
              await GenreSenseApi.remove(`/history/${id}`);
              selectedIds.delete(Number(id));
              GenreSenseUI.closeModal();
              GenreSenseUI.showToast("History item deleted.", "success");
              await loadHistory();
            } catch (error) {
              GenreSenseUI.showToast(error.message, "error");
            }
          }, { once: true });
        }
      });
    });
  }

  function applyFilters() {
    const genre = genreFilter.value;
    const date = dateFilter.value;
    const filtered = allItems.filter((item) => {
      const matchGenre = genre === "all" || item.top_genre === genre;
      const matchDate = !date || String(item.timestamp).slice(0, 10) === date;
      return matchGenre && matchDate;
    });
    setMetrics(filtered);
    renderChart(filtered.length ? filtered : allItems);
    renderItems(filtered);
  }

  async function loadHistory() {
    loading.style.display = "grid";
    historyList.style.display = "none";
    empty.style.display = "none";
    try {
      const history = await GenreSenseApi.get(`/history/${user.id}`);
      allItems = history;
      selectedIds.forEach((id) => {
        if (!history.some((item) => item.id === id)) selectedIds.delete(id);
      });
      populateGenreFilter(history);
      applyFilters();
      updateSelectionBar();
    } catch (error) {
      empty.style.display = "grid";
      empty.innerHTML = `
        <div>
          <h3 style="margin:0 0 8px;">Unable to load history</h3>
          <p style="margin:0;">${error.message}</p>
        </div>
      `;
    } finally {
      loading.style.display = "none";
    }
  }

  genreFilter.addEventListener("change", applyFilters);
  dateFilter.addEventListener("change", applyFilters);
  clearFilters.addEventListener("click", () => {
    genreFilter.value = "all";
    dateFilter.value = "";
    applyFilters();
  });
  clearSelectionButton.addEventListener("click", () => {
    selectedIds.clear();
    applyFilters();
    updateSelectionBar();
  });
  bulkDeleteButton.addEventListener("click", () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    GenreSenseUI.openModal(
      "Delete selected history",
      `This will permanently remove ${ids.length} saved analys${ids.length === 1 ? "is" : "es"}.`,
      '<button class="btn btn--ghost" type="button" data-modal-close>Cancel</button><button class="btn btn--danger" type="button" id="confirm-bulk-delete">Delete selected</button>'
    );
    const confirmButton = document.getElementById("confirm-bulk-delete");
    if (confirmButton) {
      confirmButton.addEventListener("click", async () => {
        confirmButton.disabled = true;
        try {
          await deleteItems(ids);
          selectedIds.clear();
          GenreSenseUI.closeModal();
          GenreSenseUI.showToast("Selected history deleted.", "success");
          await loadHistory();
        } catch (error) {
          GenreSenseUI.showToast(error.message, "error");
        } finally {
          confirmButton.disabled = false;
        }
      }, { once: true });
    }
  });

  window.addEventListener("genresense:themechange", () => {
    if (pieChartItems.length) renderChart(pieChartItems);
  });

  await loadHistory();
});
