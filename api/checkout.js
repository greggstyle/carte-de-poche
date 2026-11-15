'use strict';
module.exports = (req, res) => require('../lib/paywall').handlers().checkout(req, res);
