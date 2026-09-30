from datetime import datetime


def _normalise(value):
    if not isinstance(value, str):
        return ""
    return " ".join(value.strip().casefold().split())


def _matches(left, right):
    left_value = _normalise(left)
    right_value = _normalise(right)
    return bool(left_value and right_value and left_value == right_value)


def _parse_date(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def calculate_rule_score(lost_item, found_item):
    """Return the deterministic TrackBack rule score out of 100."""
    score = 0

    if _matches(lost_item.get("category"), found_item.get("category")):
        score += 30
    if _matches(lost_item.get("colour"), found_item.get("colour")):
        score += 25
    if _matches(lost_item.get("brand"), found_item.get("brand")):
        score += 20
    if _matches(lost_item.get("location"), found_item.get("location")):
        score += 15

    lost_date = _parse_date(lost_item.get("date"))
    found_date = _parse_date(found_item.get("date"))
    if lost_date and found_date and abs((lost_date - found_date).total_seconds()) <= 3 * 24 * 60 * 60:
        score += 10

    return score
