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
