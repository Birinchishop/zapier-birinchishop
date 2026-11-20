'use strict';

const { apiData, apiRequest, toList, toBool } = require('./http');
const { verifyWebhookSignature, findHeader, SIGNATURE_HEADER } = require('./signature');
const { SIGNATURE_TOLERANCE_SECONDS } = require('./constants');

/**
 * Flattens a signed webhook payload
 * `{ id: "evt_1", type, api_version, created_at, data: { order_id, status, previous_status, conversion_status, order } }`
 * into the trigger output. Polling triggers produce the same shape (see orderToEvent).
 */
function shapeEvent(payload) {
  const data = payload && typeof payload.data === 'object' && payload.data ? payload.data : {};
  const order = data.order && typeof data.order === 'object' ? data.order : null;
  const numeric = Number(String(payload.id || '').replace(/^evt_/, ''));
  return {
    id: String(payload.id || `evt_${data.id || ''}`),
    event_id: Number.isInteger(numeric) && numeric > 0 ? numeric : null,
    type: payload.type || data.type || null,
    api_version: payload.api_version || null,
    created_at: payload.created_at || data.created_at || null,
    order_id: data.order_id !== undefined ? data.order_id : order ? order.id : null,
    status: data.status || (order ? order.status : null),
    previous_status: data.previous_status || null,
    conversion_status: data.conversion_status || (order ? order.conversion_status : null),
    test: payload.test === true || (order !== null && order.test === true),
    order,
  };
}

/** Event-shaped item built from an order (polling trigger and samples). */
function orderToEvent(order) {
  const created = order.status === 'new';
  return {
    id: `order_${order.id}_${order.status}`,
    event_id: null,
    type: created ? 'order.created' : 'order.status_changed',
    api_version: null,
    created_at: created ? order.created_at : order.updated_at,
    order_id: order.id,
    status: order.status,
    previous_status: null,
    conversion_status: order.conversion_status,
    test: order.test === true,
    order,
  };
}

/** Status / conversion / test filters of the triggers. */
function matchesFilters(event, inputData = {}) {
  if (!toBool(inputData.include_test_events, true) && event.test) return false;
  const statuses = toList(inputData.statuses);
  if (statuses.length && !statuses.includes(String(event.status))) return false;
  const conversions = toList(inputData.conversion_statuses);
  if (conversions.length && !conversions.includes(String(event.conversion_status))) return false;
  return true;
}

// ─── REST hook plumbing ───────────────────────────────────────────────

/** performSubscribe: registers a signed JSON webhook; `{ id, secret }` becomes bundle.subscribeData. */
function subscribe(eventTypes) {
  return async (z, bundle) => {
    const zapName = bundle.meta && bundle.meta.zap && bundle.meta.zap.name;
    const created = await apiData(z, 'POST', '/webhooks', {
      body: {
        url: bundle.targetUrl,
        kind: 'json',
        events: eventTypes,
        description: `Zapier${zapName ? `: ${zapName}` : ''}`.slice(0, 120),
      },
    });
    if (!created || !created.id || !created.secret) {
      throw new z.errors.Error('The API did not return a webhook id and signing secret.', 'webhook_create_failed', 500);
    }
    return { id: created.id, secret: created.secret, events: created.events, created_at: created.created_at };
  };
}

/** performUnsubscribe: deletes the webhook; an already deleted one (404) is fine. */
async function unsubscribe(z, bundle) {
  const id = bundle.subscribeData && bundle.subscribeData.id;
  if (!id) return { deleted: false };
  const res = await apiRequest(z, 'DELETE', `/webhooks/${encodeURIComponent(id)}`, { skipThrowForStatus: true });
  if (res.status === 404) return { deleted: false, already_deleted: true };
  if (res.status >= 400) {
    const err = (res.body && res.body.error) || {};
    throw new z.errors.Error(`Could not delete webhook ${id}: ${err.message || `HTTP ${res.status}`}`, err.code || 'webhook_delete_failed', res.status);
  }
  return { deleted: true };
}

/**
 * perform of a REST hook: verifies the signature on the raw body with the secret saved at
 * subscribe time, then returns 0 or 1 items. Unsigned or forged requests are halted (the Zap
 * does not run and is not switched off).
 */
function hookPerform(eventTypes) {
  return async (z, bundle) => {
    const raw = bundle.rawRequest || {};
    const secret = bundle.subscribeData && bundle.subscribeData.secret;
    const header = findHeader(raw.headers, SIGNATURE_HEADER);
    const check = verifyWebhookSignature(raw.content, header, secret, { toleranceSeconds: SIGNATURE_TOLERANCE_SECONDS });
    if (!check.valid) {
      throw new z.errors.HaltedError(`Rejected a webhook request without a valid Birinchishop signature (${check.reason}).`);
    }
    let payload;
    try {
      payload = JSON.parse(raw.content);
    } catch {
      throw new z.errors.HaltedError('Rejected a webhook request with an invalid JSON body.');
    }
    const event = shapeEvent(payload);
    if (!eventTypes.includes(event.type)) return [];
    return matchesFilters(event, bundle.inputData) ? [event] : [];
  };
}

// ─── Reading recent orders ────────────────────────────────────────────

const POLL_WINDOW_DAYS = 7;
const PAGE_SIZE = 100;

/**
 * The most recently updated orders, newest first. GET /orders with `updated_since` is sorted
 * oldest first, so the first call reads `total_pages` and the last page(s) are fetched next.
 */
async function recentlyUpdatedOrders(z, { days = POLL_WINDOW_DAYS, pages = 2, now = Date.now() } = {}) {
  const updatedSince = new Date(now - days * 86400e3).toISOString();
  const first = await apiRequest(z, 'GET', '/orders', { params: { updated_since: updatedSince, limit: PAGE_SIZE, page: 1 } });
  const totalPages = Number((first.body.meta || {}).total_pages) || 1;
  const byPage = new Map([[1, first.body.data || []]]);
  for (let p = totalPages; p > Math.max(1, totalPages - pages); p--) {
    if (byPage.has(p)) continue;
    const res = await apiRequest(z, 'GET', '/orders', { params: { updated_since: updatedSince, limit: PAGE_SIZE, page: p } });
    byPage.set(p, res.body.data || []);
  }
  const seen = new Set();
  const all = [];
  for (const p of [...byPage.keys()].sort((a, b) => b - a)) {
    for (const o of [...byPage.get(p)].reverse()) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      all.push(o);
    }
  }
  return all.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)) || b.id - a.id);
}

/** Newest orders by creation time. */
async function newestOrders(z, limit = 3) {
  return (await apiData(z, 'GET', '/orders', { params: { limit, page: 1 } })) || [];
}

module.exports = {
  shapeEvent,
  orderToEvent,
  matchesFilters,
  subscribe,
  unsubscribe,
  hookPerform,
  recentlyUpdatedOrders,
  newestOrders,
  POLL_WINDOW_DAYS,
};
