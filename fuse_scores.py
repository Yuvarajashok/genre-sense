import re

# -----------------------------
# Language Detection
# -----------------------------
def is_tamil(text: str) -> bool:
    return bool(re.search(r'[\u0B80-\u0BFF]', text))


# -----------------------------
# Tamil Keyword Scoring
# -----------------------------
def tamil_keyword_scores(text: str):
    scores = {
        "informational": 0.0,
        "awareness": 0.0,
        "promotional": 0.0,
        "spiritual": 0.0,
        "emotional": 0.0,
        "educational": 0.0,
        "entertainment": 0.0
    }

    t = text.lower()

    # Informational / News
    for kw in ["செய்தி", "தினசரி", "அறிவிப்பு", "தேதி", "மாவட்டம்", "அரசு"]:
        if kw in t:
            scores["informational"] += 0.2
            scores["awareness"] += 0.1

    # Promotional
    for kw in ["சலுகை", "விற்பனை", "தள்ளுபடி", "வாங்க"]:
        if kw in t:
            scores["promotional"] += 0.3

    # Spiritual
    for kw in ["கோவில்", "கடவுள்", "பூஜை", "பிரார்த்தனை", "ஆன்மீகம்"]:
        if kw in t:
            scores["spiritual"] += 0.35

    return scores


# -----------------------------
# Main Fusion Logic (FIXED)
# -----------------------------
def fuse(
    vision_scores: dict,
    text_scores: dict,
    ocr_text: str,
    word_count: int
):
    """
    vision_scores: CLIP image similarity scores
    text_scores: CLIP text similarity scores (English only)
    ocr_text: extracted text
    word_count: number of OCR words
    """

    # -------- TEXT DOMINANCE GATE --------
    text_dominant = word_count >= 20

    # -------- LANGUAGE CHECK --------
    tamil = is_tamil(ocr_text)

    final = {}

    # -------- CASE 1: TAMIL TEXT --------
    if tamil:
        tamil_scores = tamil_keyword_scores(ocr_text)

        for g in vision_scores:
            final[g] = (
                0.6 * tamil_scores.get(g, 0.0) +
                0.4 * vision_scores.get(g, 0.0)
            )

    # -------- CASE 2: ENGLISH TEXT --------
    else:
        # Check if text actually provides signal
        text_signal = sum(text_scores.values()) > 0.01

        if text_signal:
            if text_dominant:
                w_text, w_vision = 0.7, 0.3
            else:
                w_text, w_vision = 0.3, 0.7
        else:
            # No text signal -> Trust vision 100%
            w_text, w_vision = 0.0, 1.0

        for g in vision_scores:
            final[g] = (
                w_text * text_scores.get(g, 0.0) +
                w_vision * vision_scores.get(g, 0.0)
            )

    # -------- NORMALIZE (With Sharpening) --------
    # Use power of 4 to distinguish top scores from noise
    final_sharpened = {k: v**4 for k, v in final.items()}
    total = sum(final_sharpened.values()) + 1e-8
    
    for g in final:
        final[g] = round(final_sharpened[g] / total, 3)

    return final
