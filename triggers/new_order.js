'use strict';

const { subscribe, unsubscribe, hookPerform, newestOrders, orderToEvent, matchesFilters } = require('../lib/events');
const { includeTestEvents } = require('../lib/fields');
const { eventOutputFields } = require('../lib/outputFields');
const samples = require('../lib/samples');

const EVENTS = ['order.created'];

/** Samples for the Zap editor: the newest real orders, shaped like the webhook event. */
const performList = async (z, bundle) => {
  const orders = await newestOrders(z, 3);
  return orders
    .map((o) => ({ ...orderToEvent(o), type: 'order.created', id: `order_${o.id}_created`, created_at: o.created_at }))
    .filter((e) => matchesFilters(e, bundle.inputData));
};

module.exports = {
  key: 'new_order',
  noun: 'Order',
  display: {
    label: 'New Order',
    description: 'Triggers when a new order arrives on your account from any link, landing page, ad or the API (instant).',
  },
  operation: {
    type: 'hook',
    inputFields: [includeTestEvents],
    performSubscribe: subscribe(EVENTS),
    performUnsubscribe: unsubscribe,
    perform: hookPerform(EVENTS),
    performList,
    sample: samples.EVENT_CREATED,
    outputFields: eventOutputFields,
  },
};
