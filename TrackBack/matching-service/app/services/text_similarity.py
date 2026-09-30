from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _item_text(item):
    values = [item.get("title", ""), item.get("description", "")]
    return " ".join(value.strip() for value in values if isinstance(value, str) and value.strip())


def calculate_text_similarity(lost_item, found_item):
    """Compare title and description using TF-IDF cosine similarity."""
    documents = [_item_text(lost_item), _item_text(found_item)]
    if not documents[0] or not documents[1]:
        return 0.0

    try:
        matrix = TfidfVectorizer().fit_transform(documents)
    except ValueError:
        return 0.0

    score = float(cosine_similarity(matrix[0], matrix[1])[0][0])
    return max(0.0, min(1.0, score))
