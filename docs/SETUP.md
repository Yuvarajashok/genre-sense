# Setup prerequisites and troubleshooting

[Back to README](../README.md)

## Before attempting a full run

The current checkout cannot be documented as a complete runnable application:

| Required part | Current situation |
| --- | --- |
| Importable Python packages | Restored core/, ocr/, vision/, text/, fusion/, rules/; legacy root copies retained |
| Dataset | Intentionally excluded; supply non-sensitive, rights-cleared data locally |
| Image embeddings | Intentionally excluded; generate locally from your approved dataset |
| Web server | No FastAPI app/route entry point is included |
| Dependency versions | No requirements or lock file is included |
| Verified runtime | No supported Python version or CPU/GPU benchmark is recorded |

Package layout and available frontend assets have been restored. A complete web run still needs the original server implementation and local dataset/embeddings. No server logic has been invented.

## Environment preparation

Use an isolated Python environment. The original tested Python version is unknown; choose a version compatible with the required packages and record the version used.

```powershell
git clone https://github.com/Yuvarajashok/genre-sense.git
cd genre-sense
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

Source imports identify these dependency families: PyTorch, OpenAI CLIP, Pillow, NumPy, OpenCV, pytesseract, and tqdm. There is no tested/pinned installation set. The `clip` import refers to the OpenAI CLIP implementation, not an arbitrary similarly named package.

The model loader requests ViT-B/32 and selects CUDA if PyTorch reports it available; otherwise it uses CPU. Initial model loading may require a model download. No minimum RAM/VRAM or speed claim has been measured.

## OCR

The restored [ocr/extract_text.py](../ocr/extract_text.py) locates Tesseract using shutil.which("tesseract"). Put a working Tesseract installation on PATH with English (eng) and Tamil (tam) trained data. The retained root extract_text.py is the older hardcoded-Windows-path copy; the packaged pipeline imports ocr.extract_text.

OCR exceptions return empty text, so empty output can also mean missing executables/language data or image-decoding failures.

## Running the recovered pipeline

- Prepare genre images and generate embeddings as described in [PROJECT_GUIDE.md](PROJECT_GUIDE.md).
- The pipeline exposes `predict(image_path)`, returning a dictionary. Its imports must resolve first.
- A web server entry point must still be recovered before publishing an HTTP startup command. Opening HTML directly cannot supply the missing server routes or database-backed login.
- Database helpers create `genre_sense.db` relative to the working directory when imported. Avoid importing against a valuable existing database during experiments.

## Troubleshooting

| Symptom | First check |
| --- | --- |
| No module named core/ocr/vision | Run from the project root and confirm the restored package folders are present |
| Missing genre_embeddings.pt | Dataset encoding and expected embeddings path |
| topk error | At least five successfully encoded images per genre are needed by image_similarity.py |
| Empty OCR | Tesseract on PATH, eng/tam language data, image readability |
| Tamil text receives zero CLIP text scores | Explicit behavior in text_similarity.py |
| Browser login/API failure | Missing server implementation; HTML alone is insufficient |
| Unexpected database location | Working directory used when database.py is imported |

Use only trusted dataset/model files. Do not publish personal images, account data, or database files when reporting a problem.

## Remaining UI asset gap

The recovered frontend references /css/gs_logo.png in some screens, while the recovered logo is frontend/gs_logo.webp. The missing PNG/server route was not synthesized. This and the absent server remain visible recovery limitations.
