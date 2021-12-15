const async = require('async');
const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const firebase = require('firebase-admin');

const http_status = require('../../Helpers/http_stasuses');
const utils = require('../../Helpers/util');
const models = require('../../models');
const config = require('../../configs/config.js');
const constants = require('../../configs/constants');

module.exports = {

    update_rider_status: (req, res) => {
        let required_fields = [
            {name: "user_phone_number", message: "rider's phone number is required"}
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        async.waterfall([
            function (found_user_callback) {
                let filter = { phone_number: req.body.user_phone_number };
                models.rider.get(filter,{}, function (err, rider) {
                    if (err) found_user_callback(err);
                    found_user_callback(null, rider);
                });
            },
            //update user
            function (the_user, user_update_callback) {
                let filter = {  _id: ObjectID(the_user._id) };
                let ObjectToUpdate = the_user;
                ObjectToUpdate.rider_status = req.body.rider_status; //string
                ObjectToUpdate.rider_activated = utils.stringToBoolean(req.body.rider_activated); //Boolean
                ObjectToUpdate.date_modified = new Date() * constants.LONG_DATE_MULTIPLIER;

                models.rider.upsert(filter, ObjectToUpdate, function (err, isUpdated) {
                    if (err) user_update_callback(err);
                    user_update_callback(null, isUpdated, the_user);
                });
            },
            function(update, the_user, vehicle_callback) {
                let filter = {user_phone_number: `${the_user.phone_number}`};
                models.vehicle_information.get(filter, function (err, the_vehicle) {
                    if (err) return vehicle_callback (err, null);
                    vehicle_callback(null, the_vehicle, update, the_user)
                });
            },
            function(the_vehicle, update, the_user, updated_callback){
                let filter = {user_phone_number: `${the_user.phone_number}`};
                if (!the_vehicle) return http_status.BAD_REQUEST(res, {message: "rider vehicle not found in database, -NB: you can ad the rider's vehicle"})
                the_vehicle.rider_activated = utils.stringToBoolean(req.body.rider_activated);
                models.vehicle_information.update(filter, the_vehicle, function(err, vehicle_update) {
                    if (err) return updated_callback(err, null);
                    updated_callback(null, update, the_user);
                });
            },
            function (update, the_user, vehicle_callback) {
                let filter = {user_phone_number: `${the_user.phone_number}`};
                models.vehicle_information.get(filter, function (err, the_vehicle) {
                    if (err) return vehicle_callback (err, null);
                    vehicle_callback(null, the_vehicle, update, the_user)
                });
            },
            function (the_vehicle, update, the_user, user_update_callback) {
                let filter = { phone_number: req.body.user_phone_number };
                let ObjectToUpdate = the_user;
                ObjectToUpdate.vehicle_info = the_vehicle
                ObjectToUpdate.date_modified = new Date() * constants.LONG_DATE_MULTIPLIER;

                models.rider.upsert(filter, ObjectToUpdate, function (err, isUpdated) {
                    if (err) user_update_callback(err);
                    user_update_callback(null, isUpdated, the_user);
                });
            },
            function (isUpdated, the_user, found_user_callback) {
                let filter = { phone_number: req.body.user_phone_number };
                models.rider.get(filter,{}, function (err, rider) {
                    if (err) found_user_callback(err);
                    found_user_callback(null, rider);
                });
            },
        ],function (err, results) {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            http_status.OK(res, {message: results});
        });
    },

    // Accept orders from customers
    accept_orders_from_customers: (req, res) => {
        async.waterfall([
            function (token_callback) {
                let filter = {_id: ObjectID(req.body.rider_id)};
                models.rider.get(filter,{}, function (err, the_rider) {
                    if (err) token_callback(err);
                    the_token = the_rider.new_tokens[0];
                    token_callback(null, the_token, the_rider);
                })
            },
            function (the_token, the_rider, acceptance_callback) {
                let filter = {_id: ObjectID(req.body.request_id)};
                models.client_request.get(filter, function (err, found_request) {
                    if (err) acceptance_callback(err, null);
                    acceptance_callback(null, found_request, the_token, the_rider);
                });
            },
            function (found_request, the_token, the_rider, updated_rider_callback) {
                let filter = {_id: ObjectID(the_rider._id)};
                let toUpdate = the_rider;
                toUpdate.rider_status = "busy";
                models.rider.upsert(filter, toUpdate, function (err, updated_rider) {
                    if (err) updated_rider_callback(err);
                    updated_rider_callback(null, found_request, the_token, the_rider);
                })
            },
            function (found_request, the_token, the_rider, update_request_callback) {
                console.log(found_request);
                let requests = found_request.available_rides.reduce((promiseChain, item) => {
                    return promiseChain.then(() => new Promise((resolve) => {
                        rider_list_gcm_tokens(item, req.body.rider_id, resolve);
                    }));
                }, Promise.resolve());

                requests.then((fcm_tokens) => {
                    console.log('done ',fcm_tokens);

                    let message = {
                        data: {
                            message: `Request Has Been Taken By Another Rider`,
                            item_id: `${found_request._id}`,
                            type: "request_taken"
                        },
                        tokens: fcm_tokens
                    };

                    firebase.messaging().sendMulticast(message).then( (response) => {
                        console.log("Successfully sent message: ", response);
                        if (response.failureCount === 1){
                            response.responses.forEach(err => {
                                console.log(err.error.message);
                            });
                        }
                        update_request_callback(null, found_request, the_token, the_rider);
                    }).catch( (error) => {
                        console.log("Error sending message: ", error.message);
                        update_request_callback(error, null);
                    });
                });
            },
            function (found_request, the_token, the_rider, update_request_callback) {
                let filter = {_id: ObjectID(found_request._id)};
                let toUpdate = found_request;
                toUpdate.is_request_confirmed = true;
                toUpdate.rider_accepted = true;
                toUpdate.assigned_rider = the_rider;
                toUpdate.vehicle_number = the_rider.vehicle_info.vehicle_number;
                toUpdate.vehicle_id = the_rider.vehicle_info.vehicle_id;
                toUpdate.rider_accepting_request = {
                    "_id": the_rider._id,
                    "first_name": the_rider.first_name,
                    "last_name": the_rider.last_name,
                    "role_name": the_rider.role_name,
                    "passport_photo": the_rider.passport_photo,
                    "token_used": the_token
                }
                toUpdate.rider_status = 'busy';
                toUpdate.request_status = 1;
                toUpdate.trip_state = "started"
                toUpdate.date_modified = new Date() * constants.LONG_DATE_MULTIPLIER;
                delete toUpdate.available_rides;

                models.client_request.upsert(filter, toUpdate, function (err, updated) {
                    if (err) update_request_callback(err, null);
                    update_request_callback(null, toUpdate, the_token, the_rider);
                });
            },
            // move token from new to used tokens of the riders
            function (the_request, the_token, the_rider, update_rider_callback) {
                let filter = {_id: ObjectID(the_rider._id)};
                // decrypt and examine contents before moving to used
                let decrypted = utils.decrypt_token(the_token, the_rider.identification.date_of_birth);
                console.log(decrypted);

                let toUpdate = the_rider;
                toUpdate.old_tokens.push(the_token);
                toUpdate.number_of_used_tokens = the_rider.old_tokens.length;

                models.rider.upsert(filter, toUpdate, function (err, updated) {
                    if (err) update_rider_callback(err);
                    update_rider_callback(null, the_request, the_token, toUpdate);
                });
            },

            // Update Rider
            function (the_request, the_token, the_rider, update_rider_callback) {
                let filter = {_id: ObjectID(the_rider._id)};
                let tokens = the_rider.new_tokens;
                tokens.shift();
                let toUpdate = the_rider;
                toUpdate.new_tokens = tokens;
                toUpdate.number_of_new_tokens = tokens.length;
                toUpdate.current_location_info.rider_status = 'busy';
                toUpdate.current_location_info.current_request_id = the_request._id;

                models.rider.upsert(filter, toUpdate, function (err, updated) {
                    if (err) update_rider_callback(err);
                    update_rider_callback(null,the_request, toUpdate);
                });
            },
            function (the_request, toUpdate, callback) {
                let filter = {_id: ObjectID(the_request.user_making_request._id)};
                models.user.get(filter, {}, (err, the_client) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, the_client, the_request, toUpdate);
                })
            },
            // Send Notifications customer
            function (the_client, the_request, the_rider, callback) {
                console.log(the_client.fcm_token);
                let gcm_token = the_client.fcm_token;
                let message = {
                    // notification:{
                    //     title: "Request Accepted",
                    //     body: "Hello, your request has been accepted",
                    //     click_action: "request_accepted"
                    // },
                    data: {
                        message: `Rider has accepted your request`,
                        item_id: `${the_rider._id}`,
                        type: "accept_request"
                    },
                    token: gcm_token
                };

                firebase.messaging().send(message).then( (response) => {
                    console.log("Successfully sent message: ", response);
                    if (response.failureCount === 1){
                        response.results.forEach(err => {
                            console.log(err.error.message);
                        });
                    }
                    callback(null, the_request);
                }).catch( (error) => {
                    console.log("Error message: ", error.message);
                    callback(error, null);
                });
            }
        ], function (err, results) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: results});
        });
    },

    // start trip
    start_trip: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {
                    _id: ObjectID(req.body.request_id),
                    "assigned_rider._id" : ObjectID(req.body.rider_id)
                };

                console.log(filter);

                models.client_request.get(filter, (err, the_request) => {
                    console.log(the_request);
                    if (err) callback(err, null);
                    if (!err) callback(null, the_request, filter);
                });
            },
            function (the_request, filter, update_trip_status_callback) {
                let toUpdate = the_request;
                toUpdate.request_status = 2;
                toUpdate.trip_state = "started"
                toUpdate.date_modified = new Date() * constants.LONG_DATE_MULTIPLIER;
                models.client_request.upsert(filter, toUpdate, (err, updated) => {
                    if (err) update_trip_status_callback(err, null);
                    if (!err) update_trip_status_callback(null, filter, updated)
                });
            },
            function (filter, updated, callback) {
                models.client_request.get(filter, (err, the_request) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, the_request);
                })
            },
            function (the_request, callback) {
                let filter = {_id: the_request.user_making_request._id};
                models.user.get(filter, {}, (err, the_client) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, the_client, the_request);
                });
            },
            function (the_client, the_request, callback) {
                console.log(the_client.fcm_token);
                let gcm_token = the_client.fcm_token;
                let message = {
                    data: {
                        message: `Rider has started your trip`,
                        item_id: `${the_request._id}`,
                        type: "started_trip"
                    },
                    token: gcm_token
                };

                firebase.messaging().send(message).then( (response) => {
                    console.log("Successfully sent message: ", response);
                    if (response.failureCount === 1){
                        response.results.forEach(err => {
                            console.log(err.error.message);
                        });
                    }
                    callback(null, the_request);
                }).catch( (error) => {
                    console.log("Error message: ", error.message);
                    callback(error, null);
                });
            }
        ], (err, result) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            http_status.OK(res, {message: result});
        });
    },

    // end trip
    end_trip: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {
                    _id: ObjectID(req.body.request_id),
                };

                models.client_request.get(filter, (err, the_request) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, the_request, filter);
                });
            },
            function (the_request, filter, update_trip_status_callback) {

                if (!the_request.assigned_rider){
                    http_status.OK(res, {message: "trip has ended"});
                    return;
                }
                let toUpdate = the_request;
                toUpdate.request_status = 3;
                toUpdate.is_completed = true;
                toUpdate.fare = utils.calculate_fare(req.body.distance, req.body.time, 1.1);
                toUpdate.rider_assigned = the_request.assigned_rider._id;
                toUpdate.rider_activated_since = the_request.assigned_rider.time_activated;
                toUpdate.trip_state = 'ended';
                toUpdate.rider_status = 'idle';
                toUpdate.distance = parseInt(req.body.distance);
                toUpdate.date_modified = new Date() * constants.LONG_DATE_MULTIPLIER;
                delete toUpdate.is_request_confirmed;
                delete toUpdate.rider_accepted;
                delete toUpdate.assigned_rider;
                models.client_request.upsert(filter, toUpdate, (err, updated) => {
                    if (err) update_trip_status_callback(err, null);
                    if (!err) update_trip_status_callback(null, filter, updated)
                });
            },
            function (filter, updated, callback) {
                models.client_request.get(filter, (err, the_request) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, the_request, filter);
                })
            },
            function (the_request, the_filter, callback) {
                let filter = {_id: ObjectID(the_request.rider_assigned)}
                models.rider.get(filter, {}, (err, the_rider) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, filter, the_rider, the_filter, the_request);
                });
            },
            function (filter, the_rider, the_filter, the_request, callback) {
                let toUpdate = the_rider;
                toUpdate.rider_status = "idle";
                toUpdate.current_location_info.rider_status = "idle";
                models.rider.upsert(filter, toUpdate, (err, updated) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, the_rider, the_filter, the_request);
                });
            },
            function (the_rider, the_filter, the_request, callback) {

                models.client_request.get(the_filter._id, (err, request) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, request);
                });
            },
            function (the_request, callback) {
                let filter = {_id: the_request.user_making_request._id};
                models.user.get(filter, {}, (err, the_client) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, the_client, the_request);
                });
            },
            function (the_client, the_request, callback) {
                console.log(the_client.fcm_token);
                let gcm_token = the_client.fcm_token;
                let message = {
                    data: {
                        message: `Your trip has ended`,
                        item_id: `${the_request._id}`,
                        type: "ended_trip"
                    },
                    token: gcm_token
                };

                firebase.messaging().send(message).then( (response) => {
                    console.log("Successfully sent message: ", response);
                    if (response.failureCount === 1){
                        response.results.forEach(err => {
                            console.log(err.error.message);
                        });
                    }
                    callback(null, the_request);
                }).catch( (error) => {
                    console.log("Error message: ", error.message);
                    callback(error, null);
                });
            }
        ],(err, results) => {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err) http_status.OK(res, {message: results})
        });
    },

    // Cancel request from customers
    cancel_request_from_customers: (req, res) => {
        async.waterfall([

            //get rider
            function (rider_callback) {
                let filter = {_id: ObjectID(req.body.rider_id)};
                models.rider.get(filter, {}, (err, the_rider) => {
                    if (err){
                        rider_callback(err, null);
                        return;
                    }
                    rider_callback(null, the_rider);
                });
            },

            //update rider status
            function (the_rider, update_callback) {
                let filter = {_id: ObjectID(the_rider._id)};
                let toUpdate = the_rider;
                toUpdate.rider_status = "idle";
                models.rider.upsert(filter, toUpdate, (err, updated) => {
                    if (err){
                        update_callback(err, null);
                        return;
                    }
                    update_callback(null, the_rider);
                });
            },

            //get request
            function (the_rider, request_callback) {
                let filter = {_id: ObjectID(req.body.request_id)};
                models.client_request.get(filter,{}, (err, the_request) => {
                    if (err){
                        request_callback(err, null);
                        return;
                    }
                    request_callback(null, the_request, the_rider);
                });
            },

            //update request status
            function (the_request, the_rider, request_update_callback) {
                let filter = {_id: ObjectID(the_request._id)};
                delete the_request['rider'];
                the_request.request_status = 0;
                the_request.is_request_confirmed = true;
                the_request.rider_accepted = false;
                the_request.rider_accepting_request = {};
                models.client_request.upsert(filter, the_request, (err, updated) => {
                    if (err){
                        request_update_callback(err, null);
                        return;
                    }
                    request_update_callback(null, the_request, the_rider);
                });
            },

            //get user making request and send cancellation notification
            function (the_request, the_rider, notification_callback) {

                console.log(the_request.user_making_request.fcm_token);
                let gcm_token = the_request.user_making_request.fcm_token;

                let payload = {
                    data: {
                        message: `Rider has cancelled your request`,
                        item_id: `${the_rider._id}`
                    },
                    token: gcm_token
                };

                firebase.messaging().send(payload).then(function (response) {
                    console.log("Successfully sent message: ", response);
                    notification_callback(null, the_rider);
                }).catch(function (error) {
                    console.log("Error sending message: ", error);
                    notification_callback(error, null);
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

    // all requests for a rider
    rider_request_history: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {'rider_accepting_request._id': ObjectID(req.body.rider_id)};

                models.client_request.get_all(filter, (err, riders_request) => {
                    if (err){
                        callback(err, null);
                        return;
                    }

                    callback(null, riders_request);
                });
            }
        ], (err, results) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: results});
        });
    },

    // specific request by id
    riders_specific_request_by_id: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {'rider_accepting_request._id': ObjectID(req.body.rider_id)};

                models.client_request.get(filter, (err, the_request) => {
                    if (err){
                        callback(err, null)
                        return;
                    }
                    callback(null, the_request);
                });
            }
        ], (err, results) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: results});
        });
    },

    last_task_state: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {
                    rider_id: ObjectID(req.body.rider_id),
                    //date_created: {"$gte": new Date(moment().subtract(20, 'minutes'))}
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
            },

            function (last_item, callback) {

                if (last_item.current_request_id === null){
                    callback(null, {"message": 'no request info for rider at the moment'});
                    return;
                }
                let filter = {_id: ObjectID(last_item.current_request_id)};

                models.client_request.get(filter, (err, the_request) => {

                    if (err){
                        callback(err, null);
                        return;
                    }

                    let status = parseInt(the_request.request_status);
                    console.log(status);

                    switch (status) {
                        case 1:
                            callback(null, {code: 1, msg: 'rider assigned', message: the_request});
                            break
                        case 2:
                            callback(null, {code: 2, msg: 'package on it way', message: the_request});
                            break
                        case 3:
                            callback(null, {code: 3, msg: 'package arrived', message: the_request});
                            break
                        default:
                            callback(null, {code: 0, msg: 'no rider assigned', message: the_request});
                            break
                    }
                });
            }
        ], (err, results) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, results);
        });
    },

    last_ongoing_request: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter;
                switch (req.body.user_type) {
                    case 'rider':
                        filter = {
                            'trip_state': 'started',
                            'rider_accepting_request._id': ObjectID(req.body.rider_id),
                        }
                        break;
                    case 'user':
                        filter = {
                            'trip_state': 'started',
                            'user_making_request._id': ObjectID(req.body.user_id),
                        }
                }

                models.client_request.get(filter, (err, the_request) => {
                    if (err)
                        callback(err, null);
                    callback(null, the_request);
                })
            }
        ],(err, results) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, results);
        });
    }
};

let fcm_tokens = [];
function rider_list_gcm_tokens(item,user_id,cb) {
    setTimeout(() => {
        let filter = {_id: ObjectID(item.user_id)};
        models.rider.get(filter, {}, (err, rider) => {
            if (err) cb(err, null);
            if (!err)
                if (user_id !== item.user_id)
                    fcm_tokens.push(rider.fcm_token);
            cb(fcm_tokens);
        });
    }, 100);
    console.log("rider_fcm:::",fcm_tokens);
}