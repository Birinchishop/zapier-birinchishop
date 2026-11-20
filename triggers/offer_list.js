'use strict';

const { apiData } = require('../lib/http');
const samples = require('../lib/samples');

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);

/** Hidden trigger for the "Offer" dropdown: in-stock offers, recommended order, 100 per page. */
const perform = async (z, bundle) => {
  const page = Number((bundle.meta && bundle.meta.page) || 0) + 1;
  const offers = (await apiData(z, 'GET', '/offers', {
    params: { page, limit: 100, in_stock_only: 'true', sort: 'recommended' },
  })) || [];
  return offers.map((o) => ({
    ...o,
    label: `${o.name} — payout ${fmt(o.payout)} UZS${o.sale_rate_percent !== null && o.sale_rate_percent !== undefined ? `, sale rate ${o.sale_rate_percent}%` : ''} (#${o.id})`,
  }));
};

module.exports = {
  key: 'offer_list',
  noun: 'Offer',
  display: {
    label: 'List Offers',
    description: 'Triggers when the Offer dropdown is loaded.',
    hidden: true,
  },
  operation: {
    type: 'polling',
    canPaginate: true,
    perform,
    sample: { ...samples.OFFER, label: 'Smart watch X8 — payout 50,000 UZS, sale rate 38% (#512)' },
    outputFields: [
      { key: 'id', label: 'Offer ID', type: 'integer' },
      { key: 'label', label: 'Label' },
    ],
  },
};
