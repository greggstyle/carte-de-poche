'use strict';
module.exports = (req, res) => require('../lib/webhook').handler()(req, res);
// Stripe signe le corps brut : on désactive l'analyse automatique du corps.
module.exports.config = { api: { bodyParser: false } };
