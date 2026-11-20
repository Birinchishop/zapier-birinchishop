'use strict';

const { apiData, apiGetOrNull, toInt } = require('../lib/http');
const { orderOutputFields } = require('../lib/outputFields');
const samples = require('../lib/samples');

const perform = async (z, bundle) => {
  const i = bundle.inputData;
  if (i.order_id) {
    const order = await apiGetOrNull(z, `/orders/${encodeURIComponent(toInt(i.order_id))}`);
    return order ? [order] : [];
  }
  if (!i.external_id && !i.click_id) {
    throw new z.errors.Error('Fill in "Order ID", "External ID" or "Click ID".', 'invalid_request', 400);
  }
  return (await apiData(z, 'GET', '/orders', { params: { external_id: i.external_id, click_id: i.click_id, limit: 10, page: 1 } })) || [];
};

module.exports = {
  key: 'find_order',
  noun: 'Order',
  display: {
    label: 'Find Order',
    description: 'Finds an order by ID, or by the External ID / Click ID you sent. The customer phone is always masked.',
  },
  operation: {
    inputFields: [
      { key: 'order_id', label: 'Order ID', type: 'integer', required: false, helpText: 'Test orders (test keys) are found for 24 hours.' },
      { key: 'external_id', label: 'External ID', required: false },
      { key: 'click_id', label: 'Click ID', required: false },
    ],
    perform,
    sample: samples.ORDER,
    outputFields: orderOutputFields,
  },
};
