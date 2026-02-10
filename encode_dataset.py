import os
import torch
from PIL import Image
from tqdm import tqdm
from core.clip_model import model, preprocess, DEVICE

DATASET_DIR = "dataset"
OUT_FILE = os.path.join("embeddings", "genre_embeddings.pt")
os.makedirs("embeddings", exist_ok=True)

def collect_images(root):
    paths = []
    for dp, _, files in os.walk(root):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                paths.append(os.path.join(dp, f))
    return paths

genre_vectors = {}

for genre in os.listdir(DATASET_DIR):
    genre_path = os.path.join(DATASET_DIR, genre)
    if not os.path.isdir(genre_path):
        continue

    print(f"\nEncoding: {genre}")
    images = collect_images(genre_path)
    vectors = []

    for img_path in tqdm(images):
        try:
            img = Image.open(img_path).convert("RGB")
            img = preprocess(img).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                v = model.encode_image(img)
                v = v / v.norm(dim=-1, keepdim=True)
            vectors.append(v.cpu())
        except:
            continue

    genre_vectors[genre] = torch.cat(vectors, dim=0)

torch.save(genre_vectors, OUT_FILE)
print("\n✅ Dataset encoded → genre_embeddings.pt")
