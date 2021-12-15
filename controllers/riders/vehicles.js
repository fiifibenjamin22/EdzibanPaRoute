const ObjectID = require('mongodb').ObjectID;
const async = require('async');
const moment = require('moment');
const http_status = require('../../Helpers/http_stasuses');
const utils = require('../../Helpers/util');
const models = require('../../models');
const constants = require('../../configs/constants');
const config = require('../../configs/config');

module.exports = {
    add_new_vehicle: (req, res) => {
        let required_fields = [
            {name: "vehicle_number", message: "vehicle number is required"},
            {name: "vehicle_type", message: "vehicle type is required"},
            {name: "vehicle_brand", message: "vehicle brand is required"},
            {name: "vehicle_size", message: "vehicle size is required"},
            {name: "user_phone_number", message: "user phone number is required"}
        ];

        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        models.vehicle_information.create(req.body, function (err, vehicle_info) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: vehicle_info});
        })
    },
    update_vehicle: (req, res)  => {
        let filter = {
            user_phone_number: req.body.user_phone_number
        };

        let updater = {
            is_verified: true,
            rider_activated: false
        };
        models.vehicle_information.update(filter, {'$set': updater}, function (err, updated_vehicle) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: updated_vehicle});
        })
    },
    activate_ride: (req, res) => {
        let required_fields = [
            {name: "user_phone_number", message: "rider's phone number is required"}
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        async.waterfall([
            function (user_callback) {
                let filter = {
                    phone_number: req.body.user_phone_number
                };
                models.rider.get(filter,{},function (err, rider) {
                    if (err){
                        user_callback(err);
                        return;
                    }
                    user_callback(null, rider);
                })
            },
            //Register rider's new location before user update
            function (the_user, saved_recent_location_callback) {
                let locationToSave = {
                    phone_number: the_user.phone_number,
                    vehicle_number: the_user.vehicle_info.vehicle_number,
                    current_location_name: req.body.current_location_name,
                    current_location_radius: req.body.current_location_radius,
                    current_location_coordinate: {
                        type: 'Point',
                        coordinates: [parseFloat(req.body.longitude),parseFloat(req.body.latitude)]
                    },
                    rider_status: 'idle',
                    date_created: new Date(moment().subtract(config[config.env].riders.location_time, 'minutes')),
                    date_created_long: new Date() * constants.LONG_DATE_MULTIPLIER
                };

                models.rider_recent_location.create(locationToSave, (err, saved_location) => {
                    if (err){
                        saved_recent_location_callback(err);
                        return;
                    }
                    saved_recent_location_callback(null, the_user, saved_location);
                })
            },
            function (the_user, saved_location, update_user_callback) {
                let filter = {
                    phone_number: req.body.user_phone_number
                };
                let ObjectToUpdate = the_user;
                ObjectToUpdate.current_location_info = saved_location;
                models.rider.update_user_details(filter, ObjectToUpdate, function (err, updated_user) {
                    if (err){
                        update_user_callback(err);
                        return;
                    }
                    update_user_callback(null, the_user, saved_location);
                })
            },
            function (the_rider, saved_location, updated_callback) {
                let filter = {phone_number: req.body.user_phone_number};
                let toUpdate = the_rider;
                toUpdate.rider_activated = true;
                toUpdate.time_activated = new Date() * constants.LONG_DATE_MULTIPLIER;
                toUpdate.date_modified = new Date(moment().subtract(config[config.env].riders.location_time));

                models.rider.upsert(filter, toUpdate, function (err, updated) {
                    if (err){
                        updated_callback(err);
                        return;
                    }
                    updated_callback(null, updated, the_rider, saved_location);
                })
            },
            function(update, the_rider, saved_location, vehicle_callback) {
                let filter = {user_phone_number: req.body.user_phone_number};
                models.vehicle_information.get(filter, function (err, the_vehicle) {
                    if (err) return vehicle_callback (err, null);
                    vehicle_callback(null, the_vehicle, update, the_rider, saved_location)
                });
            },
            function(the_vehicle, update, the_rider, saved_location, updated_callback){
                let filter = {user_phone_number: req.body.user_phone_number};
                if (!the_vehicle) return http_status.BAD_REQUEST(res, {message: "rider vehicle not found in database, -NB: you can ad the rider's vehicle"});
                let toUpdate = the_vehicle;

                toUpdate.location = saved_location.location;
                toUpdate.rider_status = saved_location.rider_status;
                toUpdate.date_created = saved_location.date_created;
                toUpdate.date_created_long = saved_location.date_created_long;
                toUpdate.current_location_name = saved_location.current_location_name;
                toUpdate.user_id = the_rider._id;

                toUpdate.rider_activated = true;
                models.vehicle_information.update(filter, toUpdate, function(err, vehicle_update) {
                    if (err) return updated_callback(err, null);
                    updated_callback(null, update, vehicle_update, the_rider)
                })
            },
            function (updated, vehicle_update, the_rider, vehicle_callback) {
                let filter = {user_phone_number: req.body.user_phone_number};
                models.vehicle_information.get(filter, function (err, the_vehicle) {
                    if (err) return vehicle_callback (err, null);
                    vehicle_callback(null, the_vehicle, the_rider)
                });
            },
            function (the_vehicle, the_rider, updated_callback) {
                let filter = {phone_number: req.body.user_phone_number};
                let toUpdate = the_rider;
                toUpdate.vehicle_info = the_vehicle;
                toUpdate.time_activated = new Date() * constants.LONG_DATE_MULTIPLIER;
                toUpdate.date_modified = new Date(moment().subtract(config[config.env].riders.location_time));

                models.rider.upsert(filter, toUpdate, function (err, updated) {
                    if (err){
                        updated_callback(err);
                        return;
                    }
                    updated_callback(null, updated, the_rider);
                })
            },
            function (updated, the_rider, get_user_callback) {
                let filter = {phone_number: req.body.user_phone_number};
                models.rider.get(filter,{},function (err, rider) {
                    if (err){
                        get_user_callback(err);
                        return;
                    }
                    get_user_callback(null, rider);
                })
            }
        ], function (err, results) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err});
            }else{
                http_status.OK(res, {message: results});
            }
        });
    },

    vehicle_type: (req, res) => {
        models.vehicle_information.get({},(err, vehicles) =>{

        })
    }
};