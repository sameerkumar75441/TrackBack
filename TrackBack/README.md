# TrackBack

TrackBack is a verified campus lost-property recovery platform. It supports report moderation, deterministic lost/found matching, private ownership claims, secure QR handover, custody records, notifications, feedback, and admin reporting.

## Problem and solution

Campus lost-property processes are often fragmented and unverifiable. TrackBack provides one role-protected workflow from report creation through verified handover, without exposing private ownership evidence publicly.

## Features

- Lost/found item reports with image upload, search, filtering, moderation, and archival
- JWT authentication with student, security, and admin roles
- Deterministic matching: rules, TF-IDF cosine similarity, and pHash image similarity
- Private claim evidence and staff ownership verification
- Storage assignment, fixed pickup slots, one-time QR handover, custody events, and PDF receipts
- In-app notifications, completed-handover ratings, admin analytics, and safe CSV export

## Architecture

```text
React/Vite frontend → Express API → MongoDB Atlas
                       └────────→ Flask matching service
```

## Stack

- Frontend: React, Vite, React Router, Recharts
- API: Node.js, Express, Mongoose, JWT, bcrypt, Multer
- Matching: Python, Flask, scikit-learn, Pillow, ImageHash
- Database: MongoDB Atlas

## Roles

- **Student:** reports, claims, pickup scheduling, QR display, receipt access, notifications, feedback.
- **Security:** claim verification, storage assignment, QR/ID handover verification.
- **Admin:** moderation, all authorized claims, analytics, safe CSV export.

## Local setup

Prerequisites: Node.js 20+, Python 3.12+, and a MongoDB Atlas database.

```powershell
# API
Copy-Item backend\.env.example backend\.env
cd backend; npm ci; npm start

# Matching service (separate terminal)
Copy-Item matching-service\.env.example matching-service\.env
cd matching-service; python -m pip install -r requirements.txt; python app.py

# Frontend (separate terminal)
Copy-Item frontend\.env.example frontend\.env
cd frontend; npm ci; npm run dev
```

Set `MONGODB_URI` and a long random `JWT_SECRET` only in your local/deployment environment; never commit them. The frontend defaults to `http://localhost:5000/api`; set `VITE_API_URL` for another API URL.

## Environment variables

| Service | Required variables |
| --- | --- |
| Backend | `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `MATCHING_SERVICE_URL`, `PORT` |
| Backend production | `NODE_ENV=production`, `CORS_ORIGIN` |
| Matching | `PORT` |
| Frontend | `VITE_API_URL` |

Use the committed `.env.example` files as safe templates. `CORS_ORIGIN` may contain comma-separated frontend origins.

## Testing

```powershell
cd backend; npm test
cd matching-service; python -m unittest discover -s tests -v
cd frontend; npm run lint; npm run build
```

The backend suite covers claims, handover/QR protections, matching API behavior, notifications, ratings, analytics, CSV privacy, and route authorization.

## API overview

See [docs/API.md](docs/API.md). Core groups: `/api/auth`, `/api/items`, `/api/claims`, `/api/handover`, `/api/matches`, `/api/notifications`, `/api/ratings`, and `/api/admin`.

## Security and privacy

- Password hashes, JWT secrets, raw handover tokens, and MongoDB credentials are never returned by APIs.
- Ownership proof and verification notes are private to authorized verification staff.
- Admin analytics/export routes are server-side admin protected.
- CSV exports exclude ownership proof, user credentials, QR tokens, and private verification data.
- Production startup requires a CORS allowlist through `CORS_ORIGIN`.

## Deployment

Deployment templates are included:

- `render.yaml` provisions the Express API and Flask matching service on Render.
- `vercel.json` enables Vite SPA routing on Vercel.

Before deployment, create/connect hosting accounts, set the backend production environment variables, deploy the matching service, copy its verified HTTPS URL to `MATCHING_SERVICE_URL`, deploy the API, then set Vercel `VITE_API_URL` to the verified API URL plus `/api`. Finally set backend `CORS_ORIGIN` to the Vercel URL and redeploy the API.

No production URLs are recorded because deployment has not been verified yet.

## Demo

Use [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) to record the final project demonstration.

## Known limitations

- Images and generated receipts use local service storage; a production deployment should use persistent object storage before long-term use.
- Deployment requires the project owner’s Render/Vercel account authorization and environment-variable entry.
