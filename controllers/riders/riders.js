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
    check_rider_status: (req, res) => {
        async.waterfall([
            function (found_user_callback) {
                let filter = {
                    _id: ObjectID(req.body.user_id)
                };
                models.rider.get(filter,{}, function (err, rider) {
                    if (err){
                        found_user_callback(err);
                        return;
                    }
                    let statusObject = {
                        rider_activated: rider.rider_activated,
                        rider_status: rider.rider_status
                    };
                    console.log(statusObject);
                    found_user_callback(null, statusObject);
                });
            }
        ], function (err, result) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        });
    },


};