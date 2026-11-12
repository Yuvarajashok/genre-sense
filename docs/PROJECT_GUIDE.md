# Architecture and data guide

[Back to README](../README.md)

## Source map

| Files | Responsibility |
| --- | --- |
| clip_model.py | Load CLIP ViT-B/32 and select CPU/CUDA |
| extract_text.py | Image preprocessing and English/Tamil OCR |
| encode_dataset.py | Encode genre-folder images into saved vectors |
| image_similarity.py | Compare input image against saved genre vectors |
| text_similarity.py, genre_prompts.py | Compare English OCR text with genre prompts |
| visual_event_classifier.py | Visual-type and event classification |
| fuse_scores.py, predictor.py | Combine scores, apply rules, normalize and rank |
| database.py | SQLite users and analysis-history helpers |
| HTML pages, css/, js/ | Browser interface |

Package versions are under core/, ocr/, vision/, text/, fusion/, and rules/. The restored UI is under frontend/. Root versions remain as legacy copies; Python package imports use the package paths.

## Prediction flow

Image → visual type → OCR → image and text similarity → fusion → event corrections → genre restrictions → normalized ranking.

For portraits and logos, the predictor restricts results to emotional, promotional, and educational. Event adjustments can add weight to educational, spiritual, promotional, or awareness. The final scores are normalized and rounded.

The frontend uses same-origin requests and /page/... navigation. The backend routes are not included, so an HTTP API contract cannot be verified from this checkout.

## Dataset preparation

The encoding script expects a working-directory-relative structure:

```text
dataset/
  educational/
  informational/
  entertainment/
  emotional/
  promotional/
  awareness/
  spiritual/
embeddings/
```

Put appropriate JPG/JPEG/PNG images inside genre folders; subfolders are scanned recursively. Dataset provenance, image rights, collection method, class counts, and train/evaluation splits are not supplied.

After installing dependencies and supplying an approved local dataset, the intended command from the project root is:

```text
python encode_dataset.py
```

This writes `embeddings/genre_embeddings.pt`. It creates the embeddings directory, but does not supply the images. A genre with no successfully encoded images fails at concatenation; later image similarity selects the top five vectors, so provide at least five valid encoded images per genre. This minimum is an implementation requirement, not evidence of adequate model quality.

The restored vision/image_similarity.py resolves embeddings relative to the project root. The retained root image_similarity.py is a legacy copy with different relative-path behavior; use the package import.

## Pipeline output

`predict(image_path)` returns:

| Field | Meaning |
| --- | --- |
| top_genre | Highest-ranked genre |
| confidence | Rounded normalized top score |
| visual_type | Detected visual type |
| top_3 | Up to three genre/score pairs |
| ambiguous | True when the top score is below 0.25 |

These normalized scores are not measured accuracy or calibrated probabilities. No sample prediction is presented as an actual execution result.

## Language and model limitations

- OCR requests English and Tamil; the text-similarity function returns zero scores when Tamil characters are present.
- Poor images or OCR failures can remove the text signal.
- Dataset examples, heuristic rules, and genre ambiguity affect the output.
- Image format support depends on installed decoders; comments alone do not establish compatibility.
- The SQLite account helper uses SHA-256 directly for passwords; this academic snapshot should not be represented as production authentication.

## Evaluation and demonstration

No public benchmark dataset, measured accuracy, confusion matrix, screenshots, or verified deployment is included. Dataset and embeddings were deliberately excluded from the recovery to protect private content. To produce a defensible evaluation later:

1. Record environment, model version, dataset source and class counts.
2. Hold out evaluation images from the genre reference dataset.
3. Report per-class precision/recall, confusion matrix, ambiguous cases, OCR failures, and latency.
4. Evaluate English, Tamil, and image-only inputs separately.
5. Capture real UI screenshots only after the complete application runs.

A successful import or plausible-looking prediction is not an accuracy evaluation.

## Public repository boundary

Only source and generic UI assets were recovered. dataset/, embeddings/, uploads/, profile_pics/, databases, logs, caches, and virtual environments remain private/local and are ignored by Git. See the setup guide for reproducing embeddings from your own approved images.
