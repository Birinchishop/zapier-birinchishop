'use strict';

const authentication = require('./authentication');
const { addAuthHeader, handleErrors } = require('./lib/http');

const newOrder = require('./triggers/new_order');
const orderStatusChanged = require('./triggers/order_status_changed');
const orderUpdatedPolling = require('./triggers/order_updated_polling');
const offerList = require('./triggers/offer_list');
const linkList = require('./triggers/link_list');

const createLink = require('./creates/create_link');
const createOrder = require('./creates/create_order');
const setTestOrderStatus = require('./creates/set_test_order_status');

const findOffer = require('./searches/find_offer');
const findLink = require('./searches/find_link');
const findOrder = require('./searches/find_order');
const getStats = require('./searches/get_stats');
const getCohorts = require('./searches/get_cohorts');
const getAttribution = require('./searches/get_attribution');

const byKey = (...items) => Object.fromEntries(items.map((i) => [i.key, i]));

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,
  beforeRequest: [addAuthHeader],
  afterResponse: [handleErrors],

  triggers: byKey(newOrder, orderStatusChanged, orderUpdatedPolling, offerList, linkList),
  creates: byKey(createLink, createOrder, setTestOrderStatus),
  searches: byKey(findOffer, findLink, findOrder, getStats, getCohorts, getAttribution),

  searchOrCreates: {
    find_link: {
      key: 'find_link',
      display: {
        label: 'Find or Create Link',
        description: 'Reuses your existing tracking link for the offer, or creates one.',
      },
      search: 'find_link',
      create: 'create_link',
    },
  },
};
