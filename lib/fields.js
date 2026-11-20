'use strict';

const { ORDER_STATUSES, CONVERSION_STATUSES } = require('./constants');

const statusFilters = [
  {
    key: 'statuses',
    label: 'Order Statuses',
    list: true,
    required: false,
    choices: ORDER_STATUSES,
    helpText: 'Run the Zap only when the order has one of these statuses. Leave empty for all.',
  },
  {
    key: 'conversion_statuses',
    label: 'Conversion Statuses',
    list: true,
    required: false,
    choices: CONVERSION_STATUSES,
    helpText: 'Run the Zap only for these status groups (e.g. **Sale** = delivered, payout earned). Leave empty for all.',
  },
];

const includeTestEvents = {
  key: 'include_test_events',
  label: 'Include Test Events',
  type: 'boolean',
  required: false,
  default: 'true',
  helpText:
    'Test events come from test keys (`bsk_test_...`) and the "Send test" button in the partner panel; they have `test: true`. Set to **False** to ignore them.',
};

const offerId = (overrides = {}) => ({
  key: 'offer_id',
  label: 'Offer',
  type: 'integer',
  dynamic: 'offer_list.id.label',
  required: false,
  helpText: 'An offer (product). The list shows in-stock offers; you can also map an offer ID.',
  ...overrides,
});

const linkId = (overrides = {}) => ({
  key: 'link_id',
  label: 'Link',
  type: 'integer',
  dynamic: 'link_list.id.label',
  required: false,
  helpText: 'One of your tracking links. You can also map a link ID.',
  ...overrides,
});

const dateField = (key, label, helpText) => ({
  key,
  label,
  type: 'string',
  required: false,
  placeholder: 'YYYY-MM-DD',
  helpText,
});

module.exports = { statusFilters, includeTestEvents, offerId, linkId, dateField };
