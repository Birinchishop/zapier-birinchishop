'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');
const { defaultIdempotencyKey } = require('../lib/http');
const { nock, api, API, bundle, order } = require('./helpers');

const appTester = zapier.createAppTester(App);
nock.disableNetConnect();
afterEach(() => nock.cleanAll());

// Every request below goes to a nock mock: no real order or link is ever created.

describe('Create Order', () => {
  const op = App.creates.create_order.operation;

  test('sends the order with a derived Idempotency-Key and drops empty fields', async () => {
    const input = { link_id: '9', phone: '+998 90 123 45 67', name: 'Ali', sub1: 'fb', sub2: '', variant_id: '' };
    const expectedKey = defaultIdempotencyKey(bundle(input));
    const scope = api()
      .matchHeader('idempotency-key', expectedKey)
      .matchHeader('content-type', /application\/json/)
      .post(`${API}/orders`, { link_id: 9, phone: '+998 90 123 45 67', name: 'Ali', sub1: 'fb' })
      .reply(201, { data: order({ id: 2000000001, test: true, live_orders_allowed: false }) });
    const result = await appTester(op.perform, bundle(input));
    expect(result).toMatchObject({ id: 2000000001, test: true, idempotent_replayed: false, idempotency_key: expectedKey });
    scope.done();
  });

  test('uses and sanitizes a mapped Idempotency-Key; 200 means replayed', async () => {
    const scope = api()
      .matchHeader('idempotency-key', 'lead-42-row-7')
      .post(`${API}/orders`)
      .reply(200, { data: order({ id: 501 }) }, { 'Idempotent-Replayed': 'true' });
    const result = await appTester(op.perform, bundle({ link_id: 9, phone: '+998901234567', idempotency_key: 'lead 42/row#7' }));
    expect(result.idempotent_replayed).toBe(true);
    scope.done();
  });

  test('derived key is stable for the same data and day, different otherwise', () => {
    const now = Date.parse('2026-11-20T10:00:00Z');
    const a = defaultIdempotencyKey(bundle({ link_id: 9, phone: '+998 90 123-45-67' }), now);
    expect(a).toMatch(/^zapier:[0-9a-f]{48}$/);
    expect(defaultIdempotencyKey(bundle({ link_id: 9, phone: '998901234567' }), now)).toBe(a);
    expect(defaultIdempotencyKey(bundle({ link_id: 9, phone: '998901234568' }), now)).not.toBe(a);
    expect(defaultIdempotencyKey(bundle({ link_id: 9, phone: '998901234567' }), now + 86400e3)).not.toBe(a);
  });

  test('business refusals halt the run instead of erroring', async () => {
    api().post(`${API}/orders`).reply(409, { error: { code: 'duplicate_order', message: 'Duplicate' }, request_id: 'r9' });
    const err = await appTester(op.perform, bundle({ link_id: 9, phone: '+998901234567' })).catch((e) => e);
    expect(err.name).toBe('HaltedError');
    expect(err.message).toMatch(/Do not retry this order/);
  });

  test('validation errors list the fields', async () => {
    api().post(`${API}/orders`).reply(400, { error: { code: 'invalid_phone', message: 'phone must be an Uzbekistan mobile number', details: [{ field: 'phone', message: 'invalid' }] } });
    await expect(appTester(op.perform, bundle({ link_id: 9, phone: '123' }))).rejects.toThrow(/invalid_phone.*Details: phone: invalid/);
  });

  test('the action shows the REAL order warning', () => {
    const notice = op.inputFields.find((f) => f.type === 'copy');
    expect(notice.helpText).toMatch(/REAL order/);
    expect(notice.helpText).toMatch(/bsk_test_/);
  });
});

describe('Create Link / Set Test Order Status', () => {
  test('create link', async () => {
    const scope = api().post(`${API}/links`, { offer_id: 5, name: 'IG' }).reply(201, { data: { id: 2000000005, url: 'https://birinchishop.uz/l/x', test: true } });
    expect(await appTester(App.creates.create_link.operation.perform, bundle({ offer_id: '5', name: 'IG' }))).toMatchObject({ test: true });
    scope.done();
  });

  test('set test order status', async () => {
    const scope = api().post(`${API}/sandbox/orders/2000000001/status`, { status: 'delivered' })
      .reply(200, { data: { order: order({ id: 2000000001, status: 'delivered' }), previous_status: 'new', webhooks: { sent: 1 } } });
    const r = await appTester(App.creates.set_test_order_status.operation.perform, bundle({ order_id: 2000000001, status: 'delivered' }));
    expect(r.previous_status).toBe('new');
    scope.done();
  });

  test('set test order status with a live key explains the mode', async () => {
    api().post(`${API}/sandbox/orders/1/status`).reply(403, { error: { code: 'test_mode_only', message: 'Test keys only' } });
    await expect(appTester(App.creates.set_test_order_status.operation.perform, bundle({ order_id: 1, status: 'delivered' }))).rejects.toThrow(/bsk_test_/);
  });
});

