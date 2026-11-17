'use strict';
/* À lancer avant la mise en production : node --test test/golive.test.js
   Échoue s'il reste un champ à compléter ou un lien mort dans une page publique. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const PAGES = ['cgv.html', 'mentions-legales.html', 'charte-ia.html', 'index.html'];

test('aucun champ « à compléter » dans les pages publiques', () => {
  for (const f of PAGES) {
    const txt = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/\[à compléter/i.test(txt), f + ' contient encore un champ à compléter');
  }
});

test('la CGV contient les clauses clés : accès 24 h, rétractation, email de confirmation', () => {
  const cgv = fs.readFileSync(path.join(__dirname, '..', 'cgv.html'), 'utf8');
  assert.match(cgv, /24 heures/);
  assert.match(cgv, /l221-28/);
  assert.match(cgv, /email de confirmation/);
});

test('aucun lien vers la plateforme européenne ODR, fermée depuis le 20 juillet 2025', () => {
  for (const f of PAGES) {
    const txt = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/ec\.europa\.eu\/consumers\/odr/.test(txt), f + ' renvoie vers la plateforme ODR fermée');
  }
});

test('CONTRIBUTING.md et CODEOWNERS protègent l\u2019app et le paiement', () => {
  const root = path.join(__dirname, '..');
  const guide = fs.readFileSync(path.join(root, 'CONTRIBUTING.md'), 'utf8');
  const owners = fs.readFileSync(path.join(root, '.github', 'CODEOWNERS'), 'utf8');
  for (const p of ['/app/', '/app.js', '/api/', '/lib/', '/vercel.json', '/cgv.html']) assert.ok(owners.includes(p + ' '), 'CODEOWNERS ne couvre pas ' + p);
  // chaque id suivi par le script de l\u2019accueil est cité dans le guide, et existe bien dans la page
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of ['launch', 'price-big', 'price-sub', 'faq-price', 'consent', 'consent-yes', 'consent-no', 'consent-open']) {
    assert.ok(guide.includes('`' + id + '`'), 'CONTRIBUTING.md ne cite pas l\u2019id ' + id);
    assert.ok(home.includes('id="' + id + '"'), 'index.html n\u2019a plus l\u2019id ' + id);
  }
  assert.ok(!/(sk|rk|whsec)_(live|test)_[A-Za-z0-9]{8,}/.test(guide + owners), 'aucune clé dans ces fichiers');
});
