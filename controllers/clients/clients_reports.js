const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const async = require('async');
const crypto = require('crypto');
const http_status = require('../../Helpers/http_stasuses.js');
const utils = require('../../Helpers/util');
const config = require('../../configs/config');
const models = require('../../models');
const constants = require('../../configs/constants');

module.exports = {

    suspend_client: (req, res) => {},

    reinstate_client: (req, res) => {},

    check_client_status: (req, res) => {},

    all_payment_receipt: (req, res) => {},

    receipt_detail: (req, res) => {}
};