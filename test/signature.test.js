'use strict';

const { verifyWebhookSignature, parseSignatureHeader, findHeader } = require('../lib/signature');
const { sign } = require('./helpers');

const secret = 'whsec_unit_test_secret';
const body = '{"id":"evt_1","type":"order.created"}';
const t = 1_800_000_000;

describe('verifyWebhookSignature', () => {
  test('accepts a valid signature', () => {
    const r = verifyWebhookSignature(body, `t=${t},v1=${sign(secret, t, body)}`, secret, { now: t + 10 });
    expect(r).toEqual({ valid: true, timestamp: t });
  });

  test('accepts when one of several v1 values matches (secret rotation)', () => {
    const header = `t=${t},v1=${'0'.repeat(64)},v1=${sign(secret, t, body)}`;
    expect(verifyWebhookSignature(body, header, secret, { now: t }).valid).toBe(true);
  });

  test('rejects a changed body', () => {
    const r = verifyWebhookSignature(body + ' ', `t=${t},v1=${sign(secret, t, body)}`, secret, { now: t });
    expect(r).toEqual({ valid: false, reason: 'mismatch' });
  });

  test('rejects a wrong secret', () => {
    const r = verifyWebhookSignature(body, `t=${t},v1=${sign('whsec_other', t, body)}`, secret, { now: t });
    expect(r.reason).toBe('mismatch');
  });

  test('rejects an old timestamp (replay)', () => {
    const r = verifyWebhookSignature(body, `t=${t},v1=${sign(secret, t, body)}`, secret, { now: t + 301, toleranceSeconds: 300 });
    expect(r.reason).toBe('timestamp_out_of_range');
  });

  test('rejects missing or malformed headers, secret and body', () => {
    expect(verifyWebhookSignature(body, undefined, secret).reason).toBe('malformed_header');
    expect(verifyWebhookSignature(body, 't=abc,v1=00', secret).reason).toBe('malformed_header');
    expect(verifyWebhookSignature(body, `t=${t}`, secret).reason).toBe('malformed_header');
    expect(verifyWebhookSignature(body, `t=${t},v1=xyz`, secret, { now: t }).reason).toBe('mismatch');
    expect(verifyWebhookSignature(body, `t=${t},v1=00`, '').reason).toBe('missing_secret');
    expect(verifyWebhookSignature(undefined, `t=${t},v1=00`, secret).reason).toBe('missing_body');
  });

  test('parses the header', () => {
    expect(parseSignatureHeader('t=1, v1=aa ,v1=bb')).toEqual({ t: '1', v1: ['aa', 'bb'] });
  });
});

describe('findHeader', () => {
  test('finds Zapier "Http-" prefixed headers case-insensitively', () => {
    expect(findHeader({ 'Http-X-Birinchishop-Signature': 'a' }, 'X-Birinchishop-Signature')).toBe('a');
    expect(findHeader({ 'http-x-birinchishop-signature': 'b' }, 'X-Birinchishop-Signature')).toBe('b');
    expect(findHeader({ 'X-Birinchishop-Signature': 'c' }, 'X-Birinchishop-Signature')).toBe('c');
    expect(findHeader({}, 'X-Birinchishop-Signature')).toBeUndefined();
    expect(findHeader(undefined, 'X')).toBeUndefined();
  });
});
