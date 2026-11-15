'use strict';
module.exports = (req, res) => require('../lib/paywall').handlers().verify(req, res);
