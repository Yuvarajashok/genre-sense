import torch
import clip
from PIL import Image
from core.clip_model import model, preprocess, DEVICE

VISUAL_TYPES = {
    "portrait": "a portrait photo of a person",
    "logo": "a company or brand logo",
    "poster": "a designed poster or banner with text",
    "event": "people attending an event or ceremony",
    "scene": "a general photo of environment or objects"
}

EVENT_TYPES = {
    "academic": "an academic or educational ceremony",
    "religious": "a religious or spiritual ceremony",
    "political": "a political or civic gathering",
    "social": "a family or personal social event",
    "cultural": "a cultural or entertainment event",
    "commercial": "a business or promotional event",
    "protest": "a protest or awareness rally"
}


def _clip_scores(image_path, prompts: dict):
    image = preprocess(Image.open(image_path).convert("RGB")).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        img_feat = model.encode_image(image)
        img_feat /= img_feat.norm(dim=-1, keepdim=True)

    scores = {}
    for k, p in prompts.items():
        t = clip.tokenize([p]).to(DEVICE)
        with torch.no_grad():
            txt_feat = model.encode_text(t)
            txt_feat /= txt_feat.norm(dim=-1, keepdim=True)
        scores[k] = float((img_feat @ txt_feat.T).item())

    return scores


def classify_visual_type(image_path):
    scores = _clip_scores(image_path, VISUAL_TYPES)
    return max(scores, key=scores.get), scores


def classify_event_type(image_path):
    scores = _clip_scores(image_path, EVENT_TYPES)
    return max(scores, key=scores.get), scores
