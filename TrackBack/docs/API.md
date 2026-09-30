# TrackBack API

## Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Item reports

All item endpoints require `Authorization: Bearer <token>`.

- `POST /api/items` — create a pending lost/found report. Submit images as up to five `images` multipart files (JPEG, PNG, or WebP; 5 MB each).
- `GET /api/items` — list reports. Supports `type`, `category`, `status`, `location`, `colour`, `brand`, `startDate`, `endDate`, `search`, `page`, and `limit`.
- `GET /api/items/:id` — get a report permitted for the authenticated user.
- `PUT /api/items/:id` — update the submitter's pending report; uploaded images are appended.
- `PATCH /api/items/:id/approve` — admin only.
- `PATCH /api/items/:id/reject` — admin only; requires `rejectionReason`.
- `PATCH /api/items/:id/archive` — admin only.

## Matching

`POST /api/matches/compare` requires `Authorization: Bearer <token>` and a body containing MongoDB item IDs:

```json
{
  "lostItemId": "...",
  "foundItemId": "..."
}
```

The backend loads both reports, requires one lost and one found item, and delegates deterministic scoring to the internal Flask matching service. It does not modify either report.

## Claims

All claim endpoints require `Authorization: Bearer <token>`.

- `POST /api/claims` — student only. Creates a requested claim for an approved item using private `ownershipProof` data.
- `GET /api/claims` — students see only their own claim statuses; security sees requested claims; admins see all claims.
- `GET /api/claims/:id` — authorized claim access. Ownership proof is only included for security/admin verification users.
- `PATCH /api/claims/:id/approve` — security/admin only. Moves the item to `claim_approved`; it does not mark physical handover as `claimed`.
- `PATCH /api/claims/:id/reject` — security/admin only; requires `rejectionReason` and returns the item to `approved`.

## Secure handover

- `PATCH /api/items/:id/storage` — security/admin assigns a storage location.
- `PATCH /api/handover/claims/:claimId/pickup` — claimant schedules an approved claim using `morning`, `afternoon`, or `evening`.
- `POST /api/handover/claims/:claimId/qr` — claimant (or security/admin) obtains a short-lived QR data URL after storage and pickup are set.
- `POST /api/handover/verify` — security/admin only; accepts QR `token` and strict `collegeIdVerified: true`, then completes handover.
- `GET /api/handover/claims/:claimId/receipt` — claimant or security/admin accesses a completed handover receipt.
- `GET /api/handover/items/:itemId/custody` — authorized custody history.

## Notifications and feedback

- `GET /api/notifications` — current user notifications and unread count.
- `PATCH /api/notifications/:id/read` — mark own notification read.
- `PATCH /api/notifications/read-all` — mark all own notifications read.
- `GET /api/ratings` — current user's submitted feedback.
- `POST /api/ratings` — student-only feedback for their own completed claim; body: `claimId`, `rating` (1–5), optional `feedback`.

## Admin reporting

- `GET /api/admin/analytics` — admin-only MongoDB aggregation metrics.
- `GET /api/admin/export.csv` — admin-only CSV excluding ownership proof, secrets, and private verification data.
