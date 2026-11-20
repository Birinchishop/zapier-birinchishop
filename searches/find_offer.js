'use strict';

const { apiData, apiGetOrNull, toInt, toBool } = require('../lib/http');
const { OFFER_SORTS, LANGUAGES } = require('../lib/constants');
const { offerId } = require('../lib/fields');
const samples = require('../lib/samples');

const perform = async (z, bundle) => {
  const i = bundle.inputData;
  const lang = i.lang || undefined;
  if (i.offer_id) {
    const offer = await apiGetOrNull(z, `/offers/${encodeURIComponent(toInt(i.offer_id))}`, { lang });
    return offer ? [offer] : [];
  }
  const offers = await apiData(z, 'GET', '/offers', {
    params: {
      search: i.search,
      in_stock_only: String(toBool(i.in_stock_only, true)),
      min_payout: toInt(i.min_payout),
      min_sale_rate: toInt(i.min_sale_rate),
      sort: i.sort,
      lang,
      limit: 10,
      page: 1,
    },
  });
  return offers || [];
};

module.exports = {
  key: 'find_offer',
  noun: 'Offer',
  display: {
    label: 'Find Offer',
    description:
      'Finds an offer (product) by ID — with description, images and variants — or the best match by name and filters (payout, sale rate, stock).',
  },
  operation: {
    inputFields: [
      offerId({ helpText: 'Get this exact offer with its full details (description, images, variants). Leave empty to search instead.' }),
      { key: 'search', label: 'Name Contains', required: false, helpText: 'Search text (Uzbek, Russian or English; typos are tolerated).' },
      { key: 'in_stock_only', label: 'In Stock Only', type: 'boolean', required: false, default: 'true' },
      { key: 'min_payout', label: 'Minimum Payout (UZS)', type: 'integer', required: false },
      { key: 'min_sale_rate', label: 'Minimum Sale Rate (%)', type: 'integer', required: false, helpText: 'Share of finished orders that were delivered, 0–100.' },
      { key: 'sort', label: 'Sort', required: false, choices: OFFER_SORTS, default: 'recommended' },
      { key: 'lang', label: 'Language of Name and Description', required: false, choices: LANGUAGES, default: 'uz' },
    ],
    perform,
    sample: samples.OFFER,
    outputFields: [
      { key: 'id', label: 'Offer ID', type: 'integer' },
      { key: 'name', label: 'Name' },
      { key: 'customer_price', label: 'Customer Price (UZS)', type: 'integer' },
      { key: 'payout', label: 'Payout (UZS)', type: 'integer' },
      { key: 'lead_bonus', label: 'Lead Bonus (UZS)', type: 'integer' },
      { key: 'in_stock', label: 'In Stock', type: 'boolean' },
      { key: 'stock', label: 'Stock', type: 'integer' },
      { key: 'sale_rate_percent', label: 'Sale Rate (%)', type: 'integer' },
      { key: 'image_url', label: 'Image URL' },
      { key: 'video_url', label: 'Video URL' },
      { key: 'description', label: 'Description (Get by ID only)' },
    ],
  },
};
