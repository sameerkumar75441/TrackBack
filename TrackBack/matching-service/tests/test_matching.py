import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw

from app import create_app
from app.services.image_similarity import calculate_image_similarity
from app.services.matcher import compare_items
from app.services.rule_matcher import calculate_rule_score
from app.services.text_similarity import calculate_text_similarity


def item(**overrides):
    result = {
        "title": "Blue Campus Backpack",
        "description": "Blue backpack with a laptop pocket",
        "type": "lost",
        "category": "bags",
        "colour": "Blue",
        "brand": "Northwind",
        "location": "Library",
        "date": "2026-09-20T10:00:00Z",
        "images": [],
    }
    result.update(overrides)
    return result


class RuleMatcherTests(unittest.TestCase):
    def test_all_fields_and_close_date_score_100(self):
        found = item(type="found", date="2026-09-23T10:00:00Z")
        self.assertEqual(calculate_rule_score(item(), found), 100)

    def test_each_rule_weight_individually(self):
        base = item(category="keys", colour="red", brand="other", location="Hostel", date="2026-08-01T00:00:00Z")
        self.assertEqual(calculate_rule_score(item(), base), 0)
        self.assertEqual(calculate_rule_score(item(), {**base, "category": "bags"}), 30)
        self.assertEqual(calculate_rule_score(item(), {**base, "colour": "blue"}), 25)
        self.assertEqual(calculate_rule_score(item(), {**base, "brand": "northwind"}), 20)
        self.assertEqual(calculate_rule_score(item(), {**base, "location": "library"}), 15)
        self.assertEqual(calculate_rule_score(item(), {**base, "date": "2026-09-23T10:00:00Z"}), 10)

    def test_date_more_than_three_days_and_missing_optional_fields(self):
        found = item(type="found", date="2026-09-24T10:00:01Z", colour=None, brand="")
        lost = item(colour=None, brand="")
        self.assertEqual(calculate_rule_score(lost, found), 45)


class TextMatcherTests(unittest.TestCase):
    def test_identical_text_is_more_similar_than_different_text(self):
        identical = calculate_text_similarity(item(), item(type="found"))
        different = calculate_text_similarity(item(), item(type="found", title="Silver key", description="Small metal key"))
        self.assertGreaterEqual(identical, 0.99)
        self.assertLess(different, identical)

    def test_empty_text_is_safe(self):
        self.assertEqual(calculate_text_similarity({"title": "", "description": ""}, item(type="found")), 0.0)


class ImageMatcherTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = TemporaryDirectory()
        self.upload_directory = Path(self.temporary_directory.name)
        self.original_upload_directory = os.environ.get("ITEM_UPLOAD_DIR")
        os.environ["ITEM_UPLOAD_DIR"] = str(self.upload_directory)

        self.first_path = self.upload_directory / "first.png"
        self.same_path = self.upload_directory / "same.png"
        self.different_path = self.upload_directory / "different.png"
        self.invalid_path = self.upload_directory / "invalid.png"

        first = Image.new("RGB", (128, 128), "white")
        ImageDraw.Draw(first).rectangle((10, 10, 55, 110), fill="black")
        first.save(self.first_path)
        first.save(self.same_path)

        different = Image.new("RGB", (128, 128), "white")
        ImageDraw.Draw(different).rectangle((73, 10, 118, 110), fill="black")
        different.save(self.different_path)
        self.invalid_path.write_text("not an image", encoding="utf-8")

    def tearDown(self):
        if self.original_upload_directory is None:
            os.environ.pop("ITEM_UPLOAD_DIR", None)
        else:
            os.environ["ITEM_UPLOAD_DIR"] = self.original_upload_directory
        self.temporary_directory.cleanup()

    def test_same_image_is_more_similar_than_different_image(self):
        same = calculate_image_similarity([str(self.first_path)], [str(self.same_path)])
        different = calculate_image_similarity([str(self.first_path)], [str(self.different_path)])
        self.assertGreaterEqual(same, 0.99)
        self.assertLess(different, same)

    def test_missing_or_invalid_image_returns_none(self):
        self.assertIsNone(calculate_image_similarity([], [str(self.first_path)]))
        self.assertIsNone(calculate_image_similarity([str(self.invalid_path)], [str(self.first_path)]))


class FinalScoreTests(unittest.TestCase):
    def test_image_formula(self):
        with patch("app.services.matcher.calculate_rule_score", return_value=80), patch("app.services.matcher.calculate_text_similarity", return_value=0.6), patch("app.services.matcher.calculate_image_similarity", return_value=0.9):
            result = compare_items(item(), item(type="found"))
        self.assertAlmostEqual(result["finalScore"], 0.5 * 0.8 + 0.3 * 0.6 + 0.2 * 0.9)

    def test_no_image_formula(self):
        with patch("app.services.matcher.calculate_rule_score", return_value=80), patch("app.services.matcher.calculate_text_similarity", return_value=0.6), patch("app.services.matcher.calculate_image_similarity", return_value=None):
            result = compare_items(item(), item(type="found"))
        self.assertAlmostEqual(result["finalScore"], 0.65 * 0.8 + 0.35 * 0.6)


class MatchingApiTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_health_and_valid_pair(self):
        self.assertEqual(self.client.get("/health").status_code, 200)
        response = self.client.post("/match", json={"lostItem": item(), "foundItem": item(type="found")})
        self.assertEqual(response.status_code, 200)
        self.assertIn("finalScore", response.get_json())

    def test_invalid_pairs_are_rejected(self):
        lost_pair = self.client.post("/match", json={"lostItem": item(), "foundItem": item()})
        found_pair = self.client.post("/match", json={"lostItem": item(type="found"), "foundItem": item(type="found")})
        self.assertEqual(lost_pair.status_code, 400)
        self.assertEqual(found_pair.status_code, 400)


if __name__ == "__main__":
    unittest.main()
