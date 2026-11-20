'use strict';

// Static samples (fake values). The phone is always masked by the API.

const ORDER = {
  id: 123456,
  status: 'new',
  conversion_status: 'lead',
  created_at: '2026-11-20T09:15:00.000Z',
  updated_at: '2026-11-20T09:15:00.000Z',
  offer: { id: 512, name: 'Smart watch X8' },
  link: { id: 9001, name: 'Instagram reels' },
  variant: null,
  customer: { name: 'Mijoz 4567', phone_masked: '+998 ** *** 45 67', region: 'Toshkent shahri' },
  customer_price: 199000,
  payout: 50000,
  payout_status: 'pending',
  currency: 'UZS',
  delivery_date: null,
  operator_note: null,
  courier_note: null,
  source: 'api',
  sale_chance_percent: null,
  tracking: {
    click_id: 'abc123',
    sub1: 'campaign-1',
    sub2: null,
    sub3: null,
    sub4: null,
    sub5: null,
    external_id: 'lead-42',
  },
};

const EVENT_CREATED = {
  id: 'evt_778899',
  event_id: 778899,
  type: 'order.created',
  api_version: '2026-10-23',
  created_at: '2026-11-20T09:15:00.000Z',
  order_id: 123456,
  status: 'new',
  previous_status: null,
  conversion_status: 'lead',
  test: false,
  order: ORDER,
};

const EVENT_STATUS_CHANGED = {
  ...EVENT_CREATED,
  id: 'evt_778950',
  event_id: 778950,
  type: 'order.status_changed',
  created_at: '2026-11-22T14:02:00.000Z',
  status: 'delivered',
  previous_status: 'shipping',
  conversion_status: 'sale',
  order: { ...ORDER, status: 'delivered', conversion_status: 'sale', payout_status: 'pending', updated_at: '2026-11-22T14:02:00.000Z' },
};

const OFFER = {
  id: 512,
  name: 'Smart watch X8',
  customer_price: 199000,
  customer_price_is_minimum: false,
  payout: 50000,
  payout_is_minimum: false,
  lead_bonus: 0,
  currency: 'UZS',
  in_stock: true,
  stock: 140,
  sale_rate_percent: 38,
  sale_rate_tier: 'good',
  payment_type: 'after_delivery',
  image_url: 'https://birinchishop.uz/uploads/offers/sample.jpg',
  video_url: null,
  has_variants: false,
  created_at: '2026-10-01T08:00:00.000Z',
};

const LINK = {
  id: 9001,
  name: 'Instagram reels',
  offer_id: 512,
  offer_name: 'Smart watch X8',
  offer_active: true,
  url: 'https://birinchishop.uz/l/AbC123',
  tracking_url_template:
    'https://birinchishop.uz/l/AbC123?click_id={click_id}&sub1={sub1}&sub2={sub2}&sub3={sub3}&sub4={sub4}&sub5={sub5}',
  clicks: 0,
  orders: 0,
  delivered: 0,
  created_at: '2026-11-20T09:00:00.000Z',
};

const ACCOUNT = {
  id: 1001,
  name: 'Partner name',
  status: 'active',
  balance: 350000,
  balance_frozen: 0,
  min_withdrawal: 50000,
  currency: 'UZS',
  created_at: '2026-06-01T10:00:00.000Z',
  api_key: { name: 'Zapier', mode: 'live', scopes: ['account:read', 'orders:read'], expires_at: null },
};

const STATS = {
  id: 'day:2026-10-22:2026-11-20',
  group_by: 'day',
  date_from: '2026-10-22',
  date_to: '2026-11-20',
  timezone: 'Asia/Tashkent',
  currency: 'UZS',
  orders: 40,
  approved: 22,
  delivered: 15,
  rejected: 12,
  pending: 6,
  earned: 750000,
  potential_earnings: 350000,
  approval_rate_percent: 55,
  delivery_rate_percent: 38,
  clicks: 1200,
  unique_clicks: 950,
  clicks_since: '2026-11-18T00:00:00.000Z',
  rows: [
    {
      date: '2026-11-20',
      orders: 2,
      approved: 1,
      delivered: 0,
      rejected: 0,
      pending: 1,
      approval_rate_percent: 50,
      delivery_rate_percent: 0,
      earned: 0,
      potential_earnings: 100000,
      clicks: 60,
      unique_clicks: 48,
    },
  ],
};

const COHORTS = {
  id: 'cohorts:12',
  weeks: 12,
  date_from: '2026-08-31',
  date_to: '2026-11-22',
  timezone: 'Asia/Tashkent',
  week_starts_on: 'monday',
  windows_days: [3, 7, 14, 30],
  orders: 300,
  delivered: 96,
  delivered_rate_percent: 32,
  in_progress: 20,
  average: {
    3: { delivered: 40, rate_percent: 14 },
    7: { delivered: 80, rate_percent: 28 },
    14: { delivered: 90, rate_percent: 31 },
    30: { delivered: 94, rate_percent: 32 },
  },
  cohorts: [
    {
      week_start: '2026-11-02',
      week_end: '2026-11-08',
      complete: true,
      orders: 25,
      delivered: 8,
      delivered_rate_percent: 32,
      in_progress: 1,
      delivered_within_days: {
        3: { delivered: 3, rate_percent: 12 },
        7: { delivered: 7, rate_percent: 28 },
        14: { delivered: 8, rate_percent: 32 },
        30: null,
      },
    },
  ],
};

const ATTRIBUTION = {
  id: 'attribution:2026-10-22:2026-11-20',
  date_from: '2026-10-22',
  date_to: '2026-11-20',
  timezone: 'Asia/Tashkent',
  tracking_since: '2026-11-18T00:00:00.000Z',
  lookback_days: 30,
  summary: { orders: 40, converted_by_you: 38, multi_touch: 5, with_other_partners: 2, assisted_for_other_partners: 1 },
  links: [
    {
      link_id: 9001,
      link_name: 'Instagram reels',
      first_touch_orders: 10,
      last_touch_orders: 12,
      assist_orders: 2,
      single_touch_orders: 20,
      converted_orders: 30,
    },
  ],
  paths: [],
};

module.exports = { ORDER, EVENT_CREATED, EVENT_STATUS_CHANGED, OFFER, LINK, ACCOUNT, STATS, COHORTS, ATTRIBUTION };
