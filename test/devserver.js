'use strict';
/* Serveur de test local : sert le site et branche les VRAIS gestionnaires /api/*,
   contre un faux Stripe et un faux Resend. Usage : node test/devserver.js [port]
   Sert aussi /__mock/emails (emails « envoyés ») et /__mock/reset. Ne sert à rien en production. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.argv[2] || process.env.PORT || 8790);
const ROOT = path.join(__dirname, '..');
const BASE = 'http://localhost:' + PORT;
const WHSEC = 'whsec_mock';

Object.assign(process.env, {
  STRIPE_SECRET_KEY: 'rk_test_mock', PRICE_STANDARD: 'price_std', PRICE_LAUNCH: 'price_launch',
  UNLOCK_SECRET: 'dev-unlock-secret-dev-unlock-secret',
  LAUNCH_END: process.env.LAUNCH_END || new Date(Date.now() + 30 * 86400e3).toISOString(),
  STRIPE_WEBHOOK_SECRET: WHSEC, RESEND_API_KEY: 're_mock', MAIL_FROM: 'Carte de poche <bonjour@cartedepoche.fr>',
  MAIL_REPLY_TO: 'bonjour@cartedepoche.fr', ALLOW_LOCAL: '1',
  STRIPE_API_BASE: BASE + '/__stripe/v1', RESEND_API_BASE: BASE + '/__resend'
});
if (process.env.DEV_PAYWALL === '0') process.env.PAYWALL = '0';

const handlers = {
  pricing: require('../api/pricing.js'), checkout: require('../api/checkout.js'),
  unlock: require('../api/unlock.js'), verify: require('../api/verify.js'), webhook: require('../api/webhook.js')
};

const PRICES = { price_std: 499, price_launch: 199 };
const sessions = {};
let emails = [];
let counter = 0;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
function readRaw(req) { return new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c).toString('utf8'))); }); }

async function deliverWebhook(s) {
  const raw = JSON.stringify({ id: 'evt_' + s.id, type: 'checkout.session.completed', data: { object: s } });
  const t = Math.floor(Date.now() / 1000);
  const sig = 't=' + t + ',v1=' + crypto.createHmac('sha256', WHSEC).update(t + '.' + raw).digest('hex');
  await fetch(BASE + '/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': sig }, body: raw });
}

async function mock(req, res, url) {
  const p = url.pathname;
  if (p === '/__mock/emails') return json(res, 200, emails);
  if (p === '/__mock/reset') { emails = []; Object.keys(sessions).forEach((k) => delete sessions[k]); return json(res, 200, { ok: true }); }
  /* faux Stripe */
  let m;
  if ((m = p.match(/^\/__stripe\/v1\/prices\/(\w+)$/))) return PRICES[m[1]] ? json(res, 200, { unit_amount: PRICES[m[1]], currency: 'eur' }) : json(res, 404, { error: { message: 'no price' } });
  if (p === '/__stripe/v1/checkout/sessions' && req.method === 'POST') {
    const f = new URLSearchParams(await readRaw(req));
    const id = 'cs_test_MOCK' + String(++counter).padStart(8, '0') + 'ABCDEF';
    const priceId = f.get('line_items[0][price]');
    const md = {}; f.forEach((v, k) => { const mm = k.match(/^metadata\[(\w+)\]$/); if (mm) md[mm[1]] = v; });
    sessions[id] = { id, object: 'checkout.session', mode: 'payment', status: 'open', payment_status: 'unpaid', created: Math.floor(Date.now() / 1000),
      amount_total: PRICES[priceId], currency: 'eur', metadata: md, success_url: f.get('success_url'), cancel_url: f.get('cancel_url'),
      customer_details: { email: 'client@example.com' }, url: BASE + '/__stripe/pay/' + id };
    return json(res, 200, sessions[id]);
  }
  if ((m = p.match(/^\/__stripe\/v1\/checkout\/sessions\/(\w+)$/))) return sessions[m[1]] ? json(res, 200, sessions[m[1]]) : json(res, 404, { error: { message: 'no session' } });
  if ((m = p.match(/^\/__stripe\/pay\/(\w+)$/))) {
    const s = sessions[m[1]]; if (!s) return json(res, 404, {});
    if (url.searchParams.get('cancel')) { res.writeHead(302, { Location: s.cancel_url }); return res.end(); }
    s.status = 'complete'; s.payment_status = 'paid';
    await deliverWebhook(s);
    res.writeHead(302, { Location: s.success_url.replace('{CHECKOUT_SESSION_ID}', s.id) }); return res.end();
  }
  /* faux Resend */
  if (p === '/__resend/emails' && req.method === 'POST') {
    const body = JSON.parse(await readRaw(req));
    emails.push({ headers: { auth: req.headers.authorization, idem: req.headers['idempotency-key'] }, body });
    return json(res, 200, { id: 'em_' + emails.length });
  }
  return json(res, 404, { error: 'mock' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  try {
    if (url.pathname.startsWith('/__')) return await mock(req, res, url);
    const m = url.pathname.match(/^\/api\/(pricing|checkout|unlock|verify|webhook)$/);
    if (m) {
      req.query = Object.fromEntries(url.searchParams);
      if (m[1] === 'webhook') req.rawBody = await readRaw(req);
      else { const raw = await readRaw(req); try { req.body = raw ? JSON.parse(raw) : undefined; } catch (e) { req.body = undefined; } }
      return await handlers[m[1]](req, res);
    }
    let f = url.pathname;
    if (f === '/') f = '/index.html'; else if (f.endsWith('/')) f += 'index.html';
    else if (!path.extname(f)) f = fs.existsSync(path.join(ROOT, f + '.html')) ? f + '.html' : f + '/index.html';
    const file = path.join(ROOT, path.normalize(f));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); res.writeHead(500); res.end('error'); }
});
server.listen(PORT, () => console.log('devserver on ' + BASE));
