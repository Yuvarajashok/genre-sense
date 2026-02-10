from vision.image_similarity import image_similarity
from text.text_similarity import text_similarity
from rules.genre_prompts import GENRE_PROMPTS
from ocr.extract_text import extract_text

image_path = "input/sale.jpg" # A clear promotional image

print(f"DEBUGGING: {image_path}")

# 1. Vision Scores
v_scores = image_similarity(image_path)
print("\n--- Raw Vision Scores ---")
for g, s in v_scores.items():
    print(f"{g}: {s:.4f}")

# 2. Text Scores
ocr = extract_text(image_path)
t_scores = text_similarity(ocr, GENRE_PROMPTS)
print("\n--- Raw Text Scores ---")
for g, s in t_scores.items():
    print(f"{g}: {s:.4f}")
