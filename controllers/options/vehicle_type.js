const ObjectID = require('mongodb').ObjectID;
const async = require("async");
const moment = require('moment');
const http_status = require('../../Helpers/http_stasuses.js');
const utils = require('../../Helpers/util');
const models = require('../../models');
const constant = require('../../configs/constants');

module.exports = {

    new_vehicle_type: (req, res) => {
        async.waterfall([
            function(callback){
                models.vehicle_types.create(req.body, (err, vehicle_data) => {
                    if (err) return callback(err, null);
                    callback(null, vehicle_data);
                });
            }
        ],(err, result) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        })
    },

    get_vehicle_types: (req, res) => {
        async.waterfall([
            function(callback){
                models.vehicle_types.find_all({}, {}, (err, vehicle_types_data) => {
                    if (err) return callback(err, null);
                    callback(null, vehicle_types_data);
                })
            }
        ],(err, result) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        })
    },

    get_a_vehicle_type: (req, res) => {
        async.waterfall([
            function(callback){
                let filter = {
                    _id: ObjectID(req.body.vehicle_type_id)
                }
                models.vehicle_types.get(filter, (err, vehicle_types_data) => {
                    if (err) return callback(err, null);
                    callback(null, vehicle_types_data);
                })
            }
        ],(err, result) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        })
    }
}