const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const async = require('async');
const crypto = require('crypto');
let request = require('request');
const http_status = require('../../Helpers/http_stasuses.js');
const utils = require('../../Helpers/util');
const config = require('../../configs/config');
const models = require('../../models');
const constants = require('../../configs/constants');

module.exports = {
    generate_new_token: (req, res) => {

        async.waterfall([
            function(found_user_callback) {
                let filter = { phone_number: req.body.phone_number };
                //console.log(filter);
                models.rider.get(filter, {}, function(err, user) {
                    if (err) {
                        found_user_callback(err);
                    }

                    found_user_callback(null, user);
                })
            },
            function(user, token_callback) {
                let amount = req.body.amount;
                let valid_request = 0; //number of possible request for token
                switch (amount) {
                    case 5:
                        valid_request = 1;
                        break
                    case 15:
                        valid_request = 2;
                        break
                    case 20:
                        valid_request = 3;
                        break
                    case amount < 5:
                        valid_request = 4;
                }

                let password = user.identification.date_of_birth;
                let order = `{
                    "phone_number": "${req.body.phone_number}",
                    "last_name": "${user.last_name}",
                    "id_number": "${user.identification.identification_number}",
                    "amount": "${req.body.amount}",
                    "rider_id": "${user._id}",
                    "valid_request": "${valid_request}",
                    "accepted_requests": 0,
                    "payment_status": "0"
                    "date_purchased": "${new Date() * constants.LONG_DATE_MULTIPLIER}",
                    "date_modified": "${new Date(moment().format())}"
                }`;

                let encrypted = utils.encrypt_token(password, order);
                let decrytped = utils.decrypt_token(encrypted, password);

                token_callback(null, user, encrypted, decrytped);
            },

            function(user, encrypted, decrypted, invoice_callback) {
                let payment_payload = {
                    the_user: user,
                    the_req_info: req.body,
                    payment_desc: `Invoice for GH¢${req.body.amount} TOKEN purchase`
                };

                console.log(payment_payload)

                utils.slydpay_invoice(payment_payload, "TKN", function(err, invoice_data) {
                    if (err) {
                        invoice_callback(err, null);
                        return;
                    }

                    invoice_callback(null, invoice_data);
                });
            }

        ], function(err, results) {
            if (err) {
                http_status.BAD_REQUEST(res, { message: err });
                return;
            }
            http_status.OK(res, { message: results });
        });
    },

    check_token_balances: (req, res) => {
        async.waterfall([
            function(id_callback) {
                let filter = { phone_number: req.body.phone_number };
                models.rider.get(filter, {}, function(err, rider) {
                    if (err) {
                        id_callback(err);
                    }
                    id_callback(null, rider);
                });
            },
            function(rider, callback) {
                let available_token_balance = rider.new_tokens.length;
                let available_token_value = available_token_balance * 2.0;
                let used_token_balance = rider.old_tokens.length;
                let used_token_value = used_token_balance * 2.0;
                let total_token_value = available_token_balance + used_token_balance;
                let total_qty_token_bought = available_token_value + used_token_value;
                console.log(parseInt(available_token_balance));

                let token_balance = {
                    available_token: available_token_balance,
                    available_token_value: `GH¢${available_token_value}.0`,
                    used_token: used_token_balance,
                    used_token_value: `GH¢${used_token_value}.0`,
                    total_amount_of_tokens_bought: `GH¢${total_qty_token_bought}.0`,
                    total_qty_of_token_bought: total_token_value
                };

                callback(null, token_balance);
            }
        ], function(err, result) {
            if (err) {
                http_status.BAD_REQUEST(res, { message: err.message });
                return;
            }
            http_status.OK(res, { message: result });
        });
    },

    //TOKEN PURCHASES CRUD:
    all_token_purchases: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {rider_id: ObjectID(req.body.rider_id)};
                models.token_payment.get_all_token_payment(filter, (err, payments) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, payments);
                });
            }
        ], (err, results) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err) http_status.OK(res, {message: results});
        });
    },

    get_a_token_purchase_detail: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {_id: ObjectID(req.body.receipt_id)};
                models.token_payment.get_a_token_payment(filter, (err, payments) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, payments);
                });
            }
        ], (err, results) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err) http_status.OK(res, {message: results});
        });
    },

    delete_a_token_purchase: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {_id: ObjectID(req.body.receipt_id)};
                models.token_payment.remove_a_token_payment(filter, {}, (err, payments) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, payments);
                });
            },
            function (payments, callback) {
                let filter = {rider_id: ObjectID(req.body.rider_id)};
                models.token_payment.get_all_token_payment(filter, (err, payments) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, payments);
                });
            }
        ], (err, results) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err) http_status.OK(res, {message: results});
        });
    },

    token_payment_history: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {phone_number: req.body.phone_number};
                console.log(filter);

                models.failed_transaction.get_all_failed_transactions(filter, (err, the_failed) => {
                    if (err) callback(err, null);

                    let filtered_payment = [];
                    the_failed.forEach(item => {
                        const payment_type = `${item.reference}`.slice(0,3);
                        if (payment_type === 'TKN'){
                            filtered_payment.push(item);
                        }
                    });
                    callback(null, filtered_payment, filter);
                });
            },
            function (the_failed, filter, callback) {
                models.service_payment.find_all(filter, {}, (err, the_success) => {
                    if (err) callback(err, null);

                    let filtered_payment = [];
                    the_success.forEach(item => {
                        const payment_type = `${item.reference}`.slice(0,3);
                        if (payment_type === 'TKN'){
                            filtered_payment.push(item);
                        }
                    });

                    let history_object = filtered_payment.concat(the_failed);
                    console.log(history_object)

                    callback(null, history_object);
                });
            }
        ],(err, result) => {
            if (err) return http_status.BAD_REQUEST(res, {message: err.message});
            http_status.OK(res, {message: result});
        })
    }
};