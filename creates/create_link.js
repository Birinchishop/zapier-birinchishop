'use strict';

const { apiData, toInt } = require('../lib/http');
const { offerId } = require('../lib/fields');
const samples = require('../lib/samples');

const perform = async (z, bundle) =>
  apiData(z, 'POST', '/links', {
    body: { offer_id: toInt(bundle.inputData.offer_id), name: bundle.inputData.name },
  });

module.exports = {
  key: 'create_link',
  noun: 'Link',
  display: {
    label: 'Create Link',
    description: 'Creates a tracking link for an offer. Customers order on the link page; you earn the payout for every delivered order.',
  },
  operation: {
    inputFields: [
      offerId({ required: true }),
      { key: 'name', label: 'Link Name', required: false, helpText: 'Your label for the link (max 100 characters), e.g. "Instagram reels".' },
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
      { key: 'test', label: 'Is Test (Nothing Created)', type: 'boolean' },
    ],
  },
};
