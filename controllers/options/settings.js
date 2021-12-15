const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const http_status = require('../../Helpers/http_stasuses.js');
const utils = require('../../Helpers/util');
const models = require('../../models');
const constant = require('../../configs/constants');

module.exports = {

    share_live_location: (req, res) => {
        async.waterfall([
            function (callback) {
                let isLive_settings = {
                    client_id: req.body.client_id,
                    is_live_location: req.body.is_set_live
                };

                models.settings_collection.create(isLive_settings, (err, location_settings) => {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, location_settings);
                });
            }
        ],(err, results) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: results});
        })
    },

    submit_client_reports: (req, res) => {

    },

    save_client_locations: (req, res) => {

    },

    retrieve_frequent_issues: (req, res) => {

    }
};