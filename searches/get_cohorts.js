'use strict';

const { apiRequest, toInt } = require('../lib/http');
const { ORDER_SOURCES } = require('../lib/constants');
const { offerId, linkId } = require('../lib/fields');
const samples = require('../lib/samples');

/**
 * Weekly cohorts (week the order was created, Monday start, Asia/Tashkent) and how many were
 * delivered within 3/7/14/30 days. A null window = not enough time has passed yet (not 0%).
 */
const perform = async (z, bundle) => {
  const i = bundle.inputData;
  const { body } = await apiRequest(z, 'GET', '/stats/cohorts', {
    params: { weeks: toInt(i.weeks), offer_id: toInt(i.offer_id), link_id: toInt(i.link_id), source: i.source },
  });
  const meta = body.meta || {};
  const f = meta.filters || {};
  return [
    {
      id: ['cohorts', meta.weeks, meta.date_from, f.offer_id || '', f.link_id || '', f.source || ''].join(':'),
      weeks: meta.weeks,
      date_from: meta.date_from,
      date_to: meta.date_to,
      timezone: meta.timezone,
      week_starts_on: meta.week_starts_on,
      windows_days: meta.windows_days,
      filters: f,
      ...(meta.totals || {}),
      average: meta.average || {},
      cohorts: body.data || [],
    },
  ];
};

module.exports = {
  key: 'get_cohorts',
  noun: 'Cohort Report',
  display: {
    label: 'Get Cohort Report',
    description: 'Gets weekly order cohorts and the share delivered within 3, 7, 14 and 30 days — shows how fast your traffic turns into payouts.',
  },
  operation: {
    inputFields: [
      { key: 'weeks', label: 'Weeks', type: 'integer', required: false, default: '12', helpText: 'Number of weeks back, 1–52.' },
      offerId({ helpText: 'Only this offer.' }),
      linkId({ helpText: 'Only this link.' }),
      { key: 'source', label: 'Order Source', required: false, choices: ORDER_SOURCES },
    ],
    perform,
    sample: samples.COHORTS,
    outputFields: [
      { key: 'weeks', label: 'Weeks', type: 'integer' },
      { key: 'date_from', label: 'Date From' },
      { key: 'date_to', label: 'Date To' },
      { key: 'orders', label: 'Orders', type: 'integer' },
      { key: 'delivered', label: 'Delivered', type: 'integer' },
      { key: 'delivered_rate_percent', label: 'Delivered Rate (%)', type: 'integer' },
      { key: 'in_progress', label: 'In Progress', type: 'integer' },
    ],
  },
};
