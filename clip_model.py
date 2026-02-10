# core/clip_model.py
"""
Centralized CLIP model loader.
CLIP is loaded ONLY ONCE here.
All other modules must import from this file.
"""

import torch
import clip

# -----------------------------
# Device Selection
# -----------------------------
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# -----------------------------
# Load CLIP Model (ONCE)
# -----------------------------
model, preprocess = clip.load("ViT-B/32", device=DEVICE)

# -----------------------------
# Sanity Check (optional)
# -----------------------------
if model is None:
    raise RuntimeError("CLIP model failed to load")
