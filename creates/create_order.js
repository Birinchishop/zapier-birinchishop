'use strict';

const { apiRequest, toInt, sanitizeIdempotencyKey, defaultIdempotencyKey } = require('../lib/http');
const { linkId } = require('../lib/fields');
const { orderOutputFields } = require('../lib/outputFields');
const samples = require('../lib/samples');

const WARNING =
  '**With a live key this submits a REAL order.** A call center phones the customer and a courier delivers the product (cash on delivery). ' +
  'Send only real customers who asked to order, with their correct phone number. **Never send test, sample or fake orders — the account gets blocked.** ' +
  'Build and test the Zap with a test key (`bsk_test_...`): it runs every check but creates nothing.';

const perform = async (z, bundle) => {
  const i = bundle.inputData;
  const key = i.idempotency_key ? sanitizeIdempotencyKey(i.idempotency_key) : defaultIdempotencyKey(bundle);
  const res = await apiRequest(z, 'POST', '/orders', {
    headers: { 'Idempotency-Key': key },
    body: {
      link_id: toInt(i.link_id),
      phone: i.phone,
      name: i.name,
      region: i.region,
      variant_id: toInt(i.variant_id),
      variant_type_id: toInt(i.variant_type_id),
      external_id: i.external_id,
      click_id: i.click_id,
      sub1: i.sub1,
      sub2: i.sub2,
      sub3: i.sub3,
      sub4: i.sub4,
      sub5: i.sub5,
    },
  });
  const order = res.body.data || {};
  // 200 + Idempotent-Replayed: the same key was used before; this is the existing order.
  return { ...order, idempotency_key: key, idempotent_replayed: res.status === 200 };
};

module.exports = {
  key: 'create_order',
  noun: 'Order',
  display: {
    label: 'Create Order',
    description:
      'Creates a REAL cash-on-delivery order for a customer who asked to buy (a call center will phone them). Use a test key to try it safely.',
  },
  operation: {
    inputFields: [
      { key: 'notice', type: 'copy', helpText: WARNING },
      linkId({ required: true, helpText: 'Your tracking link for the offer. The link decides the offer and your payout.' }),
      {
        key: 'phone',
        label: 'Customer Phone',
        required: true,
        helpText: 'Uzbekistan mobile number of the customer, e.g. `+998901234567` (common formats are accepted).',
      },
      { key: 'name', label: 'Customer Name', required: false, helpText: 'Default: "Mijoz" plus the last 4 digits of the phone.' },
      { key: 'region', label: 'Region', required: false, helpText: 'Customer region (free text, max 64 characters).' },
      { key: 'variant_id', label: 'Variant ID', type: 'integer', required: false, helpText: 'For offers with variants (see Find Offer → variants).' },
      { key: 'variant_type_id', label: 'Variant Type ID', type: 'integer', required: false, helpText: 'Needed when the chosen variant has types (e.g. size).' },
      { key: 'external_id', label: 'External ID', required: false, helpText: 'Your own ID of the lead (letters, digits, `._:-`). Returned in webhooks and searchable.' },
      { key: 'click_id', label: 'Click ID', required: false, helpText: 'Tracker click ID; returned in webhooks and postbacks.' },
      { key: 'sub1', label: 'Sub1', required: false },
      { key: 'sub2', label: 'Sub2', required: false },
      { key: 'sub3', label: 'Sub3', required: false },
      { key: 'sub4', label: 'Sub4', required: false },
      { key: 'sub5', label: 'Sub5', required: false },
      {
        key: 'idempotency_key',
        label: 'Idempotency Key',
        required: false,
        helpText:
          'Map a stable unique value from your source (lead ID, row ID). Sending the same key again returns the existing order instead of creating a second one. ' +
          'If empty, a key is derived from this Zap, link, phone, variant, external ID and click ID for the current day (Asia/Tashkent).',
      },
    ],
    perform,
    sample: { ...samples.ORDER, idempotency_key: 'lead-42', idempotent_replayed: false },
    outputFields: [
      ...orderOutputFields,
      { key: 'idempotency_key', label: 'Idempotency Key' },
      { key: 'idempotent_replayed', label: 'Was Existing Order (Replayed)', type: 'boolean' },
      { key: 'live_orders_allowed', label: 'Live Orders Allowed (Test Keys)', type: 'boolean' },
    ],
  },
};
