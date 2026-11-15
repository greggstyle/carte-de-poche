'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { handlers, sign, verify, enabled, pickTier, originFrom, DAY_MS } = require('../lib/paywall');

const ENV = { STRIPE_SECRET_KEY: 'rk_test_x', PRICE_STANDARD: 'price_std', PRICE_LAUNCH: 'price_launch', UNLOCK_SECRET: 's3cret-s3cret-s3cret', LAUNCH_END: '2026-12-31T23:59:59+04:00' };
const T0 = Date.parse('2026-12-01T10:00:00Z');

function mockRes() {
  const r = { headers: {}, statusCode: 0, body: null, setHeader(k, v) { r.headers[k.toLowerCase()] = v; }, end(b) { r.body = JSON.parse(b); } };
  return r;
}
function stripeMock(sessions, prices) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    const path = url.replace('https://api.stripe.com/v1', '');
    let status = 200, json;
    if (path.startsWith('/prices/')) { const p = prices[path.split('/')[2]]; json = p ? { unit_amount: p, currency: 'eur' } : (status = 404, { error: { message: 'no price' } }); }
    else if (path === '/checkout/sessions' && init.method === 'POST') { json = { id: 'cs_test_NEW', url: 'https://checkout.stripe.com/c/pay/cs_test_NEW' }; }
    else if (path.startsWith('/checkout/sessions/')) { const s = sessions[path.split('/')[3]]; json = s || (status = 404, { error: { message: 'no session' } }); }
    else { status = 404; json = { error: { message: 'unknown' } }; }
    return { ok: status < 400, status, json: async () => json };
  };
  f.calls = calls;
  return f;
}
const PRICES = { price_std: 500, price_launch: 100 };
const paidSession = (over) => Object.assign({ id: 'cs_test_PAID123456', status: 'complete', payment_status: 'paid', mode: 'payment', created: Math.floor(T0 / 1000) - 60, metadata: { product: 'carte-de-poche', tier: 'launch' } }, over);

test('jeton : signature valide, falsifié, expiré, autre secret', () => {
  const tok = sign({ sid: 'cs_1', exp: T0 + 1000 }, ENV.UNLOCK_SECRET);
  assert.equal(verify(tok, ENV.UNLOCK_SECRET, T0).sid, 'cs_1');
  assert.equal(verify(tok, ENV.UNLOCK_SECRET, T0 + 1000), null, 'expiré pile à exp');
  assert.equal(verify(tok, 'autre-secret', T0), null);
  const [b, m] = tok.split('.');
  const forged = Buffer.from(JSON.stringify({ sid: 'cs_1', exp: T0 + 10 * DAY_MS })).toString('base64url') + '.' + m;
  assert.equal(verify(forged, ENV.UNLOCK_SECRET, T0), null, 'payload modifié');
  assert.equal(verify('n.importe.quoi', ENV.UNLOCK_SECRET, T0), null);
  assert.equal(verify(undefined, ENV.UNLOCK_SECRET, T0), null);
});

test('activation : gratuit tant que les variables manquent ou si PAYWALL=0', () => {
  assert.equal(enabled({}), false);
  assert.equal(enabled({ STRIPE_SECRET_KEY: 'k', PRICE_STANDARD: 'p' }), false);
  assert.equal(enabled(ENV), true);
  assert.equal(enabled(Object.assign({}, ENV, { PAYWALL: '0' })), false);
});

test('prix : lancement avant LAUNCH_END, normal après, normal sans offre', () => {
  assert.equal(pickTier(ENV, Date.parse('2026-12-31T23:59:58+04:00')).tier, 'launch');
  assert.equal(pickTier(ENV, Date.parse('2026-12-31T23:59:59+04:00')).tier, 'standard');
  assert.equal(pickTier(ENV, Date.parse('2027-02-01T00:00:00Z')).price, 'price_std');
  assert.equal(pickTier({ PRICE_STANDARD: 'price_std' }, T0).tier, 'standard');
  assert.equal(pickTier(Object.assign({}, ENV, { LAUNCH_END: 'pas une date' }), T0).tier, 'standard');
});

test('origine : domaines autorisés seulement', () => {
  assert.equal(originFrom({ headers: { host: 'www.cartedepoche.fr' } }, {}), 'https://www.cartedepoche.fr');
  assert.equal(originFrom({ headers: { host: 'carte-de-poche-abc-greg.vercel.app' } }, {}), 'https://carte-de-poche-abc-greg.vercel.app');
  assert.equal(originFrom({ headers: { host: 'evil.com' } }, {}), null);
  assert.equal(originFrom({ headers: { host: 'cartedepoche.fr.evil.com' } }, {}), null);
  assert.equal(originFrom({ headers: { host: 'localhost:3000' } }, {}), null);
  assert.equal(originFrom({ headers: { host: 'localhost:3000' } }, { ALLOW_LOCAL: '1' }), 'http://localhost:3000');
});

test('/api/pricing : désactivé sans config, prix lancement + suivant, prix normal', async () => {
  let r = mockRes(); await handlers({ env: {}, now: () => T0 }).pricing({ method: 'GET' }, r);
  assert.deepEqual(r.body, { enabled: false });
  r = mockRes(); await handlers({ env: ENV, fetch: stripeMock({}, PRICES), now: () => T0 }).pricing({ method: 'GET' }, r);
  assert.deepEqual(r.body, { enabled: true, tier: 'launch', amount: 1, currency: 'eur', hours: 24, launchEnd: ENV.LAUNCH_END, nextAmount: 5 });
  r = mockRes(); await handlers({ env: ENV, fetch: stripeMock({}, PRICES), now: () => Date.parse('2027-01-05T00:00:00Z') }).pricing({ method: 'GET' }, r);
  assert.deepEqual(r.body, { enabled: true, tier: 'standard', amount: 5, currency: 'eur', hours: 24 });
  r = mockRes(); await handlers({ env: ENV, fetch: stripeMock({}, {}), now: () => T0 }).pricing({ method: 'GET' }, r);
  assert.deepEqual(r.body, { enabled: false }, 'erreur Stripe : on ne bloque pas le site');
});

