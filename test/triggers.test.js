'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');
const { nock, api, API, bundle, signedRequest, webhookPayload, order } = require('./helpers');

const appTester = zapier.createAppTester(App);
nock.disableNetConnect();
afterEach(() => nock.cleanAll());

const SECRET = 'whsec_unit_test_secret';
const subscribeData = { id: 77, secret: SECRET };
const statusOp = App.triggers.order_status_changed.operation;
const newOp = App.triggers.new_order.operation;

describe('REST hook subscribe / unsubscribe', () => {
  test('subscribe registers a signed JSON webhook for the trigger event', async () => {
    const scope = api()
      .post(`${API}/webhooks`, (b) => {
        expect(b).toEqual({ url: 'https://hooks.zapier.com/hooks/standard/1/abc/', kind: 'json', events: ['order.created'], description: 'Zapier: Unit test zap' });
        return true;
      })
      .reply(201, { data: { id: 77, secret: SECRET, events: ['order.created'], created_at: '2026-11-20T00:00:00Z' } });
    const result = await appTester(newOp.performSubscribe, bundle({}, { targetUrl: 'https://hooks.zapier.com/hooks/standard/1/abc/' }));
    expect(result).toMatchObject({ id: 77, secret: SECRET });
    scope.done();
  });

  test('status trigger subscribes to order.status_changed', async () => {
    const scope = api()
      .post(`${API}/webhooks`, (b) => b.events.length === 1 && b.events[0] === 'order.status_changed')
      .reply(201, { data: { id: 78, secret: SECRET } });
    await appTester(statusOp.performSubscribe, bundle({}, { targetUrl: 'https://hooks.zapier.com/x' }));
    scope.done();
  });

  test('subscribe explains a full webhook list', async () => {
    api().post(`${API}/webhooks`).reply(409, { error: { code: 'webhook_limit_reached', message: 'Maximum 10 webhooks per account' }, request_id: 'r1' });
    await expect(appTester(newOp.performSubscribe, bundle({}, { targetUrl: 'https://hooks.zapier.com/x' }))).rejects.toThrow(/10 webhooks.*Dashboard → API → Webhooks/);
  });

  test('unsubscribe deletes the webhook', async () => {
    const scope = api().delete(`${API}/webhooks/77`).reply(200, { data: { deleted: true } });
    expect(await appTester(newOp.performUnsubscribe, bundle({}, { subscribeData }))).toEqual({ deleted: true });
    scope.done();
  });

  test('unsubscribe tolerates an already deleted webhook', async () => {
    api().delete(`${API}/webhooks/77`).reply(404, { error: { code: 'webhook_not_found', message: 'Webhook not found' } });
    expect(await appTester(newOp.performUnsubscribe, bundle({}, { subscribeData }))).toMatchObject({ already_deleted: true });
  });

  test('unsubscribe reports other failures', async () => {
    api().delete(`${API}/webhooks/77`).reply(500, { error: { code: 'internal_error', message: 'Boom' } });
    await expect(appTester(newOp.performUnsubscribe, bundle({}, { subscribeData }))).rejects.toThrow(/Boom/);
  });
});

describe('REST hook perform (signature)', () => {
  test('returns the flattened event for a valid signature', async () => {
    const rawRequest = signedRequest(webhookPayload(), SECRET);
    const [event] = await appTester(statusOp.perform, bundle({}, { rawRequest, subscribeData }));
    expect(event).toMatchObject({ id: 'evt_1001', event_id: 1001, type: 'order.status_changed', order_id: 501, status: 'delivered', previous_status: 'shipping', conversion_status: 'sale', test: false });
    expect(event.order.customer.phone_masked).toBe('+998 ** *** 45 67');
  });

  test('halts on a forged body', async () => {
    const rawRequest = signedRequest(webhookPayload(), SECRET, { tamper: true });
    await expect(appTester(statusOp.perform, bundle({}, { rawRequest, subscribeData }))).rejects.toMatchObject({ name: 'HaltedError' });
  });

  test('halts on a wrong secret and on a missing signature', async () => {
    const rawRequest = signedRequest(webhookPayload(), 'whsec_attacker');
    await expect(appTester(statusOp.perform, bundle({}, { rawRequest, subscribeData }))).rejects.toThrow(/mismatch/);
    const unsigned = { ...signedRequest(webhookPayload(), SECRET), headers: {} };
    await expect(appTester(statusOp.perform, bundle({}, { rawRequest: unsigned, subscribeData }))).rejects.toThrow(/malformed_header/);
  });

  test('halts on an old (replayed) request', async () => {
    const rawRequest = signedRequest(webhookPayload(), SECRET, { t: Math.floor(Date.now() / 1000) - 7200 });
    await expect(appTester(statusOp.perform, bundle({}, { rawRequest, subscribeData }))).rejects.toThrow(/timestamp_out_of_range/);
  });

  test('ignores other event types', async () => {
    const rawRequest = signedRequest(webhookPayload(), SECRET);
    expect(await appTester(newOp.perform, bundle({}, { rawRequest, subscribeData }))).toEqual([]);
  });

  test('applies status and conversion filters', async () => {
    const rawRequest = signedRequest(webhookPayload(), SECRET);
    const run = (inputData) => appTester(statusOp.perform, bundle(inputData, { rawRequest, subscribeData }));
    expect(await run({ statuses: ['returned', 'cancelled'] })).toEqual([]);
    expect(await run({ statuses: ['delivered'] })).toHaveLength(1);
    expect(await run({ conversion_statuses: 'approved,rejected' })).toEqual([]);
    expect(await run({ conversion_statuses: ['sale'] })).toHaveLength(1);
  });

  test('test events pass by default and can be ignored', async () => {
    const rawRequest = signedRequest(webhookPayload({ id: 'evt_test', test: true }), SECRET);
    const [event] = await appTester(statusOp.perform, bundle({}, { rawRequest, subscribeData }));
    expect(event).toMatchObject({ test: true, event_id: null });
    expect(await appTester(statusOp.perform, bundle({ include_test_events: false }, { rawRequest, subscribeData }))).toEqual([]);
  });
});

