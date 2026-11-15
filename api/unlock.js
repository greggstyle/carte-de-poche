'use strict';
module.exports = (req, res) => require('../lib/paywall').handlers().unlock(req, res);
