'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { handler, verifySignature } = require('../lib/webhook');

const SECRET = 'whsec_testsecret';
const ENV = { STRIPE_WEBHOOK_SECRET: SECRET, RESEND_API_KEY: 're_x', MAIL_FROM: 'Carte de poche <bonjour@cartedepoche.fr>', MAIL_REPLY_TO: 'bonjour@cartedepoche.fr' };
const NOW = Date.parse('2026-12-01T06:31:00Z');
const T = Math.floor(NOW / 1000);

const sig = (raw, secret, t) => 't=' + (t || T) + ',v1=' + crypto.createHmac('sha256', secret || SECRET).update((t || T) + '.' + raw).digest('hex');
const sess = (over) => Object.assign({ id: 'cs_test_WEBHOOK123456', created: T - 60, amount_total: 199, currency: 'eur', status: 'complete', payment_status: 'paid', customer_details: { email: 'c@example.com' }, metadata: { product: 'carte-de-poche', tier: 'launch', lang: 'fr' } }, over);
const evt = (obj, type) => JSON.stringify({ id: 'evt_1', type: type || 'checkout.session.completed', data: { object: obj } });
const mockRes = () => { const r = { statusCode: 0, headers: {}, body: null, setHeader(k, v) { r.headers[k] = v; }, end(b) { r.body = JSON.parse(b); } }; return r; };
const req = (raw, header, method) => ({ method: method || 'POST', headers: header === undefined ? { 'stripe-signature': sig(raw) } : { 'stripe-signature': header }, rawBody: raw });
function resendMock(status) { const calls = []; const f = async (url, init) => { calls.push({ url, init }); return { ok: (status || 200) < 400, status: status || 200 }; }; f.calls = calls; return f; }

test('signature : valide, mauvais secret, corps altéré, horodatage périmé, en-tête cassé', () => {
  const raw = '{"a":1}';
  assert.equal(verifySignature(raw, sig(raw), SECRET, NOW), true);
  assert.equal(verifySignature(raw, sig(raw, 'autre'), SECRET, NOW), false);
  assert.equal(verifySignature('{"a":2}', sig(raw), SECRET, NOW), false);
  assert.equal(verifySignature(raw, sig(raw, SECRET, T - 301), SECRET, NOW), false, '5 min de tolérance');
  assert.equal(verifySignature(raw, sig(raw, SECRET, T - 299), SECRET, NOW), true);
  assert.equal(verifySignature(raw, 'garbage', SECRET, NOW), false);
  assert.equal(verifySignature(raw, undefined, SECRET, NOW), false);
  assert.equal(verifySignature(raw, sig(raw) + ',v1=00', SECRET, NOW), true, 'plusieurs v1 : un seul bon suffit');
});

test('webhook : session payée => un email, clé d’idempotence, réponse 200', async () => {
  const f = resendMock();
  const raw = evt(sess());
  const res = mockRes(); await handler({ env: ENV, fetch: f, now: () => NOW })(req(raw), res);
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body, { sent: true });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].init.headers['Idempotency-Key'], 'confirm-cs_test_WEBHOOK123456');
  assert.deepEqual(JSON.parse(f.calls[0].init.body).to, ['c@example.com']);
});

test('webhook : signature invalide => 400, aucun email', async () => {
  const f = resendMock(); const raw = evt(sess());
  const res = mockRes(); await handler({ env: ENV, fetch: f, now: () => NOW })(req(raw, sig(raw, 'mauvais')), res);
  assert.equal(res.statusCode, 400); assert.equal(f.calls.length, 0);
  const res2 = mockRes(); await handler({ env: ENV, fetch: f, now: () => NOW })(req(raw, ''), res2);
  assert.equal(res2.statusCode, 400);
});

test('webhook : ignore session non payée, autre produit, autre type, sans adresse', async () => {
  const f = resendMock(); const h = handler({ env: ENV, fetch: f, now: () => NOW });
  for (const [raw, why] of [
    [evt(sess({ payment_status: 'unpaid' })), 'non payée'],
    [evt(sess({ metadata: { product: 'autre' } })), 'autre produit'],
    [evt(sess({ metadata: null })), 'sans métadonnées'],
    [evt(sess(), 'payment_intent.succeeded'), 'autre type'],
    [evt(sess({ customer_details: {} })), 'sans adresse']
  ]) { const res = mockRes(); await h(req(raw), res); assert.equal(res.statusCode, 200, why); assert.ok(res.body.ignored, why); }
  assert.equal(f.calls.length, 0, 'aucun envoi');
});

test('webhook : Resend en échec => 500 pour que Stripe réessaie', async () => {
  const f = resendMock(503); const raw = evt(sess());
  const res = mockRes(); await handler({ env: ENV, fetch: f, now: () => NOW })(req(raw), res);
  assert.equal(res.statusCode, 500); assert.equal(res.body.error, 'email_failed');
});

test('webhook : méthode, configuration absente, corps déjà analysé', async () => {
  const f = resendMock(); const raw = evt(sess());
  let res = mockRes(); await handler({ env: ENV, fetch: f, now: () => NOW })(req(raw, undefined, 'GET'), res); assert.equal(res.statusCode, 405);
  res = mockRes(); await handler({ env: {}, fetch: f, now: () => NOW })(req(raw), res); assert.equal(res.statusCode, 503);
  res = mockRes(); await handler({ env: Object.assign({}, ENV, { MAIL_FROM: '' }), fetch: f, now: () => NOW })(req(raw), res); assert.equal(res.statusCode, 503);
  res = mockRes(); await handler({ env: ENV, fetch: f, now: () => NOW })({ method: 'POST', headers: { 'stripe-signature': sig(raw) }, body: { id: 'evt_1' } }, res);
  assert.equal(res.statusCode, 400); assert.equal(res.body.error, 'raw_body');
  assert.equal(f.calls.length, 0);
});

test('webhook : lit le corps brut depuis le flux quand rawBody est absent', async () => {
  const { Readable } = require('stream');
  const f = resendMock(); const raw = evt(sess());
  const stream = Readable.from([Buffer.from(raw)]); stream.method = 'POST'; stream.headers = { 'stripe-signature': sig(raw) };
  const res = mockRes(); await handler({ env: ENV, fetch: f, now: () => NOW })(stream, res);
  assert.equal(res.statusCode, 200); assert.equal(f.calls.length, 1);
});