describe('samples and polling', () => {
  test('new order performList uses the newest orders', async () => {
    api().get(`${API}/orders`).query({ limit: 3, page: 1 }).reply(200, { data: [order({ id: 3 }), order({ id: 2, status: 'confirmed', conversion_status: 'approved' })], meta: { total_pages: 1 } });
    const items = await appTester(newOp.performList, bundle());
    expect(items.map((i) => i.id)).toEqual(['order_3_created', 'order_2_created']);
    expect(items[0].type).toBe('order.created');
  });

  test('polling reads page 1 and the newest (last) pages, newest first, one item per order+status', async () => {
    const q = (page) => (query) => Number(query.page) === page && Number(query.limit) === 100 && Boolean(query.updated_since);
    api().get(`${API}/orders`).query(q(1)).reply(200, { data: [order({ id: 1, status: 'cancelled', updated_at: '2026-11-14T00:00:00Z' })], meta: { total_pages: 5 } });
    api().get(`${API}/orders`).query(q(5)).reply(200, { data: [order({ id: 9, status: 'confirmed', updated_at: '2026-11-20T08:00:00Z' }), order({ id: 10, status: 'new', updated_at: '2026-11-20T09:00:00Z' })] });
    api().get(`${API}/orders`).query(q(4)).reply(200, { data: [order({ id: 8, status: 'delivered', conversion_status: 'sale', updated_at: '2026-11-19T00:00:00Z' })] });
    const items = await appTester(App.triggers.order_updated_polling.operation.perform, bundle());
    expect(items.map((i) => i.id)).toEqual(['order_10_new', 'order_9_confirmed', 'order_8_delivered', 'order_1_cancelled']);
    expect(items[0].type).toBe('order.created');
    expect(items[1].type).toBe('order.status_changed');
    expect(nock.pendingMocks()).toEqual([]);
  });

  test('polling filters by status', async () => {
    api().get(`${API}/orders`).query(true).reply(200, { data: [order({ id: 1, status: 'delivered', conversion_status: 'sale' }), order({ id: 2 })], meta: { total_pages: 1 } });
    const items = await appTester(App.triggers.order_updated_polling.operation.perform, bundle({ conversion_statuses: ['sale'] }));
    expect(items.map((i) => i.order_id)).toEqual([1]);
  });

  test('status trigger samples skip new orders', async () => {
    api().get(`${API}/orders`).query(true).reply(200, { data: [order({ id: 1 }), order({ id: 2, status: 'shipping', conversion_status: 'approved' })], meta: { total_pages: 1 } });
    const items = await appTester(statusOp.performList, bundle());
    expect(items.map((i) => i.order_id)).toEqual([2]);
  });
});

describe('dropdowns', () => {
  test('offer list paginates (Zapier page 0 → API page 1) and builds labels', async () => {
    api().get(`${API}/offers`).query({ page: 2, limit: 100, in_stock_only: 'true', sort: 'recommended' })
      .reply(200, { data: [{ id: 5, name: 'Watch', payout: 50000, sale_rate_percent: 40 }] });
    const items = await appTester(App.triggers.offer_list.operation.perform, bundle({}, { meta: { page: 1 } }));
    expect(items[0].label).toBe('Watch — payout 50,000 UZS, sale rate 40% (#5)');
  });

  test('link list labels', async () => {
    api().get(`${API}/links`).query({ page: 1, limit: 100 }).reply(200, { data: [{ id: 9, name: 'IG', offer_id: 5, offer_name: 'Watch', offer_active: false }] });
    const items = await appTester(App.triggers.link_list.operation.perform, bundle());
    expect(items[0].label).toBe('IG — Watch (offer inactive) (#9)');
  });
});
