'use strict';

const { apiRequest, toApiDate } = require('../lib/http');
const { dateField } = require('../lib/fields');
const samples = require('../lib/samples');

/**
 * Multi-touch attribution report (report only — payouts do not change). Touches of other
 * partners appear only as `partner: "other"` without any identifying data.
 */
const perform = async (z, bundle) => {
  const i = bundle.inputData;
  const { body } = await apiRequest(z, 'GET', '/stats/attribution', {
    params: { date_from: toApiDate(i.date_from), date_to: toApiDate(i.date_to) },
  });
  const meta = body.meta || {};
  const data = body.data || {};
  return [
    {
      id: `attribution:${meta.date_from}:${meta.date_to}`,
      date_from: meta.date_from,
      date_to: meta.date_to,
      timezone: meta.timezone,
      ...data,
    },
  ];
};

module.exports = {
  key: 'get_attribution',
  noun: 'Attribution Report',
  display: {
    label: 'Get Attribution Report',
    description:
      'Gets the multi-touch attribution report: which of your links were first, last or assisting touches before an order (report only; payouts are not affected).',
  },
  operation: {
    inputFields: [
      dateField('date_from', 'Date From', 'First day, Asia/Tashkent (YYYY-MM-DD). Default: 29 days before "Date To". Max range 366 days.'),
      dateField('date_to', 'Date To', 'Last day, Asia/Tashkent (YYYY-MM-DD). Default: today.'),
    ],
    perform,
    sample: samples.ATTRIBUTION,
    outputFields: [
      { key: 'date_from', label: 'Date From' },
      { key: 'date_to', label: 'Date To' },
      { key: 'summary__orders', label: 'Orders', type: 'integer' },
      { key: 'summary__converted_by_you', label: 'Converted by You', type: 'integer' },
      { key: 'summary__multi_touch', label: 'Multi-Touch Orders', type: 'integer' },
      { key: 'summary__with_other_partners', label: 'With Other Partners', type: 'integer' },
      { key: 'summary__assisted_for_other_partners', label: 'Assisted for Other Partners', type: 'integer' },
    ],
  },
};
