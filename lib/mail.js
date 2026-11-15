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
    hello: 'Bonjour,', title: 'Merci, ton accès est activé', pre: 'Ta commande est confirmée. Tes téléchargements sont débloqués pendant 24 heures.', cta: 'Ouvrir ma carte de poche', until24: 'Accès débloqué jusqu’au',
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
    hello: 'Hello,', title: 'Thank you, your access is active', pre: 'Your order is confirmed. Your downloads are unlocked for 24 hours.', cta: 'Open my pocket card', until24: 'Access unlocked until',
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

  const text = [L.hello, '', L.intro, '', ...rows.map((r) => r[0] + ' : ' + r[1]), '', L.cta + ' : ' + site + '/app/', '',
    L.consentTitle.toUpperCase(), consent, '', help, L.receipt, '', seller, privacy].join('\n');

  const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+?)([.,]?)(?=\s|$|<)/g, '<a href="$1" style="color:#1a5c7a">$1</a>$2');
  const appUrl = site + '/app/';
  const FONT = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;";
  const priceMain = money(session.amount_total, session.currency, L.locale);
  const badge = md.tier === 'launch'
    ? '<span style="display:inline-block;margin-left:8px;padding:3px 9px;border-radius:999px;background:#fdeee8;color:#c2410c;font-size:12px;font-weight:700;vertical-align:middle">' + esc(L.launch.trim().replace(/^\(|\)$/g, '')) + '</span>'
    : '';
  const detailRows = rows.filter((r) => r[0] !== L.price && r[0] !== L.until);
  const html = '<!doctype html><html lang="' + lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + esc(L.subject) + '</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f4f1;' + FONT + 'color:#15171b;-webkit-text-size-adjust:100%">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f4f1">' + esc(L.pre) + '</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f1"><tr><td align="center" style="padding:28px 14px">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dbdbd4;border-radius:16px;overflow:hidden">'
    // bandeau marque
    + '<tr><td style="background:#1a5c7a;padding:22px 28px">'
    + '<span style="display:inline-block;width:26px;height:18px;border-radius:4px;background:#ffffff;vertical-align:middle;margin-right:10px;border-bottom:4px solid #e8572a"></span>'
    + '<span style="' + FONT + 'font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.01em;vertical-align:middle">carte de poche</span>'
    + '</td></tr>'
    // titre
    + '<tr><td style="padding:30px 28px 6px">'
    + '<p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#e8572a">✓ ' + esc(lang === 'fr' ? 'Commande confirmée' : 'Order confirmed') + '</p>'
    + '<h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:700;color:#15171b">' + esc(L.title) + '</h1>'
    + '<p style="margin:0;font-size:16px;line-height:1.55;color:#3a3f46">' + esc(L.hello) + '<br>' + esc(L.intro) + '</p>'
    + '</td></tr>'
    // prix + accès
    + '<tr><td style="padding:20px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f4;border:1px solid #eceae4;border-radius:12px"><tr>'
    + '<td style="padding:16px 18px;vertical-align:top;width:50%"><p style="margin:0 0 4px;font-size:12px;color:#5f646c;text-transform:uppercase;letter-spacing:.06em">' + esc(L.price) + '</p>'
    + '<p style="margin:0;font-size:24px;font-weight:800;color:#15171b">' + esc(priceMain) + '<span style="font-size:13px;font-weight:600;color:#5f646c"> ' + esc(L.tax.trim()) + '</span></p>' + (badge ? '<p style="margin:6px 0 0">' + badge + '</p>' : '') + '</td>'
    + '<td style="padding:16px 18px;vertical-align:top;border-left:1px solid #eceae4"><p style="margin:0 0 4px;font-size:12px;color:#5f646c;text-transform:uppercase;letter-spacing:.06em">' + esc(L.until24) + '</p>'
    + '<p style="margin:0;font-size:16px;font-weight:700;color:#15171b;line-height:1.35">' + esc(when(created + DAY_MS, L.locale)) + '</p>'
    + '<p style="margin:2px 0 0;font-size:12px;color:#5f646c">' + esc(L.tz) + '</p></td>'
    + '</tr></table></td></tr>'
    // bouton
    + '<tr><td align="center" style="padding:22px 28px 8px">'
    + '<a href="' + esc(appUrl) + '" style="display:inline-block;background:#e8572a;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 30px;border-radius:12px;border-bottom:3px solid #b8421c">' + esc(L.cta) + ' →</a>'
    + '</td></tr>'
    // détails
    + '<tr><td style="padding:18px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
    + detailRows.map((r) => '<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #eceae4;font-size:14px;color:#5f646c;vertical-align:top;width:34%">' + esc(r[0]) + '</td><td style="padding:8px 0;border-top:1px solid #eceae4;font-size:14px;font-weight:600;color:#15171b;vertical-align:top">' + esc(r[1]) + '</td></tr>').join('')
    + '</table></td></tr>'
    // accord
    + '<tr><td style="padding:18px 28px 4px"><div style="background:#fff8f4;border-left:4px solid #e8572a;border-radius:6px;padding:12px 14px">'
    + '<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#15171b">' + esc(L.consentTitle) + '</p>'
    + '<p style="margin:0;font-size:13px;line-height:1.5;color:#3a3f46">' + linkify(consent) + '</p></div></td></tr>'
    // aide
    + '<tr><td style="padding:16px 28px 22px"><p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#3a3f46">' + esc(help) + '</p>'
    + '<p style="margin:0;font-size:14px;line-height:1.5;color:#3a3f46">' + esc(L.receipt) + '</p></td></tr>'
    // pied
    + '<tr><td style="background:#f7f7f4;border-top:1px solid #eceae4;padding:16px 28px">'
    + '<p style="margin:0 0 8px;font-size:11px;line-height:1.5;color:#7a7f87">' + esc(seller) + '</p>'
    + '<p style="margin:0;font-size:11px;line-height:1.5;color:#7a7f87">' + linkify(privacy) + '</p></td></tr>'
    + '</table></td></tr></table></body></html>';

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
