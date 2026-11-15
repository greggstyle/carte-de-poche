'use strict';
/* Webhook Stripe : confirme un achat par email. Signature vérifiée, aucune donnée conservée. */
const crypto = require('crypto');
const { PRODUCT } = require('./paywall');
const { buildEmail, sendEmail } = require('./mail');

const TOLERANCE_S = 300;

function verifySignature(rawBody, header, secret, nowMs, toleranceS) {
  if (!header || !secret || typeof rawBody !== 'string') return false;
  const parts = String(header).split(',').map((s) => s.trim());
  const t = (parts.find((p) => p.startsWith('t=')) || '').slice(2);
  const sigs = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const ts = Number(t);
  if (!ts || !sigs.length) return false;
  if (Math.abs(nowMs / 1000 - ts) > (toleranceS || TOLERANCE_S)) return false;
  const expected = crypto.createHmac('sha256', secret).update(t + '.' + rawBody).digest('hex');
  const eb = Buffer.from(expected);
  return sigs.some((s) => { const sb = Buffer.from(s); return sb.length === eb.length && crypto.timingSafeEqual(sb, eb); });
}

async function readRaw(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (req.body !== undefined && req.body !== null && typeof req.on !== 'function') return null; // corps déjà analysé : signature impossible
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

function handler(opts) {
  opts = opts || {};
  const env = opts.env || process.env;
  const fetchFn = opts.fetch || globalThis.fetch;
  const now = opts.now || (() => Date.now());
  const reply = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  return async function webhook(req, res) {
    if (req.method !== 'POST') return reply(res, 405, { error: 'method' });
    if (!env.STRIPE_WEBHOOK_SECRET || !env.RESEND_API_KEY || !env.MAIL_FROM) return reply(res, 503, { error: 'disabled' });
    const raw = await readRaw(req);
    if (raw === null) { console.error('webhook: corps brut indisponible (bodyParser actif ?)'); return reply(res, 400, { error: 'raw_body' }); }
    const sig = req.headers && req.headers['stripe-signature'];
    if (!verifySignature(raw, sig, env.STRIPE_WEBHOOK_SECRET, now())) return reply(res, 400, { error: 'bad_signature' });
    let event;
    try { event = JSON.parse(raw); } catch (e) { return reply(res, 400, { error: 'bad_json' }); }
    const type = event && event.type;
    if (type !== 'checkout.session.completed' && type !== 'checkout.session.async_payment_succeeded') return reply(res, 200, { ignored: type || 'unknown' });
    const s = event.data && event.data.object;
    if (!s || s.payment_status !== 'paid' || !s.metadata || s.metadata.product !== PRODUCT) return reply(res, 200, { ignored: 'not_a_paid_card_session' });
    const mail = buildEmail(s, env);
    if (!mail.to) return reply(res, 200, { ignored: 'no_email' });
    try {
      await sendEmail(env, fetchFn, mail, 'confirm-' + s.id);
      return reply(res, 200, { sent: true });
    } catch (e) {
      console.error('webhook email', e.message);
      return reply(res, 500, { error: 'email_failed' });
    }
  };
}

module.exports = { handler, verifySignature, readRaw, TOLERANCE_S };
