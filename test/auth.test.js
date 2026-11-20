'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');
const { nock, api, API, bundle } = require('./helpers');

const appTester = zapier.createAppTester(App);
nock.disableNetConnect();
afterEach(() => nock.cleanAll());

const me = (mode) => ({ id: 1001, name: 'Partner', status: 'active', balance: 0, api_key: { name: 'k', mode, scopes: ['account:read'] } });

describe('authentication', () => {
  test('test calls GET /me with the Bearer key', async () => {
    const scope = api().get(`${API}/me`).reply(200, { data: me('live'), request_id: 'req_1' });
    const result = await appTester(App.authentication.test, bundle());
    expect(result.id).toBe(1001);
    scope.done();
  });

  test('connection label marks test keys and never shows the key', () => {
    const label = App.authentication.connectionLabel;
    expect(label({}, { inputData: me('test') })).toBe('Partner #1001 (test)');
    expect(label({}, { inputData: me('live') })).toBe('Partner #1001');
  });

  test('a wrong key gives a readable error with code and request id', async () => {
    api().get(`${API}/me`).reply(401, { error: { code: 'unauthorized', message: 'Invalid API key' }, request_id: 'req_abc' });
    await expect(appTester(App.authentication.test, bundle())).rejects.toThrow(/Invalid API key \[unauthorized\].*Request ID: req_abc/);
  });

  test('a revoked key marks the connection as expired', async () => {
    api().get(`${API}/me`).reply(401, { error: { code: 'key_revoked', message: 'Key revoked' }, request_id: 'r' });
    await expect(appTester(App.authentication.test, bundle())).rejects.toMatchObject({ name: 'ExpiredAuthError' });
  });

  test('rate limits become ThrottledError with Retry-After', async () => {
    api().get(`${API}/me`).reply(429, { error: { code: 'rate_limited', message: 'Slow down' } }, { 'Retry-After': '17' });
    const err = await appTester(App.authentication.test, bundle()).catch((e) => e);
    expect(err.name).toBe('ThrottledError');
    expect(JSON.parse(err.message).delay).toBe(17);
  });

  test('the key is not sent to other hosts', async () => {
    const other = nock('https://example.com', { badheaders: ['authorization'] }).get('/x').reply(200, {});
    await appTester(async (z) => (await z.request('https://example.com/x')).status, bundle());
    other.done();
  });
});
