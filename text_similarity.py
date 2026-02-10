import re
import torch
import clip
from core.clip_model import model, DEVICE

TAMIL_REGEX = re.compile(r'[\u0B80-\u0BFF]')
MAX_CLIP_TOKENS = 75  # keep margin below 77

_genre_text_features = None


def _encode_genre_prompts(genre_prompts):
    global _genre_text_features
    if _genre_text_features is not None:
        return

    tokens = clip.tokenize(list(genre_prompts.values())).to(DEVICE)
    with torch.no_grad():
        feats = model.encode_text(tokens)
        feats = feats / feats.norm(dim=-1, keepdim=True)

    _genre_text_features = {
        g: feats[i] for i, g in enumerate(genre_prompts.keys())
    }


def safe_tokenize(text: str):
    """
    Tokenize and hard-truncate to CLIP-safe length
    """
    tokens = clip.tokenize([text], truncate=False)[:, :MAX_CLIP_TOKENS]
    return tokens


def text_similarity(ocr_text: str, genre_prompts: dict) -> dict:
    # No OCR or too small
    if not ocr_text or len(ocr_text.strip()) < 5:
        return {g: 0.0 for g in genre_prompts}

    # Tamil or non-English → skip CLIP text
    if TAMIL_REGEX.search(ocr_text):
        return {g: 0.0 for g in genre_prompts}

    global _genre_text_features
    if _genre_text_features is None:
        _encode_genre_prompts(genre_prompts)

    # Normalize OCR text
    text = re.sub(r"\s+", " ", ocr_text).strip()

    try:
        tokens = safe_tokenize(text).to(DEVICE)

        with torch.no_grad():
            txt_feat = model.encode_text(tokens)
            txt_feat = txt_feat / txt_feat.norm(dim=-1, keepdim=True)

        return {
            g: float(txt_feat @ f.unsqueeze(1))
            for g, f in _genre_text_features.items()
        }

    except Exception:
        # Absolute safety fallback
        return {g: 0.0 for g in genre_prompts}
