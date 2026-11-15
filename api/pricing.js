'use strict';
module.exports = (req, res) => require('../lib/paywall').handlers().pricing(req, res);
