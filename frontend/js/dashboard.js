document.addEventListener("DOMContentLoaded", () => {
  const user = GenreSenseAuth.requireAuth();
  if (!user) return;

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  let selectedFile = null;
  let probabilityChart = null;
  let probabilityChartItems = [];

  document.body.innerHTML = GenreSenseUI.buildAppShell({
    active: "dashboard",
    title: "Dashboard",
    subtitle: "Upload an image and review multimodal genre prediction with confidence insights.",
    content: `
      <section class="page-grid page-grid--2">
        <section class="stack">
          <div class="card card--glass">
            <div class="card__header">
              <div>
                <span class="kicker">Prediction Workspace</span>
                <h3 class="card__title">Upload image</h3>
                <p class="card__subtitle">The same production pipeline uses CLIP vision, OCR text extraction, and fusion scoring.</p>
              </div>
            </div>
            <div id="drop-zone" class="upload-zone">
              <div class="upload-zone__icon">⬆</div>
              <div>
                <strong class="upload-zone__title">Drop your image here</strong>
                <span class="upload-zone__hint">Supports JPG, PNG, WEBP, GIF, BMP, and AVIF up to 10 MB.</span>
              </div>
            </div>
            <input id="file-input" type="file" accept="image/*" hidden>
            <div id="preview-card" class="preview-card" style="display:none;">
              <img id="preview-image" class="preview-card__image" alt="Selected preview">
              <div class="preview-card__meta">
                <div>
                  <strong id="preview-name">Selected image</strong>
                  <div id="preview-size" class="preview-card__details"></div>
                </div>
                <div class="preview-card__actions">
                  <button id="analyze-btn" type="button" class="btn btn--primary">Analyze genre</button>
                  <button id="clear-btn" type="button" class="btn btn--ghost">Clear</button>
                </div>
              </div>
            </div>
          </div>

          <div class="card chart-card chart-card--highlight">
            <div class="card__header">
              <div>
                <span class="kicker">Top 3 Chart</span>
                <h3 class="card__title">Probability distribution</h3>
                <p class="card__subtitle">Top-ranked genres are visualized as a quick academic summary.</p>
              </div>
            </div>
            <div class="chart-wrap chart-wrap--compact">
              <canvas id="probability-chart"></canvas>
            </div>
          </div>
        </section>

        <section class="stack">
          <div id="loading-card" class="card loading-card" style="display:none;">
            <div class="loading-orbit">
              <div class="loading-spinner"></div>
              <div class="loading-pulse"></div>
            </div>
            <h3 class="loading-card__title">Analyzing image</h3>
            <p class="loading-card__text">Running visual extraction, OCR, and fusion logic across the prediction pipeline.</p>
            <div class="loading-steps">
              <span>Vision encoding</span>
              <span>OCR text scan</span>
              <span>Score fusion</span>
            </div>
          </div>

          <div id="result-empty" class="card empty-state">
            <div>
              <h3 style="margin:0 0 8px;">Prediction results will appear here</h3>
              <p style="margin:0;">Upload an image to view confidence progress, top-3 ranking, and chart insights.</p>
            </div>
          </div>

          <div id="result-card" class="stack" style="display:none;">
            <div class="card card--hero result-hero">
              <div class="card__header">
                <div class="result-hero__badges">
                  <span id="result-ambiguity" class="badge badge--warning" style="display:none;">Ambiguous result</span>
                  <span id="result-visual-type" class="badge badge--accent">Visual type</span>
                </div>
                <a href="/page/history" class="btn btn--secondary">Open history</a>
              </div>

              <div>
                <div class="result-hero__label">Top genre</div>
                <h2 id="result-genre" class="result-hero__title">-</h2>
                <div id="result-confidence" class="result-hero__confidence">Confidence 0%</div>
              </div>

              <div class="confidence-meter">
                <div class="confidence-meter__meta">
                  <strong>Confidence progress</strong>
                  <span id="confidence-meter-value">0%</span>
                </div>
                <div class="confidence-meter__track">
                  <div id="confidence-meter-fill" class="confidence-meter__fill"></div>
                </div>
              </div>

              <div class="result-insights">
                <article class="insight-card">
                  <span class="insight-card__label">Preference match</span>
                  <strong id="preference-title" class="insight-card__value">Pending</strong>
                  <span id="preference-badge" class="badge badge--primary">Waiting for analysis</span>
                </article>
                <article class="insight-card">
                  <span class="insight-card__label">Top-1 margin</span>
                  <strong id="margin-value" class="insight-card__value">0%</strong>
                  <span class="insight-card__note">Difference between first and second prediction</span>
                </article>
                <article class="insight-card">
                  <span class="insight-card__label">Pipeline note</span>
                  <strong id="pipeline-note" class="insight-card__value">Ready</strong>
                  <span class="insight-card__note">Result commentary for academic interpretation</span>
                </article>
              </div>
            </div>

            <div class="card">
              <div class="card__header">
                <div>
                  <span class="kicker">Ranked Output</span>
                  <h3 class="card__title">Top 3 predictions</h3>
                </div>
              </div>
              <div id="prediction-list" class="prediction-list"></div>
            </div>

            <div class="card">
              <div class="card__header">
                <div>
                  <span class="kicker">Confidence Bars</span>
                  <h3 class="card__title">Probability breakdown</h3>
                </div>
              </div>
              <div id="progress-list" class="stack"></div>
            </div>
          </div>
        </section>
      </section>
    `
  });

  GenreSenseUI.initShell();

  const dropZone = GenreSenseUI.qs("#drop-zone");
  const fileInput = GenreSenseUI.qs("#file-input");
  const previewCard = GenreSenseUI.qs("#preview-card");
  const previewImage = GenreSenseUI.qs("#preview-image");
  const previewName = GenreSenseUI.qs("#preview-name");
  const previewSize = GenreSenseUI.qs("#preview-size");
  const analyzeButton = GenreSenseUI.qs("#analyze-btn");
  const clearButton = GenreSenseUI.qs("#clear-btn");
  const loadingCard = GenreSenseUI.qs("#loading-card");
  const resultEmpty = GenreSenseUI.qs("#result-empty");
  const resultCard = GenreSenseUI.qs("#result-card");

  function resetResults() {
    resultCard.style.display = "none";
    loadingCard.style.display = "none";
    resultEmpty.style.display = "grid";
  }

  function clearSelection() {
    selectedFile = null;
    fileInput.value = "";
    previewImage.src = "";
    previewName.textContent = "Selected image";
    previewSize.textContent = "";
    previewCard.style.display = "none";
    resetResults();
    GenreSenseUI.destroyChart(probabilityChart);
    probabilityChart = null;
    probabilityChartItems = [];
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function renderProbabilityChart(items) {
    if (!window.Chart) return;
    const canvas = GenreSenseUI.qs("#probability-chart");
    const palette = GenreSenseUI.getThemePalette();
    probabilityChartItems = items.slice();
    GenreSenseUI.destroyChart(probabilityChart);
    probabilityChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: items.map((item) => GenreSenseUI.capitalize(item.genre)),
        datasets: [{
          data: items.map((item) => Number((item.score * 100).toFixed(1))),
          backgroundColor: [palette.primary, palette.accent, palette.warning],
          borderColor: palette.card,
          borderWidth: 4,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: palette.textSoft,
              padding: 18
            }
          }
        }
      }
    });
  }

  function handleFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      GenreSenseUI.showToast("File is too large. Please choose an image under 10 MB.", "error");
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      previewImage.src = event.target.result;
      previewName.textContent = file.name;
      previewSize.textContent = `${formatBytes(file.size)} selected`;
      previewCard.style.display = "grid";
      resetResults();
    };
    reader.readAsDataURL(file);
  }

  function confidenceCommentary(data) {
    if (data.ambiguous) return "The result is close across classes, so manual review is recommended.";
    if (data.confidence >= 0.75) return "The model shows a strong top prediction with clear separation.";
    if (data.confidence >= 0.5) return "The model shows a moderate preference for the leading genre.";
    return "The model is uncertain, so top-3 genres should be reviewed together.";
  }

  function renderResult(data) {
    const topThree = Array.isArray(data.top_3) ? data.top_3 : [];
    const leadScore = Number((data.confidence * 100).toFixed(1));
    const secondScore = topThree[1] ? Number((topThree[1].score * 100).toFixed(1)) : 0;
    const margin = Math.max(leadScore - secondScore, 0);

    resultEmpty.style.display = "none";
    resultCard.style.display = "grid";
    GenreSenseUI.qs("#result-genre").textContent = GenreSenseUI.capitalize(data.top_genre);
    GenreSenseUI.qs("#result-confidence").textContent = `Confidence ${leadScore.toFixed(1)}%`;
    GenreSenseUI.qs("#result-visual-type").textContent = GenreSenseUI.capitalize(data.visual_type || "Unknown");
    GenreSenseUI.qs("#result-ambiguity").style.display = data.ambiguous ? "inline-flex" : "none";
    GenreSenseUI.qs("#confidence-meter-value").textContent = `${leadScore.toFixed(1)}%`;
    GenreSenseUI.qs("#confidence-meter-fill").style.width = `${leadScore}%`;
    GenreSenseUI.qs("#margin-value").textContent = `${margin.toFixed(1)}%`;
    GenreSenseUI.qs("#pipeline-note").textContent = data.ambiguous ? "Review top-3" : "High-confidence lead";

    const preferenceBadge = GenreSenseUI.qs("#preference-badge");
    const preferred = topThree.find((item) => item.genre === user.default_genre);
    GenreSenseUI.qs("#preference-title").textContent = preferred ? "Preference found" : "Preference missing";
    preferenceBadge.className = `badge ${preferred ? "badge--accent" : "badge--warning"}`;
    preferenceBadge.textContent = preferred
      ? `${GenreSenseUI.capitalize(user.default_genre)} matches ${(preferred.score * 100).toFixed(1)}%`
      : `${GenreSenseUI.capitalize(user.default_genre)} not in top 3`;

    const predictionList = GenreSenseUI.qs("#prediction-list");
    const progressList = GenreSenseUI.qs("#progress-list");
    predictionList.innerHTML = "";
    progressList.innerHTML = "";

    topThree.forEach((item, index) => {
      const score = Number((item.score * 100).toFixed(1));
      const isPreferred = item.genre === user.default_genre;

      const card = document.createElement("article");
      card.className = `prediction-card ${isPreferred ? "prediction-card--highlight" : ""}`;
      card.innerHTML = `
        <div class="prediction-card__top">
          <span class="badge ${index === 0 ? "badge--primary" : "badge--accent"}">Rank ${index + 1}</span>
          ${isPreferred ? '<span class="badge badge--accent">Preferred</span>' : ""}
        </div>
        <h4 class="prediction-card__genre">${GenreSenseUI.capitalize(item.genre)}</h4>
        <p class="prediction-card__score">${score}%</p>
      `;
      predictionList.appendChild(card);

      const row = document.createElement("div");
      row.className = "progress-block";
      row.innerHTML = `
        <div class="progress-block__head">
          <strong>${GenreSenseUI.capitalize(item.genre)}</strong>
          <span>${score}%</span>
        </div>
        <div class="progress progress--large">
          <div class="progress__bar" style="width:0%"></div>
        </div>
      `;
      progressList.appendChild(row);
      requestAnimationFrame(() => {
        row.querySelector(".progress__bar").style.width = `${score}%`;
      });
    });

    GenreSenseUI.qs("#pipeline-note").nextElementSibling.textContent = confidenceCommentary(data);
    renderProbabilityChart(topThree);
  }

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-dragover"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragover");
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", (event) => {
    if (event.target.files && event.target.files[0]) {
      handleFile(event.target.files[0]);
    }
  });
  clearButton.addEventListener("click", clearSelection);

  analyzeButton.addEventListener("click", async () => {
    if (!selectedFile) {
      GenreSenseUI.showToast("Choose an image before analyzing.", "error");
      return;
    }

    analyzeButton.disabled = true;
    loadingCard.style.display = "grid";
    resultCard.style.display = "none";
    resultEmpty.style.display = "none";

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("user_id", user.id);

    try {
      const result = await GenreSenseApi.upload("/predict", formData);
      renderResult(result);
      GenreSenseUI.showToast("Prediction complete.", "success");
    } catch (error) {
      resultEmpty.style.display = "grid";
      resultEmpty.innerHTML = `
        <div>
          <h3 style="margin:0 0 8px;">Analysis failed</h3>
          <p style="margin:0;">${error.message}</p>
        </div>
      `;
      GenreSenseUI.showToast(error.message, "error");
    } finally {
      loadingCard.style.display = "none";
      analyzeButton.disabled = false;
    }
  });

  window.addEventListener("genresense:themechange", () => {
    if (probabilityChartItems.length) {
      renderProbabilityChart(probabilityChartItems);
    }
  });

  clearSelection();
});
