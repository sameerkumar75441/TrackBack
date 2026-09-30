# TrackBack Matching Service

This internal Flask service compares one lost report with one found report. It uses deterministic rules, TF-IDF cosine similarity, and perceptual-hash image similarity. It does not create claims, change item status, or write to MongoDB.

## Setup and start

```powershell
cd matching-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

The service starts at `http://127.0.0.1:5001`. Set `MATCHING_SERVICE_URL=http://localhost:5001` in `backend/.env` before starting the Node backend.

For Phase 2 local uploads, both services must be able to read the same `backend/uploads/items` directory. Override its location with `ITEM_UPLOAD_DIR` when needed.

## Endpoints

- `GET /health`
- `POST /match`

`POST /match` accepts a `lostItem` and `foundItem`, using the backend Item fields. The item types must be `lost` and `found` respectively.

```json
{
  "lostItem": {
    "title": "Blue backpack",
    "description": "Blue backpack with a laptop compartment",
    "type": "lost",
    "category": "bags",
    "colour": "blue",
    "brand": "Northwind",
    "location": "Library",
    "date": "2026-09-20T10:00:00Z",
    "images": []
  },
  "foundItem": {
    "title": "Blue backpack",
    "description": "Backpack found near the library",
    "type": "found",
    "category": "bags",
    "colour": "blue",
    "brand": "Northwind",
    "location": "Library",
    "date": "2026-09-21T10:00:00Z",
    "images": []
  }
}
```

The response contains `ruleScore` (0–100), `ruleScoreNormalized`, `textScore`, `imageScore` (`null` when unavailable), `imageAvailable`, and `finalScore` (0–1).

## Scoring

Rule points: category 30, colour 25, brand 20, location 15, and date within three days 10.

With usable images: `0.5 * rules + 0.3 * text + 0.2 * image`.

Without usable images: `0.65 * rules + 0.35 * text`.

## Tests

After installing requirements, run:

```powershell
python -m unittest discover -s tests -v
```
