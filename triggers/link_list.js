'use strict';

const { apiData } = require('../lib/http');
const samples = require('../lib/samples');

/** Hidden trigger for the "Link" dropdown: your tracking links, newest first, 100 per page. */
const perform = async (z, bundle) => {
  const page = Number((bundle.meta && bundle.meta.page) || 0) + 1;
  const links = (await apiData(z, 'GET', '/links', { params: { page, limit: 100 } })) || [];
  return links.map((l) => ({
    ...l,
    label: `${l.name || `Link #${l.id}`} — ${l.offer_name || `offer #${l.offer_id}`}${l.offer_active === false ? ' (offer inactive)' : ''} (#${l.id})`,
  }));
};

module.exports = {
  key: 'link_list',
  noun: 'Link',
  display: {
    label: 'List Links',
    description: 'Triggers when the Link dropdown is loaded.',
    hidden: true,
  },
  operation: {
    type: 'polling',
    canPaginate: true,
    perform,
    sample: { ...samples.LINK, label: 'Instagram reels — Smart watch X8 (#9001)' },
    outputFields: [
      { key: 'id', label: 'Link ID', type: 'integer' },
      { key: 'label', label: 'Label' },
    ],
  },
};
