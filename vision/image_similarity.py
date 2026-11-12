# vision/image_similarity.py

import torch
from PIL import Image
import os
from core.clip_model import model, preprocess, DEVICE

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBEDDING_PATH = os.path.join(BASE_DIR, "embeddings", "genre_embeddings.pt")

genre_embeddings = torch.load(EMBEDDING_PATH, map_location=DEVICE)

def image_similarity(image_path):
    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as e:
        # Return neutral scores if image cannot be opened
        return {g: 0.0 for g in genre_embeddings.keys()}
    
    try:
        image = preprocess(img).unsqueeze(0).to(DEVICE)
    except Exception:
        return {g: 0.0 for g in genre_embeddings.keys()}

    with torch.no_grad():
        img_feat = model.encode_image(image)
        img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)

    return {
        g: float((img_feat @ v.T).topk(5).values.mean())
        for g, v in genre_embeddings.items()
    }
