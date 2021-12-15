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
    daily_reports: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {
                    rider_assigned: ObjectID(req.body.rider_id),
                    trip_state: 'ended',
                    is_completed: true
                };
                models.client_request.get_all(filter, (err, the_request) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, filter, the_request);
                });
            },
            function (filter, the_request, callback) {
                //last working day
                let last_day;
                let last_request = the_request[the_request.length - 1];
                if (last_request === undefined) {
                    console.log("last request from rider's report:::", true);
                    last_day = 0;
                }else{
                    last_day = last_request.date_modified;
                }

                let last_working_day =  last_day;
                let total_amount_earned = 0;

                console.log(last_request);

                let requests = the_request.reduce((promiseChain, item) => {
                    return promiseChain.then(() => new Promise((resolve) => {
                        utils.forEachThen(item, resolve);
                    }));
                }, Promise.resolve());

                requests.then((fares) => {
                    total_amount_earned = fares;
                    callback(null, the_request, last_request, total_amount_earned, last_working_day);
                });
            },
            function (the_request, last_request, total_amount_earned, last_working_day, callback) {

                let startDate = new Date(last_working_day);
                let endDate = new Date(last_request.rider_activated_since);
                let startTime = moment(startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true}), "HH:mm:ss a")
                let endTime = moment(endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true}), "HH:mm:ss a")

                // calculate total duration
                let duration = moment.duration(endTime.diff(startTime));
                // duration in hours
                let hours = parseInt(duration.asHours());
                // duration in minutes
                let minutes = parseInt(duration.asMinutes())%60;
                // Jobs done
                let jobs = the_request.length;

                console.log(Math.abs(hours), Math.abs(minutes));


                let requests = the_request.reduce((promiseChain, item) => {
                    return promiseChain.then(() => new Promise((resolve) => {
                        utils.forEachDistanceThen(item, resolve);
                    }));
                }, Promise.resolve());

                requests.then((distance) => {
                    let report = {
                        last_working_day: last_working_day,
                        amount_earned: total_amount_earned,
                        minutes_online: Math.abs(minutes),
                        hours_online: Math.abs(hours),
                        total_distance: distance,
                        jobs_done: jobs
                    };
                    callback(null, report);
                });
            }
        ], (err, results) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err) http_status.OK(res, {message: results});
        })
    },

    all_token_receipts: (req, res) => {
        let filter = {_id: ObjectID(req.body.rider_id)};
        models.token_payment.get_all_token_payment(filter, (err, the_receipt) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err) http_status.OK(res, {message: the_receipt});
        });
    },

    a_token_receipt: (req, res) => {
        let filter = {_id: ObjectID(req.body.receipt_id)};
        models.token_payment.get_a_token_payment(filter, (err, the_receipt) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err) http_status.OK(res, {message: the_receipt});
        });
    }
};