test('/api/checkout : exige le consentement, bon prix, bonnes URLs, métadonnées, session 30 min', async () => {
  const f = stripeMock({}, PRICES);
  const h = handlers({ env: ENV, fetch: f, now: () => T0 });
  const req = (body, host) => ({ method: 'POST', headers: { host: host || 'www.cartedepoche.fr' }, body });
  let r = mockRes(); await h.checkout(req({ lang: 'fr' }), r);
  assert.equal(r.statusCode, 400); assert.equal(r.body.error, 'consent_required');
  r = mockRes(); await h.checkout(req({ consent: true }, 'evil.com'), r);
  assert.equal(r.statusCode, 400); assert.equal(r.body.error, 'bad_host');
  r = mockRes(); await h.checkout(req({ consent: true, tier: 'standard' }), r);
  assert.equal(r.statusCode, 409); assert.equal(r.body.error, 'price_changed');
  r = mockRes(); await h.checkout(req({ consent: true, tier: 'launch', lang: 'en' }), r);
  assert.equal(r.statusCode, 200); assert.match(r.body.url, /^https:\/\/checkout\.stripe\.com\//);
  const post = f.calls.find((c) => c.init.method === 'POST');
  const form = new URLSearchParams(post.init.body);
  assert.equal(form.get('line_items[0][price]'), 'price_launch');
  assert.equal(form.get('mode'), 'payment');
  assert.equal(form.get('success_url'), 'https://www.cartedepoche.fr/app/?paid={CHECKOUT_SESSION_ID}');
  assert.equal(form.get('cancel_url'), 'https://www.cartedepoche.fr/app/?canceled=1');
  assert.equal(form.get('locale'), 'en');
  assert.equal(form.get('metadata[product]'), 'carte-de-poche');
  assert.equal(form.get('metadata[cgv_consent]'), '1');
  assert.equal(Number(form.get('expires_at')), Math.floor(T0 / 1000) + 1800);
  assert.equal(post.init.headers.Authorization, 'Bearer rk_test_x');
  assert.ok(![...form.keys()].some((k) => /card|name|email|phone|logo/i.test(k) && !/payment_intent|metadata\[cgv/.test(k)), 'aucune donnée de carte de visite envoyée');
  r = mockRes(); await handlers({ env: {}, now: () => T0 }).checkout(req({ consent: true }), r);
  assert.equal(r.statusCode, 404, 'désactivé');
});

test('/api/unlock : session payée => jeton 24 h ancré sur la création, refus sinon', async () => {
  const sessions = {
    cs_test_PAID123456: paidSession(),
    cs_test_UNPAID1234: paidSession({ id: 'cs_test_UNPAID1234', payment_status: 'unpaid' }),
    cs_test_OTHERPROD12: paidSession({ id: 'cs_test_OTHERPROD12', metadata: { product: 'autre' } }),
    cs_test_OLD1234567: paidSession({ id: 'cs_test_OLD1234567', created: Math.floor(T0 / 1000) - 25 * 3600 })
  };
  const h = handlers({ env: ENV, fetch: stripeMock(sessions, PRICES), now: () => T0 });
  const get = (id) => ({ method: 'GET', query: { session_id: id } });
  let r = mockRes(); await h.unlock(get('cs_test_PAID123456'), r);
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.exp, (Math.floor(T0 / 1000) - 60) * 1000 + DAY_MS);
  assert.ok(verify(r.body.token, ENV.UNLOCK_SECRET, T0));
  assert.equal(verify(r.body.token, ENV.UNLOCK_SECRET, r.body.exp + 1), null, 'expire après 24 h');
  r = mockRes(); await h.unlock(get('cs_test_UNPAID1234'), r); assert.equal(r.statusCode, 402);
  r = mockRes(); await h.unlock(get('cs_test_OTHERPROD12'), r); assert.equal(r.statusCode, 402);
  r = mockRes(); await h.unlock(get('cs_test_OLD1234567'), r); assert.equal(r.statusCode, 410);
  r = mockRes(); await h.unlock(get('cs_test_MISSING12345'), r); assert.equal(r.statusCode, 404);
  r = mockRes(); await h.unlock(get('../../etc/passwd'), r); assert.equal(r.statusCode, 400);
  r = mockRes(); await h.unlock(get(undefined), r); assert.equal(r.statusCode, 400);
});

test('/api/verify : jeton valide, expiré, falsifié, et mode gratuit', async () => {
  const live = handlers({ env: ENV, now: () => T0 });
  const tok = sign({ sid: 'cs_1', exp: T0 + 5000 }, ENV.UNLOCK_SECRET);
  let r = mockRes(); await live.verify({ method: 'POST', body: { token: tok } }, r);
  assert.equal(r.statusCode, 200); assert.equal(r.body.ok, true);
  r = mockRes(); await handlers({ env: ENV, now: () => T0 + 6000 }).verify({ method: 'POST', body: { token: tok } }, r);
  assert.equal(r.statusCode, 401);
  r = mockRes(); await live.verify({ method: 'POST', body: JSON.stringify({ token: tok + 'x' }) }, r);
  assert.equal(r.statusCode, 401);
  r = mockRes(); await live.verify({ method: 'GET' }, r); assert.equal(r.statusCode, 405);
  r = mockRes(); await handlers({ env: {}, now: () => T0 }).verify({ method: 'POST', body: {} }, r);
  assert.equal(r.body.free, true);
});
