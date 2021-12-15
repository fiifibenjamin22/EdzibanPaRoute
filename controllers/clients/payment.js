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

    make_payment: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {_id: ObjectID(req.body.current_request_id)};
                models.client_request.get(filter, (err, the_request) => {
                    if (err) callback(err, null);
                    if (!the_request) return http_status.BAD_REQUEST(res, {message: "request not found"});
                    callback(null, the_request);
                });
            },
            function (the_request, callback) {
                let filter = {_id: ObjectID(the_request.user_making_request._id)};
                models.user.get(filter, {}, (err, the_user) => {
                    if (err) callback(err, null);
                    if (!the_user) return http_status.BAD_REQUEST(res, {message: "user not found"});
                    callback(null, the_user, the_request);
                });
            },
            function (the_user, the_request, callback) {
                let payment_payload = {
                    the_user: the_user,
                    the_req_info: {
                        payment_method: req.body.payment_method,
                        amount: `${the_request.fare}`,
                        phone_number: the_user.phone_number
                    },
                    payment_desc: `Invoice for GH¢${the_request.fare} fare payment`
                };

                console.log(payment_payload)

                utils.slydpay_invoice(payment_payload, "SVC", (err, invoice_data) => {
                    if (err) {
                        callback(err, null);
                        return;
                    }

                    callback(null, invoice_data);
                });

                //slydpay.slydpay_invoice()

            }
        ],function(err, results) {
            if (err) {
                http_status.BAD_REQUEST(res, { message: err.message});
                return;
            }
            http_status.OK(res, { message: results });
        });
    },

    payment_history: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {phone_number: req.body.phone_number};
                console.log(filter);

                models.failed_transaction.get_all_failed_transactions(filter, (err, the_failed) => {
                    if (err) callback(err, null);

                    let filtered_payment = [];
                    the_failed.forEach(item => {
                        const payment_type = `${item.reference}`.slice(0,3);
                        if (payment_type === 'SVC'){
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
                        if (payment_type === 'SVC'){
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