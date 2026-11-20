'use strict';

const { subscribe, unsubscribe, hookPerform, recentlyUpdatedOrders, orderToEvent, matchesFilters } = require('../lib/events');
const { statusFilters, includeTestEvents } = require('../lib/fields');
const { eventOutputFields } = require('../lib/outputFields');
const samples = require('../lib/samples');

const EVENTS = ['order.status_changed'];

/** Samples for the Zap editor: recently updated real orders that match the filters. */
const performList = async (z, bundle) => {
  const orders = await recentlyUpdatedOrders(z, { days: 30, pages: 1 });
  return orders
    .filter((o) => o.status !== 'new')
    .map(orderToEvent)
    .filter((e) => matchesFilters(e, bundle.inputData))
    .slice(0, 3);
};

module.exports = {
  key: 'order_status_changed',
  noun: 'Order',
  display: {
    label: 'Order Status Changed',
    description:
      'Triggers when an order moves to another status, e.g. confirmed, shipping, delivered, returned or cancelled (instant).',
  },
  operation: {
    type: 'hook',
    inputFields: [...statusFilters, includeTestEvents],
    performSubscribe: subscribe(EVENTS),
    performUnsubscribe: unsubscribe,
    perform: hookPerform(EVENTS),
    performList,
    sample: samples.EVENT_STATUS_CHANGED,
    outputFields: eventOutputFields,
  },
};
