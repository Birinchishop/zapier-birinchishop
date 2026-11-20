'use strict';

/** Output field definitions shared by the order triggers. */
const eventOutputFields = [
  { key: 'id', label: 'Event ID' },
  { key: 'type', label: 'Event Type' },
  { key: 'created_at', label: 'Event Time (UTC)', type: 'datetime' },
  { key: 'order_id', label: 'Order ID', type: 'integer' },
  { key: 'status', label: 'Status' },
  { key: 'previous_status', label: 'Previous Status' },
  { key: 'conversion_status', label: 'Conversion Status' },
  { key: 'test', label: 'Is Test Event', type: 'boolean' },
  { key: 'order__offer__id', label: 'Offer ID', type: 'integer' },
  { key: 'order__offer__name', label: 'Offer Name' },
  { key: 'order__link__id', label: 'Link ID', type: 'integer' },
  { key: 'order__link__name', label: 'Link Name' },
  { key: 'order__customer__name', label: 'Customer Name' },
  { key: 'order__customer__phone_masked', label: 'Customer Phone (Masked)' },
  { key: 'order__customer__region', label: 'Customer Region' },
  { key: 'order__customer_price', label: 'Customer Price (UZS)', type: 'integer' },
  { key: 'order__payout', label: 'Payout (UZS)', type: 'integer' },
  { key: 'order__payout_status', label: 'Payout Status' },
  { key: 'order__source', label: 'Order Source' },
  { key: 'order__tracking__click_id', label: 'Click ID' },
  { key: 'order__tracking__external_id', label: 'External ID' },
  { key: 'order__tracking__sub1', label: 'Sub1' },
];

const orderOutputFields = [
  { key: 'id', label: 'Order ID', type: 'integer' },
  { key: 'status', label: 'Status' },
  { key: 'conversion_status', label: 'Conversion Status' },
  { key: 'created_at', label: 'Created At (UTC)', type: 'datetime' },
  { key: 'updated_at', label: 'Updated At (UTC)', type: 'datetime' },
  { key: 'offer__id', label: 'Offer ID', type: 'integer' },
  { key: 'offer__name', label: 'Offer Name' },
  { key: 'link__id', label: 'Link ID', type: 'integer' },
  { key: 'customer__name', label: 'Customer Name' },
  { key: 'customer__phone_masked', label: 'Customer Phone (Masked)' },
  { key: 'customer__region', label: 'Customer Region' },
  { key: 'customer_price', label: 'Customer Price (UZS)', type: 'integer' },
  { key: 'payout', label: 'Payout (UZS)', type: 'integer' },
  { key: 'payout_status', label: 'Payout Status' },
  { key: 'delivery_date', label: 'Delivery Date' },
  { key: 'source', label: 'Source' },
  { key: 'tracking__click_id', label: 'Click ID' },
  { key: 'tracking__external_id', label: 'External ID' },
  { key: 'test', label: 'Is Test Order', type: 'boolean' },
];

module.exports = { eventOutputFields, orderOutputFields };
