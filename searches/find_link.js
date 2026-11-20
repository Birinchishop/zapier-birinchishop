'use strict';

const { apiData, apiGetOrNull, toInt } = require('../lib/http');
const { offerId, linkId } = require('../lib/fields');
const samples = require('../lib/samples');

const perform = async (z, bundle) => {
  const i = bundle.inputData;
  if (i.link_id) {
    const link = await apiGetOrNull(z, `/links/${encodeURIComponent(toInt(i.link_id))}`);
    return link ? [link] : [];
  }
  if (!i.offer_id) throw new z.errors.Error('Fill in "Offer" or "Link".', 'invalid_request', 400);
  const links = (await apiData(z, 'GET', '/links', { params: { offer_id: toInt(i.offer_id), limit: 100, page: 1 } })) || [];
  return i.name ? links.filter((l) => String(l.name || '').toLowerCase() === String(i.name).trim().toLowerCase()) : links;
};

module.exports = {
  key: 'find_link',
  noun: 'Link',
  display: {
    label: 'Find Link',
    description: 'Finds your tracking link by ID, or your links for an offer (newest first). Pair it with Create Link to reuse an existing link.',
  },
  operation: {
    inputFields: [
      offerId({ helpText: 'Find your links for this offer.' }),
      { key: 'name', label: 'Link Name', required: false, helpText: 'Only links with exactly this name (case-insensitive).' },
      linkId({ helpText: 'Or get this exact link.' }),
    ],
    perform,
    sample: samples.LINK,
    outputFields: [
      { key: 'id', label: 'Link ID', type: 'integer' },
      { key: 'name', label: 'Link Name' },
      { key: 'url', label: 'Link URL' },
      { key: 'tracking_url_template', label: 'Tracking URL Template' },
      { key: 'offer_id', label: 'Offer ID', type: 'integer' },
      { key: 'offer_name', label: 'Offer Name' },
      { key: 'clicks', label: 'Clicks', type: 'integer' },
      { key: 'orders', label: 'Orders', type: 'integer' },
      { key: 'delivered', label: 'Delivered Orders', type: 'integer' },
    ],
  },
};
