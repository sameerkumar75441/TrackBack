from pathlib import Path
import os

import imagehash
from PIL import Image, UnidentifiedImageError


def _upload_directory():
    configured_path = os.getenv("ITEM_UPLOAD_DIR")
    if configured_path:
        return Path(configured_path).resolve()
    return (Path(__file__).resolve().parents[3] / "backend" / "uploads" / "items").resolve()


def _safe_image_path(image_path):
    if not isinstance(image_path, str) or not image_path.strip():
        return None
    try:
        candidate = Path(image_path).resolve(strict=True)
        candidate.relative_to(_upload_directory())
        return candidate
    except (OSError, ValueError):
        return None


def _hash_images(image_paths):
    hashes = []
    for image_path in image_paths or []:
        safe_path = _safe_image_path(image_path)
        if not safe_path:
            continue
        try:
            with Image.open(safe_path) as image:
                hashes.append(imagehash.phash(image.convert("RGB")))
        except (OSError, UnidentifiedImageError):
            continue
    return hashes


def calculate_image_similarity(lost_images, found_images):
    """Return best pHash similarity in [0, 1], or None when unavailable."""
    lost_hashes = _hash_images(lost_images)
    found_hashes = _hash_images(found_images)
    if not lost_hashes or not found_hashes:
        return None

    maximum_distance = 64  # imagehash.phash default is an 8x8 hash.
    return max(1.0 - ((lost_hash - found_hash) / maximum_distance) for lost_hash in lost_hashes for found_hash in found_hashes)
