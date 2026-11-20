# Changelog

## 0.0.0 — unreleased

First version (not pushed to Zapier yet).

- Authentication: API key (custom auth, `Authorization: Bearer`), test `GET /me`, connection label with "(test)" for `bsk_test_` keys.
- Triggers: New Order and Order Status Changed (instant REST hooks with HMAC signature check), New or Updated Order (Polling).
- Actions: Create Order (Idempotency-Key), Create Link, Set Test Order Status (test keys).
- Searches: Find Offer, Find Link, Find Order, Get Statistics, Get Cohort Report, Get Attribution Report; Find or Create Link.
