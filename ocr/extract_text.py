# ocr/extract_text.py

import pytesseract
from PIL import Image
import cv2
import numpy as np
import re
import os
import shutil
pytesseract.pytesseract.tesseract_cmd = shutil.which("tesseract")



# -----------------------------
# OCR Extraction (Robust)
# -----------------------------
def extract_text(image_path: str) -> str:
    """
    Extracts readable OCR text from image.
    Returns clean text or empty string.
    Handles AVIF, WebP, PNG, JPG, and other formats.
    """

    if not os.path.exists(image_path):
        return ""

    try:
        # Load image with PIL first (handles AVIF, WebP, etc.)
        # Then convert to OpenCV format for preprocessing
        pil_img = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        
        if img is None or img.size == 0:
            return ""

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Light thresholding (improves Tamil & English)
        gray = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            10
        )

        # OCR
        text = pytesseract.image_to_string(
            gray,
            lang="eng+tam",
            config="--psm 6"
        )

        # Clean whitespace
        text = re.sub(r"\s+", " ", text).strip()

        # Remove junk OCR (too short / symbols only)
        if len(text) < 3 or not re.search(r"[A-Za-z\u0B80-\u0BFF]", text):
            return ""

        return text

    except Exception:
        return ""
