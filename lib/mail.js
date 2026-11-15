'use strict';
/* Email de confirmation de commande (contenu numérique) envoyé via Resend.
   Aucune base de données : l'adresse du client n'est jamais conservée par nous. */
const { DAY_MS, CGV_VERSION } = require('./paywall');

const SELLER_LINE = {
  fr: 'Vendeur : DigiDataLe, SAS au capital de 3 000 €, 55 chemin Fernand Collardeau, Ravine des Cabris, 97432 Saint-Pierre, La Réunion, SIREN 928 068 360, RCS Saint-Pierre de la Réunion, TVA intracommunautaire FR27928068360.',
  en: 'Seller: DigiDataLe, SAS with a share capital of €3,000, 55 chemin Fernand Collardeau, Ravine des Cabris, 97432 Saint-Pierre, La Réunion, France, SIREN 928 068 360, RCS Saint-Pierre de la Réunion, EU VAT FR27928068360.'
};

const T = {
  fr: {
    locale: 'fr-FR',
    subject: 'Carte de poche : confirmation de ton achat',
    hello: 'Bonjour,',
    intro: 'Merci pour ton achat. Voici la confirmation de ta commande, à conserver.',
    service: 'Service', serviceValue: 'accès de 24 heures aux téléchargements de Carte de poche (PNG, PDF imprimeur, partage)',
    price: 'Prix payé', tax: ' TTC', launch: ' (prix de lancement)', vat: 'dont TVA {rate} %', vatValue: '{vat} (prix HT : {ht})',
    paid: 'Payé le', until: 'Accès valable jusqu’au', ref: 'Référence', tz: 'heure de La Réunion',
    consentTitle: 'Ton accord',
    consent: 'Avant de payer, tu as demandé l’accès immédiat à ce service numérique et tu as reconnu que tu perds ton droit de rétractation de 14 jours dès que l’accès t’est fourni (code de la consommation, article L221-28). Conditions générales de vente acceptées : version {v}, {cgv}',
    help: 'Un souci ? Réponds à cet email ou écris à {reply}. Si le service ne fonctionne pas comme annoncé, l’article 6 des CGV prévoit un remboursement.',
    receipt: 'Stripe t’envoie aussi son propre reçu de paiement.',
    privacy: 'Ton adresse e-mail sert uniquement à t’envoyer cette confirmation ; nous ne la conservons pas. Détails : {ml}'
  },
  en: {
    locale: 'en-GB',
    subject: 'Carte de poche: confirmation of your purchase',
    hello: 'Hello,',
    intro: 'Thank you for your purchase. Here is the confirmation of your order, please keep it.',
    service: 'Service', serviceValue: '24-hour access to Carte de poche downloads (PNG, print PDF, sharing)',
    price: 'Price paid', tax: ' incl. tax', launch: ' (launch price)', vat: 'of which VAT {rate}%', vatValue: '{vat} (price excl. VAT: {ht})',
    paid: 'Paid on', until: 'Access valid until', ref: 'Reference', tz: 'La Réunion time',
    consentTitle: 'Your agreement',
    consent: 'Before paying, you asked for immediate access to this digital service and acknowledged that you lose your 14-day right of withdrawal as soon as access is provided (French Consumer Code, article L221-28). Terms of sale accepted: version {v}, {cgv}',
    help: 'Any problem? Reply to this email or write to {reply}. If the service does not work as announced, article 6 of the terms provides a refund.',
    receipt: 'Stripe also sends you its own payment receipt.',
    privacy: 'Your email address is used only to send you this confirmation; we do not keep it. Details: {ml}'
  }
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fill(s, v) { return s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); }
function money(cents, currency, locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: String(currency || 'eur').toUpperCase() }).format(cents / 100);
}
function when(ms, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: 'Indian/Reunion' }).format(new Date(ms));
}

