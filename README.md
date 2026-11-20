# Birinchishop for Zapier

A [Zapier Platform CLI](https://docs.zapier.com/platform/build-cli/overview) integration for the
**[Birinchi Shop](https://birinchishop.uz) Partner API v1** — a COD (cash on delivery) CPA affiliate network in
Uzbekistan. Partners promote ready products; the network runs the call center, warehouse and nationwide delivery and
pays a fixed amount for every **delivered** order.

Same capabilities as the [n8n node](https://github.com/Birinchishop/n8n-nodes-birinchishop): instant order triggers with
signed webhooks that register themselves, orders with idempotency, tracking links, offers and statistics.

API docs: https://birinchishop.uz/api/v1/docs · OpenAPI: https://birinchishop.uz/api/v1/openapi.json ·
Guide: https://birinchishop.uz/api/v1/guide.md

- [What's inside](#whats-inside)
- [Connecting an account](#connecting-an-account)
- [Create Order — read this first](#create-order--read-this-first)
- [Triggers and webhook security](#triggers-and-webhook-security)
- [Test mode](#test-mode)
- [Errors](#errors)
- [Development](#development)
- [Publishing (for the integration owner)](#publishing-for-the-integration-owner)

## What's inside

| Type | Key | Label | API |
|---|---|---|---|
| Trigger (instant) | `new_order` | New Order | REST hook `order.created` (`POST/DELETE /webhooks`) |
| Trigger (instant) | `order_status_changed` | Order Status Changed | REST hook `order.status_changed`; filters by status / conversion status |
| Trigger (polling) | `order_updated_polling` | New or Updated Order (Polling) | `GET /orders?updated_since=` — for keys without `webhooks:manage` |
| Action | `create_order` | Create Order | `POST /orders` + `Idempotency-Key` |
| Action | `create_link` | Create Link | `POST /links` |
| Action | `set_test_order_status` | Set Test Order Status | `POST /sandbox/orders/{id}/status` (test keys only) |
| Search | `find_offer` | Find Offer | `GET /offers/{id}` or `GET /offers` (search, payout, sale rate, stock, sort, language) |
| Search | `find_link` | Find Link | `GET /links/{id}` or `GET /links?offer_id=` |
| Search | `find_order` | Find Order | `GET /orders/{id}` or by external ID / click ID |
| Search | `get_stats` | Get Statistics | `GET /stats` (totals + rows per day / offer / link) |
| Search | `get_cohorts` | Get Cohort Report | `GET /stats/cohorts` |
| Search | `get_attribution` | Get Attribution Report | `GET /stats/attribution` (report only, payouts unchanged) |
| Search or create | `find_link` | Find or Create Link | Find Link → Create Link |
| Hidden triggers | `offer_list`, `link_list` | dropdowns | `GET /offers`, `GET /links` (paginated) |

All trigger outputs have the same shape: `id`, `type`, `created_at`, `order_id`, `status`, `previous_status`,
`conversion_status`, `test` and the full `order` object (offer, link, customer, payout, tracking: click ID, sub1–sub5,
external ID). **The customer phone is always masked by the API** (`+998 ** *** 45 67`); a full number is never available.

Money is in whole UZS. Date filters are calendar days in Asia/Tashkent (`YYYY-MM-DD`); timestamps are ISO 8601 UTC.

## Connecting an account

1. Register as a partner at https://birinchishop.uz/register and open **Dashboard → API**
   (https://birinchishop.uz/dashboard/api).
2. Create an API key with only the scopes your Zaps need:

   | Scope | Needed for |
   |---|---|
   | `account:read` | connecting (the connection test calls `GET /me`) |
   | `webhooks:manage` | the instant triggers (they create and delete their webhook) |
   | `orders:read` | Find Order, the polling trigger, trigger samples |
   | `orders:write` | Create Order, Set Test Order Status |
   | `links:read` / `links:write` | Link dropdown, Find Link / Create Link |
   | `offers:read` | Offer dropdown, Find Offer |
   | `stats:read` | Get Statistics, Get Cohort Report, Get Attribution Report |

3. In Zapier, connect Birinchishop and paste the key. It is sent as `Authorization: Bearer <key>` to
   `https://birinchishop.uz/api/v1` only. The connection is labelled with the account name, plus **(test)** for test keys.

Do not put an IP allowlist on a key used by Zapier — Zapier calls from changing addresses.

## Create Order — read this first

> **With a live key (`bsk_live_...`), Create Order submits a REAL order.** A call center phones the customer and a
> courier delivers the product; the customer pays on delivery. Send only real customers who asked to order, with their
> correct phone number. **Never send test, sample or fake orders — the account gets blocked.** Build and test Zaps
> with a test key (`bsk_test_...`).
> Live orders via the API need the `orders:write` scope and an account with at least 3 delivered orders (or approval
> from support).

- **Link** — one of your tracking links (dropdown); it decides the offer and your payout.
- **Customer Phone** — Uzbekistan mobile `+998XXXXXXXXX` (common formats are accepted).
- Optional: customer name, region, variant ID / variant type ID (see Find Offer → `variants`), external ID, click ID,
  sub1–sub5. External ID and click ID come back in webhooks and can be searched.
- **Idempotency Key** — sent as the `Idempotency-Key` header; the same key returns the existing order
  (`idempotent_replayed: true`) instead of creating a second one. Map a stable value from your source (lead ID, row ID).
  If empty, the key is derived from the Zap ID, link, phone digits, variant, external ID, click ID and the current day in
  Asia/Tashkent, so Zapier retries, task replays and double runs of the same data on the same day never create a
  duplicate.
- Refusals that must not be retried (`duplicate_order`, `customer_order_limit`, `order_in_process`, `own_phone`,
  `out_of_stock`, `offer_inactive`) **halt** the Zap run instead of erroring, so the Zap is not switched off.

The API itself also refuses the same phone + offer within 24 hours and more than 3 different offers per phone per
24 hours.

## Triggers and webhook security

**Instant triggers** (New Order, Order Status Changed) use REST hooks:

- Turning a Zap on calls `POST /webhooks` with Zapier's target URL (`kind: json`, one event type). The API returns a
  signing secret (`whsec_...`), which Zapier keeps in the subscription data. Turning the Zap off calls
  `DELETE /webhooks/{id}` (an already deleted webhook is fine).
- Every incoming request is verified before the Zap runs: `X-Birinchishop-Signature: t=<unix>,v1=<hex>` must equal
  HMAC-SHA256(secret, `"<t>.<raw body>"`), compared in constant time, on the raw body (`bundle.rawRequest.content`; Zapier
  prefixes incoming headers with `Http-`). Unsigned, forged or older than 1 hour requests are **halted**, not run.
  The tolerance is 1 hour (the API re-signs each retry; Zapier may process hooks with a delay).
- The account limit is **10 webhooks**; each Zap with an instant trigger uses one. Delete unused ones in
  Dashboard → API → Webhooks.
- Samples in the Zap editor (`performList`) are your newest real orders shaped like the webhook event.
- Options: order statuses, conversion statuses (Lead / Approved / Sale / Rejected) and **Include Test Events**.

**New or Updated Order (Polling)** is the fallback for keys without `webhooks:manage` or accounts that already use 10
webhooks. On each poll it reads orders updated in the last 7 days (newest pages first) and emits one item per order and
status (`id = order_<id>_<status>`), so Zapier's deduplication fires once for a new order and once for each new status.
Limits: up to ~300 most recently updated orders per poll; if an order returns to a status it already had, it does not fire
again. The `/events` feed is not used for polling because it is cursor-based and oldest-first, which does not fit
Zapier's stateless, newest-first polling.

## Test mode

With a test key (`bsk_test_...`):

- Reads return your real data.
- **Create Order** and **Create Link** run every live check (phone, link, stock, duplicates, limits, Idempotency-Key)
  but create nothing: no order, no call-center call, no payout. The output has `test: true` and a fake ID
  ≥ 2000000000; Create Order also returns `live_orders_allowed`.
- Your webhooks receive signed test events (`test: true`): `order.created` right after a test order, and
  `order.status_changed` when you run **Set Test Order Status**.
- Test orders are kept for 24 hours; Find Order finds them, lists and stats do not.

A safe end-to-end check: turn on a Zap with **Order Status Changed** (test key), then in another Zap run **Create Order**
(test key) followed by **Set Test Order Status → Delivered**.

## Errors

API errors are shown as `<message> [<code>] <hint> Details: … Request ID: req_…`. Send the request ID to support if you
need help. `429 rate_limited` becomes a Zapier throttle (retried after `Retry-After`); a revoked or expired key marks the
connection as expired.

## Development

Requires Node.js 22 (Zapier runs integrations on Node 22). This repository also installs a local Node 22 binary as a
dev dependency (`node` package), so `npm test` and `npm run validate` use Node 22 even if the system Node is older.

```bash
npm install
npm test            # unit tests (jest + nock); no request reaches the real API, no order is created
npm run validate    # zapier-platform validate --without-style (local schema check, no Zapier account needed)
```

Tests cover: auth header and connection label, error mapping, signature verification (valid / forged / wrong secret /
replay / missing), subscribe and unsubscribe, trigger filters, polling pagination and dedupe IDs, Create Order
idempotency and halts, searches, and the Zapier schema.

Layout:

```
index.js              app definition (auth, middleware, triggers, creates, searches, searchOrCreates)
authentication.js     custom auth (API key), test GET /me, connection label
lib/http.js           Bearer middleware, error mapping, request helpers, Idempotency-Key
lib/signature.js      X-Birinchishop-Signature verification (same algorithm as the SDKs)
lib/events.js         REST hook subscribe/unsubscribe/perform, event shape, polling helpers
lib/fields.js, lib/outputFields.js, lib/samples.js, lib/constants.js
triggers/ creates/ searches/
test/                 jest + nock
assets/icon-256.png   logo for the Zapier listing (256×256)
```

## Publishing (for the integration owner)

Nothing has been pushed to Zapier yet. Steps:

1. **Account.** Create (or use) a Zapier account whose email is on the `birinchishop.uz` domain — Zapier requires at
   least one admin with an email on the app's domain for a public integration.
2. **CLI login** (Node 22, from this folder):

   ```bash
   npm install
   npx zapier-platform login            # creates a deploy key in ~/.zapierrc
   npx zapier-platform register "Birinchishop"   # creates the integration, writes .zapierapprc
   npx zapier-platform validate          # now also runs Zapier's online integration checks
   npx zapier-platform push              # uploads version 0.1.0 (private)
   ```

   Since CLI v19 the command is `zapier-platform` (the old `zapier` binary was removed).
3. **Private testing.** In the Zapier UI connect a **test key** account and build one Zap per trigger, action and search;
   each Zap must be **on** and have at least one successful run (a review requirement). Use **test keys** for Create
   Order / Create Link so no real order is created. Invite teammates with `npx zapier-platform users:add <email> 0.1.0`
   or share the invite link from the developer platform.
4. **Listing.** In https://developer.zapier.com fill in: name "Birinchishop", description in the form
   "Birinchishop is a…", homepage https://birinchishop.uz, category, logo `assets/icon-256.png`, links to the API docs.
5. **Submit for review** (Integration Home → Publish). Requirements to prepare:
   - a non-expiring test account for **integration-testing@zapier.com** with a test key and every feature enabled
     (Zapier staff must be able to log in);
   - public API documentation (https://birinchishop.uz/api/v1/docs);
   - all user-facing text in English (done);
   - no sandbox-only endpoints in public integrations: **Set Test Order Status** calls `/sandbox/...` and may have to be
     removed from the published version (it is useful while the integration is private);
   - review answer within about a week; then **Beta** for 90 days, then **Public**.
6. Later versions: bump `version` in `package.json`, `push`, then `npx zapier-platform promote <version>` and
   `migrate` users.

## License

MIT
