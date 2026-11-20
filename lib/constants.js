'use strict';

const BASE_URL = 'https://birinchishop.uz/api/v1';

/** Public order statuses (OpenAPI `Order.status`). */
const ORDER_STATUSES = {
  new: 'New (waiting for the call center)',
  processing: 'Processing (call center is working on it)',
  callback: 'Callback (customer asked to be called later)',
  confirmed: 'Confirmed (customer confirmed by phone)',
  packed: 'Packed (at the warehouse)',
  shipping: 'Shipping (on the way to the customer)',
  delivered: 'Delivered (paid, payout earned)',
  returned: 'Returned (refused at delivery)',
  cancelled: 'Cancelled (no payout)',
};

/** Status groups (OpenAPI `Order.conversion_status`). */
const CONVERSION_STATUSES = {
  lead: 'Lead (new, processing, callback)',
  approved: 'Approved (confirmed, packed, shipping)',
  sale: 'Sale (delivered, payout earned)',
  rejected: 'Rejected (returned or cancelled)',
};

const EVENT_TYPES = ['order.created', 'order.status_changed'];

const OFFER_SORTS = {
  recommended: 'Recommended',
  best_selling: 'Best selling (highest sale rate)',
  highest_payout: 'Highest payout',
  highest_lead_bonus: 'Highest lead bonus',
  highest_stock: 'Highest stock',
  newest: 'Newest',
};

const LANGUAGES = { uz: 'Uzbek (original)', ru: 'Russian', en: 'English' };

const ORDER_SOURCES = {
  link: 'Tracking link',
  landing: 'Landing page',
  meta_ads: 'Meta ads',
  panel: 'Partner panel',
  api: 'API',
};

/**
 * Business errors of POST /orders that must never be retried: the order is
 * intentionally refused, so the Zap run is "halted" instead of "errored".
 */
const HALT_CODES = new Set([
  'duplicate_order',
  'customer_order_limit',
  'order_in_process',
  'own_phone',
  'out_of_stock',
  'offer_inactive',
]);

/** Short, actionable hints keyed by API `error.code`. */
const ERROR_HINTS = {
  unauthorized: 'Check the API key of this Birinchishop connection.',
  key_revoked: 'This key was revoked. Create a new key in the partner panel (Dashboard → API) and reconnect.',
  key_expired: 'This key has expired. Create a new key in the partner panel (Dashboard → API) and reconnect.',
  insufficient_scope: 'Edit the key in the partner panel (Dashboard → API) and grant the scope named above.',
  not_available_in_test_mode: 'This action needs a live key (bsk_live_...).',
  test_mode_only: 'This action works only with a test key (bsk_test_...).',
  ip_not_allowed: 'Zapier calls the API from changing IP addresses: remove the IP allowlist from this key.',
  account_blocked: 'Contact Birinchishop support.',
  rate_limited: 'Too many requests. Zapier will retry later.',
  too_many_failed_attempts: 'Too many requests with a wrong key. Fix the key and wait 15 minutes.',
  duplicate_order: 'The same phone number already ordered this offer in the last 24 hours. Do not retry this order.',
  orders_write_not_allowed:
    'Sending orders via the API needs at least 3 delivered orders on the account, or approval from support.',
  customer_order_limit:
    'This phone number already ordered 3 different offers in the last 24 hours. Do not retry this order.',
  order_in_process: 'This customer already has an unfinished order for this offer. Do not retry this order.',
  own_phone: 'An order cannot be placed to your own phone number.',
  invalid_phone: 'Use an Uzbekistan mobile number, e.g. +998901234567.',
  variant_not_found: 'Check "Variant ID" with the Find Offer search (output: variants).',
  variant_type_required: 'This variant needs "Variant Type ID" (see variants → types in Find Offer).',
  link_not_found: 'Check "Link". It must be one of your own tracking links.',
  offer_not_found: 'The offer does not exist or is not active.',
  order_not_found: 'The order does not exist on this account. Test orders are kept for 24 hours.',
  webhook_not_found: 'The webhook does not exist on this account.',
  webhook_limit_reached:
    'The account already has 10 webhooks. Delete unused ones in the partner panel (Dashboard → API → Webhooks).',
  internal_error: 'Try again later. If it repeats, send the request ID to Birinchishop support.',
  daily_order_limit: 'Daily API order limit reached. Contact support to raise it.',
  out_of_stock: 'The offer is out of stock. Choose another offer or variant.',
  offer_inactive: 'The offer is no longer active. Choose another offer.',
  offer_temporarily_unavailable: 'The offer is temporarily unavailable. Try again later.',
  link_limit_reached: 'The account has the maximum number of links. Reuse an existing link (Find Link).',
  invalid_request: 'Check the fields listed in the details.',
};

/** Maximum age of a signed webhook request (seconds). See README "Webhook security". */
const SIGNATURE_TOLERANCE_SECONDS = 3600;

module.exports = {
  BASE_URL,
  ORDER_STATUSES,
  CONVERSION_STATUSES,
  EVENT_TYPES,
  OFFER_SORTS,
  LANGUAGES,
  ORDER_SOURCES,
  HALT_CODES,
  ERROR_HINTS,
  SIGNATURE_TOLERANCE_SECONDS,
};
