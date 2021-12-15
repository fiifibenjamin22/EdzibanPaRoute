const async = require('async');
const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');

const http_status = require('../../Helpers/http_stasuses');
const models = require('../../models');
const config = require('../../configs/config.js');
const constant = require('../../configs/constants');
const utils = require('../../Helpers/util');

module.exports = {
    add_rider_new_location: (req, res) => {
        let required_fields = [
            {name: "user_phone_number", message: "rider's phone number is required"}
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        async.waterfall([
            function (get_user_call_back) {
                let filter = { phone_number: req.body.user_phone_number };
                models.rider.get(filter, {}, function (err, the_rider) {
                    if (err){
                        get_user_call_back(err);
                        return;
                    }
                    //console.log(the_rider);
                    get_user_call_back(null, the_rider);
                });
            },
            function (the_rider, saved_recent_location_callback) {
                let locationToSave = {
                    rider_id: the_rider._id,
                    phone_number: the_rider.phone_number,
                    vehicle_number: the_rider.vehicle_info.vehicle_number,
                    current_location_name: req.body.current_location_name,
                    current_location_radius: req.body.current_location_radius,
                    current_request_id: req.body.current_request_id,
                    location:{
                        type: 'Point',
                        coordinates: [parseFloat(req.body.longitude),parseFloat(req.body.latitude)]
                    },
                    rider_status: the_rider.rider_status,
                    date_created: new Date(moment().subtract(config[config.env].riders.location_time, 'minutes')),
                    date_created_long: new Date() * constant.LONG_DATE_MULTIPLIER
                };

                models.rider_recent_location.create(locationToSave, (err, saved_location) => {
                    if (err){
                        saved_recent_location_callback(err);
                        return;
                    }

                    saved_recent_location_callback(null, the_rider, saved_location);
                })
            },
            //update vehicle
            function (the_rider, saved_location, callback) {
                let the_filter = {user_phone_number: req.body.user_phone_number};
                models.vehicle_information.get(the_filter, (err, the_vehicle) => {
                    if (err) callback(err, null);
                    if (!the_vehicle) return http_status.BAD_REQUEST(res, {message: "rider vehicle not found in database, -NB: you can ad the rider's vehicle"});
                    callback(null, the_vehicle, the_rider, saved_location, the_filter);
                });
            },
            function (the_vehicle, the_rider, saved_location, filter, callback) {

                let toUpdate = the_vehicle;
                toUpdate.location = saved_location.location;
                toUpdate.rider_status = saved_location.rider_status;
                toUpdate.date_created = saved_location.date_created;
                toUpdate.date_created_long = saved_location.date_created_long;
                toUpdate.current_location_name = saved_location.current_location_name;
                toUpdate.user_id = the_rider._id;

                console.log(`vehicle ${saved_location.vehicle_number} is ${saved_location.rider_status} at ${saved_location.current_location_name} with proximity of ${saved_location.location.coordinates} time: ${saved_location.date_created}`);

                models.vehicle_information.update(filter, toUpdate, (err, updated) => {
                    if (err) callback(err, null);
                    callback(null, the_rider, saved_location);
                });
            },
            function (the_rider, saved_location, update_user_callback) {
                let filter = { phone_number: req.body.user_phone_number };
                let ObjectToUpdate = the_rider;
                ObjectToUpdate.current_location_info = saved_location;
                models.rider.update_user_details(filter, ObjectToUpdate, function (err, updated_user) {
                    if (err){
                        update_user_callback(err);
                        return;
                    }
                    update_user_callback(null, saved_location);
                })
            },

        ],function (err, results) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: results});
        });
    },

    fetch_rider_last_location: (req, res) => {
        async.waterfall([

            function (callback) {
                let filter = {
                    rider_id: ObjectID(req.body.rider_id),
                    date_created: {"$gte": new Date(moment().subtract(20, 'minutes'))}
                };

                console.log(filter);
                console.log(new Date(moment().subtract(10, 'minutes')));

                models.rider_recent_location.find_all(filter, {}, (err, recent_location) => {
                    if (err){
                        callback(err, null);
                        return;
                    }

                    let last_item = recent_location[recent_location.length - 1];
                    console.log(last_item);

                    callback(null, last_item);
                });
            }
        ], (err, result) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        });
    }
};