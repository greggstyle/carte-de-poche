'use strict';
/* Carte de poche : logique de paiement (Stripe Checkout) et jeton d'accès 24 h.
   Aucune dépendance : fetch + crypto. Ce module ne reçoit JAMAIS le contenu d'une carte. */
const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;
const PRODUCT = 'carte-de-poche';
const CGV_VERSION = '2026-11-15';
const SESSION_TTL_S = 30 * 60; // la session de paiement expire après 30 min, donc created ≈ date du paiement

/* ---------- jeton signé (HMAC-SHA256) ---------- */
function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + mac;
}
function verify(token, secret, nowMs) {
  if (typeof token !== 'string' || token.length > 2000 || !secret) return null;
  const i = token.indexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i), mac = token.slice(i + 1);
  const good = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!p || typeof p.exp !== 'number' || p.exp <= nowMs) return null;
  return p;
}

/* ---------- configuration ---------- */
function enabled(env) {
  return !!(env.STRIPE_SECRET_KEY && env.PRICE_STANDARD && env.UNLOCK_SECRET) && env.PAYWALL !== '0';
}
function pickTier(env, nowMs) {
  const end = Date.parse(env.LAUNCH_END || '');
  if (env.PRICE_LAUNCH && !isNaN(end) && nowMs < end) return { tier: 'launch', price: env.PRICE_LAUNCH };
  return { tier: 'standard', price: env.PRICE_STANDARD };
}
function originFrom(req, env) {
  const raw = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').split(',')[0].trim().toLowerCase();
  const ok = /^(www\.)?cartedepoche\.fr$/.test(raw) || /^[a-z0-9-]+\.vercel\.app$/.test(raw);
  if (ok) return 'https://' + raw;
  if (env.ALLOW_LOCAL === '1' && /^(localhost|127\.0\.0\.1):\d+$/.test(raw)) return 'http://' + raw;
  return null;
}

/* ---------- appel Stripe ---------- */
async function stripeCall(env, fetchFn, method, path, form) {
  const base = env.STRIPE_API_BASE || 'https://api.stripe.com/v1';
  const res = await fetchFn(base + path, {
    method,
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  const json = await res.json();
  if (!res.ok) {
    const e = new Error((json && json.error && json.error.message) || 'stripe_error');
    e.status = res.status;
    throw e;
  }
  return json;
}

/* ---------- gestionnaires HTTP ---------- */
function handlers(opts) {
  opts = opts || {};
  const env = opts.env || process.env;
  const fetchFn = opts.fetch || globalThis.fetch;
  const now = opts.now || (() => Date.now());

  function reply(res, status, body, cache) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', cache || 'no-store');
    res.end(JSON.stringify(body));
  }
  function readBody(req) {
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
    return b && typeof b === 'object' ? b : {};
  }
  async function price(id) {
    const p = await stripeCall(env, fetchFn, 'GET', '/prices/' + encodeURIComponent(id));
    return { amount: p.unit_amount / 100, currency: p.currency };
  }

  async function pricing(req, res) {
    if (req.method !== 'GET') return reply(res, 405, { error: 'method' });
    if (!enabled(env)) return reply(res, 200, { enabled: false });
    try {
      const pick = pickTier(env, now());
      const cur = await price(pick.price);
      const out = { enabled: true, tier: pick.tier, amount: cur.amount, currency: cur.currency, hours: 24 };
      if (pick.tier === 'launch') {
        out.launchEnd = env.LAUNCH_END;
        out.nextAmount = (await price(env.PRICE_STANDARD)).amount;
      }
      return reply(res, 200, out, 'public, s-maxage=60, stale-while-revalidate=120');
    } catch (e) {
      console.error('pricing', e.message);
      return reply(res, 200, { enabled: false });
    }
  }

  async function checkout(req, res) {
    if (req.method !== 'POST') return reply(res, 405, { error: 'method' });
    if (!enabled(env)) return reply(res, 404, { error: 'disabled' });
    const body = readBody(req);
    if (body.consent !== true) return reply(res, 400, { error: 'consent_required' });
    const origin = originFrom(req, env);
    if (!origin) return reply(res, 400, { error: 'bad_host' });
    const pick = pickTier(env, now());
    if (body.tier && body.tier !== pick.tier) return reply(res, 409, { error: 'price_changed' });
    const lang = body.lang === 'en' ? 'en' : 'fr';
    try {
      const s = await stripeCall(env, fetchFn, 'POST', '/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price]': pick.price,
        'line_items[0][quantity]': '1',
        success_url: origin + '/app/?paid={CHECKOUT_SESSION_ID}',
        cancel_url: origin + '/app/?canceled=1',
        locale: lang,
        expires_at: String(Math.floor(now() / 1000) + SESSION_TTL_S),
        'metadata[product]': PRODUCT,
        'metadata[tier]': pick.tier,
        'metadata[lang]': lang,
        'metadata[cgv_version]': CGV_VERSION,
        'metadata[cgv_consent]': '1',
        'payment_intent_data[description]': 'Carte de poche : téléchargements 24 h',
        'custom_text[submit][message]': lang === 'en'
          ? 'Instant access to a digital service: you waive your right of withdrawal once access is provided. Terms: ' + origin + '/cgv'
          : 'Accès immédiat à un service numérique : tu renonces à ton droit de rétractation dès que l’accès est fourni. CGV : ' + origin + '/cgv'
      });
      return reply(res, 200, { url: s.url });
    } catch (e) {
      console.error('checkout', e.message);
      return reply(res, 502, { error: 'checkout_failed' });
    }
  }

  async function unlock(req, res) {
    if (req.method !== 'GET') return reply(res, 405, { error: 'method' });
    if (!enabled(env)) return reply(res, 404, { error: 'disabled' });
    const id = String((req.query && req.query.session_id) || '');
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return reply(res, 400, { error: 'bad_session' });
    try {
      const s = await stripeCall(env, fetchFn, 'GET', '/checkout/sessions/' + id);
      const paid = s.status === 'complete' && s.payment_status === 'paid' && s.mode === 'payment'
        && s.metadata && s.metadata.product === PRODUCT;
      if (!paid) return reply(res, 402, { error: 'not_paid' });
      const exp = s.created * 1000 + DAY_MS;
      if (exp <= now()) return reply(res, 410, { error: 'expired' });
      return reply(res, 200, { token: sign({ sid: s.id, exp }, env.UNLOCK_SECRET), exp, tier: s.metadata.tier || 'standard' });
    } catch (e) {
      console.error('unlock', e.message);
      return reply(res, e.status === 404 ? 404 : 502, { error: 'unlock_failed' });
    }
  }

  async function verifyHandler(req, res) {
    if (req.method !== 'POST') return reply(res, 405, { error: 'method' });
    if (!enabled(env)) return reply(res, 200, { ok: true, free: true });
    const p = verify(readBody(req).token, env.UNLOCK_SECRET, now());
    if (!p) return reply(res, 401, { ok: false });
    return reply(res, 200, { ok: true, exp: p.exp });
  }

  return { pricing, checkout, unlock, verify: verifyHandler };
}

module.exports = { handlers, sign, verify, enabled, pickTier, originFrom, stripeCall, DAY_MS, PRODUCT, CGV_VERSION, SESSION_TTL_S };