describe('Searches', () => {
  test('find order by id; 404 = nothing found', async () => {
    api().get(`${API}/orders/501`).reply(200, { data: order() });
    expect(await appTester(App.searches.find_order.operation.perform, bundle({ order_id: 501 }))).toHaveLength(1);
    api().get(`${API}/orders/502`).reply(404, { error: { code: 'order_not_found', message: 'Order not found' } });
    expect(await appTester(App.searches.find_order.operation.perform, bundle({ order_id: 502 }))).toEqual([]);
  });

  test('find order by external id', async () => {
    api().get(`${API}/orders`).query({ external_id: 'lead-42', limit: 10, page: 1 }).reply(200, { data: [order()] });
    expect(await appTester(App.searches.find_order.operation.perform, bundle({ external_id: 'lead-42' }))).toHaveLength(1);
  });

  test('find order needs a lookup value', async () => {
    await expect(appTester(App.searches.find_order.operation.perform, bundle({}))).rejects.toThrow(/Order ID/);
  });

  test('find order surfaces non-404 errors', async () => {
    api().get(`${API}/orders/1`).reply(403, { error: { code: 'insufficient_scope', message: 'Missing scope orders:read' } });
    await expect(appTester(App.searches.find_order.operation.perform, bundle({ order_id: 1 }))).rejects.toThrow(/orders:read.*grant the scope/);
  });

  test('find offer by id (full) or by filters', async () => {
    api().get(`${API}/offers/5`).query({ lang: 'ru' }).reply(200, { data: { id: 5, variants: [] } });
    expect(await appTester(App.searches.find_offer.operation.perform, bundle({ offer_id: '5', lang: 'ru' }))).toEqual([{ id: 5, variants: [] }]);
    api().get(`${API}/offers`).query({ search: 'soat', in_stock_only: 'true', min_sale_rate: 20, sort: 'best_selling', limit: 10, page: 1 })
      .reply(200, { data: [{ id: 1 }, { id: 2 }] });
    const r = await appTester(App.searches.find_offer.operation.perform, bundle({ search: 'soat', min_sale_rate: '20', sort: 'best_selling' }));
    expect(r).toHaveLength(2);
  });

  test('find link by offer and name', async () => {
    api().get(`${API}/links`).query({ offer_id: 5, limit: 100, page: 1 }).reply(200, { data: [{ id: 1, name: 'IG' }, { id: 2, name: 'TG' }] });
    const r = await appTester(App.searches.find_link.operation.perform, bundle({ offer_id: 5, name: 'ig' }));
    expect(r.map((l) => l.id)).toEqual([1]);
  });

  test('statistics: totals at top level, rows as line items', async () => {
    api().get(`${API}/stats`).query({ group_by: 'offer', date_from: '2026-11-01', date_to: '2026-11-20' }).reply(200, {
      data: [{ offer_id: 5, orders: 3 }],
      meta: { group_by: 'offer', date_from: '2026-11-01', date_to: '2026-11-20', timezone: 'Asia/Tashkent', currency: 'UZS', totals: { orders: 3, earned: 100000 }, clicks_since: null },
    });
    const [r] = await appTester(App.searches.get_stats.operation.perform, bundle({ group_by: 'offer', date_from: '2026-11-01T00:00:00+05:00', date_to: '2026-11-20' }));
    expect(r).toMatchObject({ id: 'offer:2026-11-01:2026-11-20', orders: 3, earned: 100000, rows: [{ offer_id: 5, orders: 3 }] });
  });

  test('cohorts and attribution', async () => {
    api().get(`${API}/stats/cohorts`).query({ weeks: 8, source: 'api' }).reply(200, {
      data: [{ week_start: '2026-11-02', delivered_within_days: { 3: null } }],
      meta: { weeks: 8, date_from: '2026-09-28', date_to: '2026-11-22', filters: { source: 'api' }, totals: { orders: 10, delivered: 3 }, average: {} },
    });
    const [c] = await appTester(App.searches.get_cohorts.operation.perform, bundle({ weeks: '8', source: 'api' }));
    expect(c).toMatchObject({ weeks: 8, orders: 10, delivered: 3, cohorts: [{ week_start: '2026-11-02' }] });

    api().get(`${API}/stats/attribution`).reply(200, { data: { summary: { orders: 4 }, links: [], paths: [] }, meta: { date_from: '2026-10-22', date_to: '2026-11-20' } });
    const [a] = await appTester(App.searches.get_attribution.operation.perform, bundle({}));
    expect(a).toMatchObject({ id: 'attribution:2026-10-22:2026-11-20', summary: { orders: 4 } });
  });

  test('every search has at least one input field (Zapier check D009)', () => {
    for (const def of Object.values(App.searches)) expect(def.operation.inputFields.length).toBeGreaterThan(0);
  });

  test('trigger descriptions start with "Triggers when " and end with a period (check D021)', () => {
    for (const def of Object.values(App.triggers)) expect(def.display.description).toMatch(/^Triggers when .*\.$/);
  });
});

describe('app definition', () => {
  test('is valid against the Zapier schema (same check as `zapier-platform validate`)', () => {
    const schemaTools = require('zapier-platform-core/src/tools/schema');
    expect(schemaTools.validateApp(schemaTools.compileApp(App))).toEqual([]);
  });

  test('every visible trigger/create/search has a sample and a description', () => {
    for (const type of ['triggers', 'creates', 'searches']) {
      for (const [key, def] of Object.entries(App[type])) {
        expect(def.key).toBe(key);
        expect(def.operation.sample).toBeTruthy();
        if (!def.display.hidden) expect(def.display.description.length).toBeGreaterThan(20);
      }
    }
  });
});
