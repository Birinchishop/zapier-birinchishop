'use strict';

const { apiData } = require('./lib/http');

/** GET /me — needs the `account:read` scope. Its result is what connectionLabel receives. */
const test = async (z) => apiData(z, 'GET', '/me');

/** "Partner name #1001", or "Partner name #1001 (test)" for a bsk_test_ key. Never shows the key. */
const connectionLabel = (z, bundle) => {
  const me = bundle.inputData || {};
  const mode = me.api_key && me.api_key.mode;
  const name = me.name || 'Birinchishop partner';
  return `${name}${me.id ? ` #${me.id}` : ''}${mode === 'test' ? ' (test)' : ''}`;
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText:
        'Create a key in the [Birinchishop partner panel](https://birinchishop.uz/dashboard/api) (Dashboard → API). Grant `account:read` (needed to connect) plus the scopes your Zaps use; `webhooks:manage` for instant triggers. ' +
        'A live key (`bsk_live_...`) acts on your real account — **Create Order submits a REAL order** that a call center phones. ' +
        'A test key (`bsk_test_...`) reads real data but creates nothing; use it while building Zaps. Do not set an IP allowlist on a key used in Zapier.',
    },
  ],
  test,
  connectionLabel,
};
