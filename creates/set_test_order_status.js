'use strict';

const { apiData, toInt } = require('../lib/http');
const { ORDER_STATUSES } = require('../lib/constants');
const samples = require('../lib/samples');

const { new: _new, ...CHOICES } = ORDER_STATUSES; // eslint-disable-line no-unused-vars

const perform = async (z, bundle) =>
  apiData(z, 'POST', `/sandbox/orders/${encodeURIComponent(toInt(bundle.inputData.order_id))}/status`, {
    body: { status: bundle.inputData.status },
  });

module.exports = {
  key: 'set_test_order_status',
  noun: 'Test Order',
  display: {
    label: 'Set Test Order Status',
    description:
      'Updates a test order (made with a bsk_test_ key) to another status and sends a signed test event to your webhooks. Works only with test keys; nothing real changes.',
  },
  operation: {
    inputFields: [
      { key: 'order_id', label: 'Test Order ID', type: 'integer', required: true, helpText: 'ID returned by Create Order with a test key (≥ 2000000000). Test orders are kept for 24 hours.' },
      { key: 'status', label: 'New Status', required: true, choices: CHOICES, default: 'delivered' },
    ],
    perform,
    sample: {
      order: { ...samples.ORDER, id: 2000000123, status: 'delivered', conversion_status: 'sale', payout_status: 'earned', test: true },
      previous_status: 'new',
      webhooks: { matched: 1, sent: 1, skipped_rate_limit: 0 },
    },
    outputFields: [
      { key: 'order__id', label: 'Order ID', type: 'integer' },
      { key: 'order__status', label: 'Status' },
      { key: 'previous_status', label: 'Previous Status' },
      { key: 'webhooks__sent', label: 'Webhooks Sent', type: 'integer' },
    ],
  },
};
