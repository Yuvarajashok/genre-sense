# core/predictor.py

from ocr.extract_text import extract_text
from vision.image_similarity import image_similarity
from text.text_similarity import text_similarity
from fusion.fuse_scores import fuse
from rules.genre_prompts import GENRE_PROMPTS
from core.visual_event_classifier import (
    classify_visual_type,
    classify_event_type
)


def predict(image_path: str) -> dict:
    """
    Main genre prediction pipeline.
    SINGLE source of truth.
    """

    # Validate image path exists
    import os
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    # --------------------------------------------------
    # 0️⃣ Visual Type (VERY IMPORTANT – runs FIRST)
    # --------------------------------------------------
    visual_type, visual_scores = classify_visual_type(image_path)

    # Restrict genres for certain visual types
    if visual_type in ["portrait", "logo"]:
        allowed_genres = {"emotional", "promotional", "educational"}
    else:
        allowed_genres = None

    # --------------------------------------------------
    # 1️⃣ OCR
    # --------------------------------------------------
    ocr_text = extract_text(image_path)
    word_count = len(ocr_text.split()) if ocr_text else 0

    # --------------------------------------------------
    # 2️⃣ Vision Similarity (CLIP image → genre embeddings)
    # --------------------------------------------------
    vision_scores = image_similarity(image_path)

    # --------------------------------------------------
    # 3️⃣ Text Similarity (CLIP text – English only)
    # --------------------------------------------------
    text_scores = text_similarity(ocr_text, GENRE_PROMPTS)

    # --------------------------------------------------
    # 4️⃣ Fusion (language + dominance aware)
    # --------------------------------------------------
    final_scores = fuse(
        vision_scores=vision_scores,
        text_scores=text_scores,
        ocr_text=ocr_text,
        word_count=word_count
    )

    # --------------------------------------------------
    # 5️⃣ Event-aware correction
    # --------------------------------------------------
    if visual_type == "event":
        event_type, _ = classify_event_type(image_path)

        if event_type == "academic":
            final_scores["educational"] += 0.05
        elif event_type == "religious":
            final_scores["spiritual"] += 0.05
        elif event_type == "commercial":
            final_scores["promotional"] += 0.05
        elif event_type == "protest":
            final_scores["awareness"] += 0.05

    # --------------------------------------------------
    # 6️⃣ Apply genre restriction (portrait / logo)
    # --------------------------------------------------
    if allowed_genres is not None:
        for g in list(final_scores.keys()):
            if g not in allowed_genres:
                final_scores[g] = 0.0

    # --------------------------------------------------
    # 7️⃣ Normalize (AGAIN after adjustments)
    # --------------------------------------------------
    total = sum(final_scores.values()) + 1e-8
    for g in final_scores:
        final_scores[g] = round(final_scores[g] / total, 3)

    # --------------------------------------------------
    # 8️⃣ Ranking
    # --------------------------------------------------
    ranked = sorted(
        final_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    top_genre, top_score = ranked[0]

    # --------------------------------------------------
    # 9️⃣ Output (API + UI friendly)
    # --------------------------------------------------
    return {
        "top_genre": top_genre,
        "confidence": round(top_score, 3),
        "visual_type": visual_type,
        "top_3": [
            {"genre": g, "score": s}
            for g, s in ranked[:3]
        ],
        "ambiguous": top_score < 0.25
    }
