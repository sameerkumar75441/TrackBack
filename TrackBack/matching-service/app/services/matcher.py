from app.services.image_similarity import calculate_image_similarity
from app.services.rule_matcher import calculate_rule_score
from app.services.text_similarity import calculate_text_similarity


def compare_items(lost_item, found_item):
    rule_score = calculate_rule_score(lost_item, found_item)
    rule_score_normalized = rule_score / 100
    text_score = calculate_text_similarity(lost_item, found_item)
    image_score = calculate_image_similarity(lost_item.get("images"), found_item.get("images"))
    image_available = image_score is not None

    if image_available:
        final_score = 0.5 * rule_score_normalized + 0.3 * text_score + 0.2 * image_score
    else:
        final_score = 0.65 * rule_score_normalized + 0.35 * text_score

    return {
        "ruleScore": rule_score,
        "ruleScoreNormalized": rule_score_normalized,
        "textScore": text_score,
        "imageScore": image_score,
        "imageAvailable": image_available,
        "finalScore": final_score,
    }
