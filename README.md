# Genre Sense

An academic final-year project for classifying images into semantic genres using visual features and text extracted from the image.

## Features represented in the source

- OpenAI CLIP ViT-B/32 image features and genre comparisons.
- Tesseract OCR configured for English and Tamil.
- Text similarity, visual-type rules, and multimodal score fusion.
- Seven genre labels: educational, informational, entertainment, emotional, promotional, awareness, and spiritual.
- HTML/CSS/JavaScript screens for login, dashboard, history, profile, and project information.
- SQLite helpers for users and analysis history.

Tamil OCR and Tamil text similarity are different capabilities: the OCR requests `eng+tam`, while the current CLIP text-similarity function skips text containing Tamil characters.

## Current checkout status

The local frontend and package folders have been restored. core/ contains exact copies of the existing repository's CLIP loader, predictor, and visual classifier; root copies remain as legacy source. Dataset, generated embeddings, and user files are intentionally excluded.

A FastAPI server entry point was not found in the repository or recovered local source. This is still not a verified complete web application. Installing dependencies alone does not resolve the missing server/data prerequisites. No working server command or measured accuracy is claimed.

## Documentation

- [Setup prerequisites and troubleshooting](docs/SETUP.md)
- [Architecture, data preparation, output, and evaluation](docs/PROJECT_GUIDE.md)
- [Restored in-app About page](frontend/about.html)
- [Contribution guidance](CONTRIBUTING.md)

## Technology

Python, PyTorch, OpenAI CLIP, Pillow, OpenCV, NumPy, Tesseract/pytesseract, SQLite, and plain HTML/CSS/JavaScript. The About page describes a FastAPI backend, but its implementation is not included in this snapshot.

## Verification and licensing

This documentation was checked against repository files, without running the application. Screenshots, a hosted demo, and an evaluation report are not supplied. No license file is present; no license has been chosen by this documentation update.
