'use strict';
/* À lancer avant la mise en production : node --test test/golive.test.js
   Échoue tant qu'il reste un champ à compléter dans une page légale. */
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

test('la CGV nomme un médiateur et la clause de rétractation', () => {
  const cgv = fs.readFileSync(path.join(__dirname, '..', 'cgv.html'), 'utf8');
  assert.match(cgv, /médiateur de la consommation/);
  assert.match(cgv, /l221-28/);
});
