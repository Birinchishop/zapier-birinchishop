'use strict';

const { recentlyUpdatedOrders, orderToEvent, matchesFilters, POLL_WINDOW_DAYS } = require('../lib/events');
const { statusFilters } = require('../lib/fields');
const { eventOutputFields } = require('../lib/outputFields');
const samples = require('../lib/samples');

/**
 * Polling fallback for keys without the `webhooks:manage` scope (or accounts that already use
 * all 10 webhooks). Each item id is `order_<id>_<status>`, so Zapier's deduplication fires once
 * per order and status: a new order (status "new") and each later status it reaches.
 */
const perform = async (z, bundle) => {
  const orders = await recentlyUpdatedOrders(z, { days: POLL_WINDOW_DAYS, pages: 2 });
  return orders.map(orderToEvent).filter((e) => matchesFilters(e, bundle.inputData));
};

module.exports = {
  key: 'order_updated_polling',
  noun: 'Order',
  display: {
    label: 'New or Updated Order (Polling)',
    // Hidden in the public listing: the two instant triggers cover the same events, and a test key
    // cannot produce a live run for it (test orders are not listed by GET /orders). Still works by key.
    hidden: true,
    description:
      'Triggers when an order is created or reaches a new status, checked on your Zapier polling interval. Use it only if your API key cannot manage webhooks; otherwise prefer the instant triggers.',
  },
  operation: {
    type: 'polling',
    inputFields: statusFilters,
    perform,
    sample: { ...samples.EVENT_STATUS_CHANGED, id: 'order_123456_delivered', event_id: null, api_version: null, previous_status: null },
    outputFields: eventOutputFields,
  },
};