/* session : objet Checkout Session renvoyé par Stripe. Renvoie { to, subject, text, html }. */
function buildEmail(session, env) {
  env = env || {};
  const md = session.metadata || {};
  const lang = md.lang === 'en' ? 'en' : 'fr';
  const L = T[lang];
  const site = String(env.SITE_URL || 'https://www.cartedepoche.fr').replace(/\/+$/, '');
  const reply = env.MAIL_REPLY_TO_ADDRESS || extractAddress(env.MAIL_REPLY_TO) || 'bonjour@cartedepoche.fr';
  const created = session.created * 1000;
  const rate = Number(env.VAT_RATE);
  const vatRows = [];
  if (rate > 0 && session.amount_total > 0) {
    const vat = Math.round(session.amount_total - session.amount_total / (1 + rate / 100));
    vatRows.push([
      fill(L.vat, { rate: new Intl.NumberFormat(L.locale, { maximumFractionDigits: 2 }).format(rate) }),
      fill(L.vatValue, { vat: money(vat, session.currency, L.locale), ht: money(session.amount_total - vat, session.currency, L.locale) })
    ]);
  }
  const rows = [
    [L.service, L.serviceValue],
    [L.price, money(session.amount_total, session.currency, L.locale) + L.tax + (md.tier === 'launch' ? L.launch : '')],
    ...vatRows,
    [L.paid, when(created, L.locale) + ' (' + L.tz + ')'],
    [L.until, when(created + DAY_MS, L.locale) + ' (' + L.tz + ')'],
    [L.ref, String(session.id || '').slice(-8).toUpperCase()]
  ];
  const cgvUrl = site + '/cgv';
  const consent = fill(L.consent, { v: md.cgv_version || CGV_VERSION, cgv: cgvUrl });
  const help = fill(L.help, { reply });
  const privacy = fill(L.privacy, { ml: site + '/mentions-legales' });
  const seller = SELLER_LINE[lang];

  const text = [L.hello, '', L.intro, '', ...rows.map((r) => r[0] + ' : ' + r[1]), '',
    L.consentTitle.toUpperCase(), consent, '', help, L.receipt, '', seller, privacy].join('\n');

  const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+?)([.,]?)(?=\s|$|<)/g, '<a href="$1">$1</a>$2');
  const html = '<!doctype html><html lang="' + lang + '"><body style="margin:0;background:#f4f4f1;font-family:Arial,Helvetica,sans-serif;color:#15171b">'
    + '<div style="max-width:560px;margin:0 auto;padding:24px 20px">'
    + '<p style="font-size:20px;font-weight:700;margin:0 0 16px">carte de poche</p>'
    + '<p>' + esc(L.hello) + '</p><p>' + esc(L.intro) + '</p>'
    + '<table style="border-collapse:collapse;width:100%;margin:16px 0">'
    + rows.map((r) => '<tr><td style="padding:6px 10px 6px 0;color:#5f646c;vertical-align:top;width:34%">' + esc(r[0]) + '</td><td style="padding:6px 0;font-weight:600">' + esc(r[1]) + '</td></tr>').join('')
    + '</table>'
    + '<p style="font-weight:700;margin:20px 0 4px">' + esc(L.consentTitle) + '</p>'
    + '<p style="margin:0 0 16px">' + linkify(consent) + '</p>'
    + '<p>' + esc(help) + '</p><p>' + esc(L.receipt) + '</p>'
    + '<hr style="border:0;border-top:1px solid #dbdbd4;margin:20px 0">'
    + '<p style="font-size:12px;color:#5f646c">' + esc(seller) + '</p>'
    + '<p style="font-size:12px;color:#5f646c">' + linkify(privacy) + '</p>'
    + '</div></body></html>';

  const to = (session.customer_details && session.customer_details.email) || undefined;
  return { to, subject: L.subject, text, html };
}

function extractAddress(from) {
  const m = String(from || '').match(/<([^>]+)>/);
  return m ? m[1] : (/@/.test(String(from || '')) ? String(from).trim() : '');
}

async function sendEmail(env, fetchFn, mail, idempotencyKey) {
  const base = env.RESEND_API_BASE || 'https://api.resend.com';
  const body = { from: env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html };
  if (env.MAIL_REPLY_TO) body.reply_to = env.MAIL_REPLY_TO;
  const res = await fetchFn(base + '/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const e = new Error('resend_error_' + res.status);
    e.status = res.status;
    throw e;
  }
  return true;
}

module.exports = { buildEmail, sendEmail, esc };
