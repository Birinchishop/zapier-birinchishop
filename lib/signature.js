'use strict';

const crypto = require('crypto');

const SIGNATURE_HEADER = 'X-Birinchishop-Signature';

/** Parses `t=<unix>,v1=<hex>[,v1=<hex>...]`. */
function parseSignatureHeader(header) {
  const out = { t: undefined, v1: [] };
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string') return out;
  for (const part of value.split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (key === 't') out.t = val;
    else if (key === 'v1') out.v1.push(val);
  }
  return out;
}

function computeSignature(secret, timestamp, rawBody) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
}

/**
 * Verifies `X-Birinchishop-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`
 * on the RAW request body, in constant time, rejecting timestamps outside the tolerance.
 * Same algorithm as the official SDKs and the n8n node.
 *
 * @returns {{valid: true, timestamp: number} | {valid: false, reason: string}}
 */
function verifyWebhookSignature(rawBody, header, secret, { toleranceSeconds = 300, now } = {}) {
  if (!secret) return { valid: false, reason: 'missing_secret' };
  if (rawBody === undefined || rawBody === null) return { valid: false, reason: 'missing_body' };
  const { t, v1 } = parseSignatureHeader(header);
  if (!t || !/^\d+$/.test(t) || v1.length === 0) return { valid: false, reason: 'malformed_header' };
  const nowSeconds = now !== undefined ? now : Date.now() / 1000;
  if (Math.abs(nowSeconds - Number(t)) > toleranceSeconds) {
    return { valid: false, reason: 'timestamp_out_of_range' };
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const expected = computeSignature(secret, t, body);
  const ok = v1.some((sig) => /^[0-9a-f]{64}$/i.test(sig) && crypto.timingSafeEqual(expected, Buffer.from(sig, 'hex')));
  return ok ? { valid: true, timestamp: Number(t) } : { valid: false, reason: 'mismatch' };
}

/**
 * Zapier passes incoming webhook headers in `bundle.rawRequest.headers` with an `Http-` prefix
 * (`X-Birinchishop-Signature` → `Http-X-Birinchishop-Signature`). Looks a header up
 * case-insensitively, with or without that prefix.
 */
function findHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return undefined;
  const wanted = new Set([name.toLowerCase(), `http-${name.toLowerCase()}`]);
  for (const [key, value] of Object.entries(headers)) {
    if (wanted.has(String(key).toLowerCase())) return value;
  }
  return undefined;
}

module.exports = {
  SIGNATURE_HEADER,
  parseSignatureHeader,
  computeSignature,
  verifyWebhookSignature,
  findHeader,
};
