'use strict';

const { apiRequest, toApiDate, toInt } = require('../lib/http');
const { offerId, linkId, dateField } = require('../lib/fields');
const samples = require('../lib/samples');

/** One result: the period totals as top-level fields plus `rows` (line items) per day/offer/link. */
const perform = async (z, bundle) => {
  const i = bundle.inputData;
  const { body } = await apiRequest(z, 'GET', '/stats', {
    params: {
      group_by: i.group_by || 'day',
      date_from: toApiDate(i.date_from),
      date_to: toApiDate(i.date_to),
      offer_id: toInt(i.offer_id),
      link_id: toInt(i.link_id),
    },
  });
  const meta = body.meta || {};
  return [
    {
      id: `${meta.group_by}:${meta.date_from}:${meta.date_to}`,
      group_by: meta.group_by,
      date_from: meta.date_from,
      date_to: meta.date_to,
      timezone: meta.timezone,
      currency: meta.currency,
      ...(meta.totals || {}),
      clicks_since: meta.clicks_since || null,
      rows: body.data || [],
    },
  ];
};

module.exports = {
  key: 'get_stats',
  noun: 'Statistics',
  display: {
    label: 'Get Statistics',
    description: 'Gets orders, approvals, deliveries, earnings and clicks for a period (default: last 30 days), with rows per day, offer or link.',
  },
  operation: {
    inputFields: [
      {
        key: 'group_by',
        label: 'Group Rows By',
        required: true,
        choices: { day: 'Day', offer: 'Offer', link: 'Link' },
        default: 'day',
      },
      dateField('date_from', 'Date From', 'First day, Asia/Tashkent (YYYY-MM-DD). Default: 29 days before "Date To". Max range 366 days.'),
      dateField('date_to', 'Date To', 'Last day, Asia/Tashkent (YYYY-MM-DD). Default: today.'),
      offerId({ helpText: 'Only this offer.' }),
      linkId({ helpText: 'Only this link.' }),
    ],
    perform,
    sample: samples.STATS,
    outputFields: [
      { key: 'date_from', label: 'Date From' },
      { key: 'date_to', label: 'Date To' },
      { key: 'orders', label: 'Orders', type: 'integer' },
      { key: 'approved', label: 'Approved', type: 'integer' },
      { key: 'delivered', label: 'Delivered', type: 'integer' },
      { key: 'rejected', label: 'Rejected', type: 'integer' },
      { key: 'pending', label: 'Pending', type: 'integer' },
      { key: 'earned', label: 'Earned (UZS)', type: 'integer' },
      { key: 'potential_earnings', label: 'Potential Earnings (UZS)', type: 'integer' },
      { key: 'approval_rate_percent', label: 'Approval Rate (%)', type: 'integer' },
      { key: 'delivery_rate_percent', label: 'Delivery Rate (%)', type: 'integer' },
      { key: 'clicks', label: 'Clicks (Bots Excluded)', type: 'integer' },
      { key: 'unique_clicks', label: 'Unique Clicks', type: 'integer' },
    ],
  },
};
