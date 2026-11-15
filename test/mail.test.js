'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEmail, sendEmail, esc } = require('../lib/mail');

const CREATED = Math.floor(Date.parse('2026-12-01T06:30:00Z') / 1000); // 10:30 à La Réunion (UTC+4)
const session = (over) => Object.assign({
  id: 'cs_live_a1b2c3d4e5f6ABCD1234', created: CREATED, amount_total: 199, currency: 'eur',
  customer_details: { email: 'client@example.com' },
  metadata: { product: 'carte-de-poche', tier: 'launch', lang: 'fr', cgv_version: '2026-11-15' }
}, over);
const ENV = { VAT_RATE: '8.5', MAIL_FROM: 'Carte de poche <bonjour@cartedepoche.fr>', MAIL_REPLY_TO: 'bonjour@cartedepoche.fr', RESEND_API_KEY: 're_x' };

test('email FR : contenu légal complet', () => {
  const m = buildEmail(session(), ENV);
  assert.equal(m.to, 'client@example.com');
  assert.equal(m.subject, 'Carte de poche : confirmation de ton achat');
  for (const part of [
    '1,99', 'TTC', 'prix de lancement', 'accès de 24 heures', '1 décembre 2026', '10:30', '2 décembre 2026',
    'heure de La Réunion', 'droit de rétractation', 'L221-28', 'version 2026-11-15', 'https://www.cartedepoche.fr/cgv',
    'DigiDataLe', '928 068 360', 'FR27928068360', 'Saint-Pierre', 'bonjour@cartedepoche.fr', 'Stripe', 'ne la conservons pas'
  ]) assert.ok(m.text.includes(part), 'texte : manque « ' + part + ' »');
  assert.ok(m.html.includes('<a href="https://www.cartedepoche.fr/cgv"'), 'lien CGV cliquable');
  assert.ok(m.html.includes('href="https://www.cartedepoche.fr/app/"') && m.html.includes('Ouvrir ma carte de poche'), 'bouton vers l’app');
  assert.ok(m.html.includes('ABCD1234') && m.html.includes('928 068 360') && m.html.includes('L221-28'), 'mentions légales dans le html');
  assert.ok(m.html.includes('prix de lancement') && m.html.includes('dont TVA'), 'prix de lancement et TVA dans le html');
  assert.ok(m.text.includes('ABCD1234'.toUpperCase()), 'référence courte');
  assert.ok(!m.text.includes('cs_live_a1b2c3d4e5f6ABCD1234'), 'jamais l’identifiant complet de session');
});

test('email EN et prix normal sans mention de lancement', () => {
  const m = buildEmail(session({ amount_total: 499, metadata: { product: 'carte-de-poche', tier: 'standard', lang: 'en' } }), ENV);
  assert.equal(m.subject, 'Carte de poche: confirmation of your purchase');
  assert.ok(/€4\.99/.test(m.text) && /incl\. tax/.test(m.text));
  assert.ok(!/launch price/.test(m.text));
  assert.ok(/right of withdrawal/.test(m.text) && /L221-28/.test(m.text));
  assert.ok(/1 December 2026|2 December 2026/.test(m.text));
});

test('échappement HTML et texte', () => {
  assert.equal(esc('<script>"&\''), '&lt;script&gt;&quot;&amp;&#39;');
  const m = buildEmail(session({ metadata: { product: 'carte-de-poche', tier: '<b>x</b>', lang: 'fr', cgv_version: '<img src=x onerror=alert(1)>' } }), ENV);
  assert.ok(!m.html.includes('<img src=x'), 'balise injectée échappée');
  assert.ok(m.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('adresse de réponse : variable, extraite de « Nom <adresse> », par défaut', () => {
  assert.ok(buildEmail(session(), { MAIL_REPLY_TO: 'Aide <aide@cartedepoche.fr>' }).text.includes('aide@cartedepoche.fr'));
  assert.ok(buildEmail(session(), {}).text.includes('bonjour@cartedepoche.fr'));
});

test('sans adresse e-mail : to indéfini', () => {
  assert.equal(buildEmail(session({ customer_details: {} }), ENV).to, undefined);
  assert.equal(buildEmail(session({ customer_details: null }), ENV).to, undefined);
});

test('sendEmail : requête Resend, clé d’idempotence, erreur remontée', async () => {
  const calls = [];
  const ok = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; };
  const m = buildEmail(session(), ENV);
  await sendEmail(ENV, ok, m, 'confirm-cs_1');
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'confirm-cs_1');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer re_x');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ['client@example.com']);
  assert.equal(body.from, ENV.MAIL_FROM);
  assert.equal(body.reply_to, ENV.MAIL_REPLY_TO);
  assert.ok(body.html && body.text);
  await assert.rejects(sendEmail(ENV, async () => ({ ok: false, status: 422 }), m, 'k'), /resend_error_422/);
});

test('TVA : 1,99 € et 4,99 € à 8,5 % incluse, FR et EN, absente sans VAT_RATE', () => {
  const fr = buildEmail(session(), ENV).text.replace(/[\u00a0\u202f]/g, ' ');
  assert.ok(fr.includes('dont TVA 8,5 % : 0,16 €') && fr.includes('prix HT : 1,83 €'), fr);
  const std = buildEmail(session({ amount_total: 499, metadata: { product: 'carte-de-poche', tier: 'standard', lang: 'en' } }), ENV).text.replace(/[\u00a0\u202f]/g, ' ');
  assert.ok(std.includes('of which VAT 8.5% : €0.39') && std.includes('price excl. VAT: €4.60'), std);
  assert.ok(!/dont TVA/.test(buildEmail(session(), Object.assign({}, ENV, { VAT_RATE: undefined })).text), 'pas de ligne sans taux');
  assert.ok(!/dont TVA/.test(buildEmail(session({ amount_total: 0 }), ENV).text), 'pas de TVA sur 0 €');
});
