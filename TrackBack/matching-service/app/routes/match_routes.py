from datetime import datetime

from flask import Blueprint, jsonify, request

from app.services.matcher import compare_items

match_blueprint = Blueprint("match", __name__)


def _valid_date(value):
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def _validate_item(item, expected_type):
    if not isinstance(item, dict):
        return f"{expected_type}Item must be an object."
    if item.get("type") != expected_type:
        return f"{expected_type}Item.type must be '{expected_type}'."
    if "date" in item and item["date"] is not None and not _valid_date(item["date"]):
        return f"{expected_type}Item.date must be a valid ISO-8601 date."
    if "images" in item and not isinstance(item["images"], list):
        return f"{expected_type}Item.images must be an array."
    return None


@match_blueprint.post("/match")
def match():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"message": "Request body must be a JSON object."}), 400

    lost_item = payload.get("lostItem")
    found_item = payload.get("foundItem")
    error = _validate_item(lost_item, "lost") or _validate_item(found_item, "found")
    if error:
        return jsonify({"message": error}), 400

    return jsonify(compare_items(lost_item, found_item)), 200
