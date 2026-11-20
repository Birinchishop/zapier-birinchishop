'use strict';

const crypto = require('crypto');
const { BASE_URL, ERROR_HINTS, HALT_CODES } = require('./constants');

const VERSION = require('../package.json').version;

// ─── Middleware ───────────────────────────────────────────────────────

/** Adds the API key to every request that goes to the Partner API (and only there). */
function addAuthHeader(request, z, bundle) {
  request.headers = request.headers || {};
  const key = String((bundle.authData && bundle.authData.api_key) || '').trim();
  if (key && String(request.url || '').startsWith(BASE_URL)) {
    request.headers.Authorization = `Bearer ${key}`;
  }
  if (!request.headers.Accept) request.headers.Accept = 'application/json';
  if (!request.headers['User-Agent']) request.headers['User-Agent'] = `birinchishop-zapier/${VERSION}`;
  return request;
}

function parseJson(response) {
  if (response.data && typeof response.data === 'object') return response.data;
  try {
    const parsed = JSON.parse(response.content || '');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function headerOf(response, name) {
  const h = response.headers;
  if (!h) return undefined;
  if (typeof h.get === 'function') return h.get(name) || undefined;
  return h[name] || h[name.toLowerCase()];
}

/**
 * Builds the user-facing message from the API error envelope
 * `{ error: { code, message, details? }, request_id }`.
 */
function describeApiError(status, body, response) {
  const err = body && typeof body.error === 'object' && body.error ? body.error : {};
  const code = typeof err.code === 'string' ? err.code : `http_${status}`;
  const message = typeof err.message === 'string' && err.message ? err.message : `The Birinchishop API answered with HTTP ${status}`;
  const requestId = (body && typeof body.request_id === 'string' && body.request_id) || headerOf(response, 'x-request-id');
  const details = Array.isArray(err.details) ? err.details : [];
  const parts = [`${message} [${code}]`];
  if (ERROR_HINTS[code]) parts.push(ERROR_HINTS[code]);
  if (details.length) {
    parts.push('Details: ' + details.map((d) => (d && d.field ? `${d.field}: ${d.message || ''}` : JSON.stringify(d))).join('; '));
  }
  if (requestId) parts.push(`Request ID: ${requestId} (send it to support if you need help).`);
  return { code, message, requestId, text: parts.join(' ') };
}

/** Converts non-2xx answers into Zapier errors with the API code, hint and request id. */
function handleErrors(response, z) {
  if (response.status < 400 || response.skipThrowForStatus) return response;
  const body = parseJson(response);
  const { code, text } = describeApiError(response.status, body, response);
  if (response.status === 429 && code !== 'daily_order_limit') {
    const retryAfter = Number(headerOf(response, 'retry-after')) || 60;
    throw new z.errors.ThrottledError(text, retryAfter);
  }
  if (code === 'key_revoked' || code === 'key_expired') throw new z.errors.ExpiredAuthError(text);
  if (HALT_CODES.has(code)) throw new z.errors.HaltedError(text);
  throw new z.errors.Error(text, code, response.status);
}

// ─── Requests ─────────────────────────────────────────────────────────

/** Drops empty values so that unset optional filters are not sent. */
function cleanQuery(params = {}) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',');
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Drops empty values from a JSON body. */
function cleanBody(body = {}) {
  const out = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out;
}

/** One request to the Partner API; returns the whole parsed envelope `{ data, meta?, request_id }`. */
async function apiRequest(z, method, path, { params, body, headers, skipThrowForStatus } = {}) {
  const response = await z.request({
    method,
    url: `${BASE_URL}${path}`,
    params: cleanQuery(params),
    ...(body !== undefined ? { body: cleanBody(body) } : {}),
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(headers || {}) },
    ...(skipThrowForStatus ? { skipThrowForStatus: true } : {}),
  });
  return { status: response.status, headers: response.headers, body: parseJson(response) };
}

/** Returns `data` of the envelope. */
async function apiData(z, method, path, options) {
  const { body } = await apiRequest(z, method, path, options);
  return body.data;
}

/** GET that returns `null` on 404 (for searches: "nothing found" is not an error). */
async function apiGetOrNull(z, path, params) {
  const response = await z.request({
    method: 'GET',
    url: `${BASE_URL}${path}`,
    params: cleanQuery(params),
    skipThrowForStatus: true,
  });
  if (response.status === 404) return null;
  if (response.status >= 400) {
    handleErrors({ status: response.status, headers: response.headers, content: response.content, data: response.data }, z);
  }
  return parseJson(response).data;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Date filters are calendar days in Asia/Tashkent: accept YYYY-MM-DD or take the date part. */
function toApiDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim();
  if (DATE_RE.test(text)) return text;
  const head = text.slice(0, 10);
  return DATE_RE.test(head) ? head : text; // let the API answer invalid_request
}

/** Integer input or undefined. Zapier sends numbers from dropdowns as strings. */
function toInt(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : value; // let the API validate odd input
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1'].includes(String(value).toLowerCase());
}

/** Today in Asia/Tashkent (UTC+5, no DST). */
function tashkentDate(now = Date.now()) {
  return new Date(now + 5 * 3600e3).toISOString().slice(0, 10);
}

/** Idempotency-Key header value: `^[A-Za-z0-9._:-]+$`, max 128 characters. */
function sanitizeIdempotencyKey(value) {
  return String(value).replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128);
}

/**
 * Default Idempotency-Key for Create Order when the user maps none: the same Zap sending the
 * same link + phone + variant (+ external ID / click ID) on the same Tashkent day reuses the key,
 * so Zapier retries, task replays and accidental double runs return the existing order instead
 * of a second one. (The API itself refuses the same phone + offer within 24 hours.)
 */
function defaultIdempotencyKey(bundle, now = Date.now()) {
  const i = bundle.inputData || {};
  const zapId = (bundle.meta && bundle.meta.zap && bundle.meta.zap.id) || 'zap';
  const phoneDigits = String(i.phone || '').replace(/\D/g, '');
  const parts = [zapId, i.link_id, phoneDigits, i.variant_id, i.variant_type_id, i.external_id, i.click_id, tashkentDate(now)];
  const hash = crypto.createHash('sha256').update(parts.map((p) => (p === undefined || p === null ? '' : String(p))).join('|')).digest('hex');
  return `zapier:${hash.slice(0, 48)}`;
}

/** Splits a comma separated input (or list) into trimmed values. */
function toList(value) {
  if (value === undefined || value === null || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map((v) => String(v).trim()).filter(Boolean);
}

module.exports = {
  VERSION,
  addAuthHeader,
  handleErrors,
  describeApiError,
  cleanQuery,
  cleanBody,
  apiRequest,
  apiData,
  apiGetOrNull,
  toApiDate,
  toInt,
  toBool,
  toList,
  tashkentDate,
  sanitizeIdempotencyKey,
  defaultIdempotencyKey,
};
