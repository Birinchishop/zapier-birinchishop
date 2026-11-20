'use strict';

const crypto = require('crypto');
const nock = require('nock');

const API_HOST = 'https://birinchishop.uz';
const API = '/api/v1';
const FAKE_KEY = 'bsk_test_FAKE_KEY_FOR_UNIT_TESTS_ONLY';

/** Mocked Partner API. Real network access is disabled in every test file. */
const api = () => nock(API_HOST, { reqheaders: { authorization: `Bearer ${FAKE_KEY}` } });

const bundle = (inputData = {}, extra = {}) => ({
  authData: { api_key: FAKE_KEY },
  inputData,
  meta: { zap: { id: 4242, name: 'Unit test zap' } },
  ...extra,
});

const sign = (secret, t, body) => crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');

/** A webhook request as Zapier hands it to perform (headers carry the `Http-` prefix). */
function signedRequest(payload, secret, { t = Math.floor(Date.now() / 1000), tamper = false } = {}) {
  const content = JSON.stringify(payload);
  const signature = sign(secret, t, content);
  return {
    method: 'POST',
    querystring: '',
    headers: {
      'Content-Type': 'application/json',
      'Http-X-Birinchishop-Event': payload.type,
      'Http-X-Birinchishop-Signature': `t=${t},v1=${signature}`,
    },
    content: tamper ? content.replace('"delivered"', '"returned"') : content,
  };
}

const order = (overrides = {}) => ({
  id: 501,
  status: 'new',
  conversion_status: 'lead',
  created_at: '2026-11-20T09:00:00.000Z',
  updated_at: '2026-11-20T09:00:00.000Z',
  offer: { id: 7, name: 'Offer' },
  link: { id: 9, name: 'Link' },
  customer: { name: 'Mijoz 4567', phone_masked: '+998 ** *** 45 67', region: null },
  payout: 50000,
  ...overrides,
});

const webhookPayload = (overrides = {}) => ({
  id: 'evt_1001',
  type: 'order.status_changed',
  api_version: '2026-10-23',
  created_at: '2026-11-20T10:00:00.000Z',
  data: {
    id: 1001,
    type: 'order.status_changed',
    order_id: 501,
    status: 'delivered',
    previous_status: 'shipping',
    conversion_status: 'sale',
    order: order({ status: 'delivered', conversion_status: 'sale' }),
  },
  ...overrides,
});

module.exports = { nock, api, API, FAKE_KEY, bundle, sign, signedRequest, order, webhookPayload };
