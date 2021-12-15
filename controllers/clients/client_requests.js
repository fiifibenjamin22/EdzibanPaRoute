const ObjectID = require('mongodb').ObjectID;
const async = require("async");
const firebase = require('firebase-admin');

const http_status = require('../../Helpers/http_stasuses');
const utils = require('../../Helpers/util');
const models = require('../../models');
const constant = require('../../configs/constants');

module.exports = {

    //1. All idle rides nearby
    all_idle_rides_nearby: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {
                    rider_activated: true,
                    rider_status: "idle",
                    location: {
                        $near: {
                            $geometry: {type: "Point", coordinates: [parseFloat(req.body.client_long), parseFloat(req.body.client_lat)]},
                            $maxDistance: 1000000
                        }
                    }
                };
                models.vehicle_information.nearest(filter, (err, nearest_vehicles) => {
                    if (err) callback(err, null);
                    console.log(nearest_vehicles.length, "nearest vehicles found");
                    if (!err) callback(null, nearest_vehicles);
                });
            }
        ], (err, result) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        });
    },

    //Check recipient {if recipient exist}
    check_recipient: (req, res) => {

        let filter = { _id: ObjectID(req.body.recipient_phone) };

        let required_fields = [
            {name: "recipient_phone", message: "Recipient phone is required"}
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }

        models.user.get(filter, {}, function (err, the_recipient) {
            if (err) http_status.BAD_REQUEST(res, {message: err.message});
            if (!err)
                if (the_recipient) http_status.OK(res, {message: the_recipient});
                if (!the_recipient) http_status.NOT_FOUND(res);
        });
    },

    // 2. Distance & Fares Calculation
    request_distance_and_fares: (req, res) => {

        async.waterfall([
            //get user object
            function (user_object_callback) {
                //console.log(req.body);

                let filter = { _id: ObjectID(req.body.user_id) };
                models.user.get(filter, {}, function (err, the_user) {
                    if (err) user_object_callback(err, null);
                    if (!err) user_object_callback(null, the_user);
                });
            },
            function (the_user, category_callback) {
                let filter = { _id: ObjectID(req.body.category_id) };
                models.category.get_one(filter, {}, function (err, the_category) {
                    if (err) category_callback(err, null);
                    if (!err) category_callback(null, the_user, the_category);
                });
            },
            function (the_user, the_category, size_callback) {
                let filter = { _id: ObjectID(req.body.size_id) };
                models.size.get_one(filter, {}, function (err, the_size) {
                    if (err) size_callback(err, null);
                    if (!err) size_callback(null, the_user, the_category, the_size);
                });
            },
            function (the_user, the_category, the_size, recipient_callback) {
                switch (req.body.request_type) {
                    case "delivery":
                        let filter = { phone_number: req.body.recipient_phone };
                        models.user.get(filter, {}, function (err, the_recipient) {
                            console.log("delivery");
                            if (err) recipient_callback(err, null);
                            if (!err) recipient_callback(null, the_user, the_category, the_size, the_recipient);
                        });
                        break
                    case "ride":
                        console.log("ride");
                        recipient_callback(null, the_user, the_category, the_size);
                        break
                }
            },
            function (the_user, the_category, the_size, the_recipient, callback) {
                //console.log(the_recipient);
                let request_object = {
                    fare: calculate_cost_per_km(req.body.distance,req.body.time, 5.2, 0.05),//calculate_fare(req.body.distance, req.body.time, 1.1),
                    user_making_request: {
                        _id: the_user._id,
                        first_name: the_user.first_name,
                        last_name: the_user.last_name,
                        role_name: the_user.role_name,
                        passport_photo: the_user.passport_photo
                    },
                    location_info: {
                        pickup_location:{
                            location: req.body.pickup_location_name,
                            pickup_location: {
                                type: 'Point',
                                coordinates: [parseFloat(req.body.pickup_longitude),parseFloat(req.body.pickup_latitude)]
                            },
                            longitude: req.body.pickup_longitude,
                            latitude: req.body.pickup_latitude
                        },
                        destination_location: {
                            location: req.body.destination_location_name,
                            destination_location: {
                                type: 'Point',
                                coordinates: [parseFloat(req.body.destination_longitude),parseFloat(req.body.destination_latitude)]
                            },
                            longitude: req.body.destination_longitude,
                            latitude: req.body.destination_latitude
                        }
                    },
                    distance: parseInt(req.body.distance),
                    rider_accepting_request: {},
                    recipient_of_request: {
                        _id: the_recipient ? the_recipient._id : null,
                        first_name: the_recipient ? the_recipient.first_name : req.body.receipient_fName,
                        last_name: the_recipient ? the_recipient.last_name : req.body.receipient_lName,
                        phone_number: the_recipient ? the_recipient.phone_number : req.body.recipient_phone,
                        role_name: the_recipient ? the_recipient.role_name : null,
                        passport_photo: the_recipient ? the_recipient.passport_photo : null
                    },
                    vehicle_type: req.body.vehicle_type,
                    // package_details:{
                    //     package_image: req.body.item_image,
                    //     size_id: the_size._id,
                    //     size_name: the_size.size_name,
                    //     category_id: the_category._id,
                    //     category_name: the_category.cat_name,
                    // },
                    date_created: new Date() * constant.LONG_DATE_MULTIPLIER,
                    date_modified: new Date() * constant.LONG_DATE_MULTIPLIER,
                    request_status: 0,
                    is_request_confirmed: false,
                    rider_accepted: false
                };

                if (req.body.request_type === "ride"){
                    delete request_object.recipient_of_request;
                    delete request_object.package_details;
                }

                models.client_request.create(request_object, (err, new_request) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, new_request);
                })
            },
            function (new_request, request_callback) {
                let filter = {_id: ObjectID(new_request._id)};
                models.client_request.get(filter, function (err, found_request) {
                    if (err) request_callback(err, null);
                    if (!err) request_callback(null, found_request);
                })
            },
            // function (found_request,callback) {
            //     let filter = {
            //         //current_location_name: req.body.pickup_location_name,
            //         rider_status: "idle",
            //         rider_activated: true
            //     };
            //     models.vehicle_information.find_all(filter, {}, (err, idle_vehicles) => {
            //         //console.log(idle_vehicles[0].location);
            //         if (err) callback(err, null);
            //         if (!err) callback(null, idle_vehicles,found_request);
            //     });
            // },
            function (found_request, callback) {
                let filter = {
                    rider_status: "idle",
                    rider_activated: true,
                    location: {
                        $near: {
                            $geometry: {type: "Point", coordinates: [parseFloat(found_request.location_info.pickup_location.longitude), parseFloat(found_request.location_info.pickup_location.latitude)]},
                            $maxDistance: 1000000
                        }
                    }
                };
                models.vehicle_information.nearest(filter, (err, nearest_vehicles) => {
                    console.log(nearest_vehicles.length);
                    if (err) callback(err, null);
                    if (!err) callback(null, found_request, nearest_vehicles);
                });
            },
            function (found_request, nearest_vehicles, rides_callback) {
                // let requests = nearest_vehicles.reduce((promiseChain, item) => {
                //     return promiseChain.then(() => new Promise((resolve) => {
                //         asyncFunction(item, resolve);
                //     }));
                // }, Promise.resolve());
                //
                // requests.then((all_rides) => {
                //     console.log('all rides: ',all_rides);
                //     rides_callback(null, all_rides, found_request, nearest_vehicles)
                // });

                let filter = {number_of_new_tokens: {$ne: 0}, rider_status: {$ne: "busy"}};
                let available_rides = [];

                models.rider.find_all(filter, {}, (err, rider) => {
                    rider.forEach(async the_rider => {
                        if (the_rider.vehicle_info !== undefined)
                            available_rides.push(the_rider.vehicle_info);
                    })
                    if (err) rides_callback(err, null);
                    console.log(available_rides)

                    rides_callback(null, available_rides, found_request, nearest_vehicles)
                });
            },
            function (available_rides, found_request, nearest_vehicles, updated_request_callback) {
            //console.log("here: ",available_rides);
                let filter = {_id: ObjectID(found_request._id)};
                let ObjectToUpdate = found_request;
                if (available_rides === [] || available_rides === undefined){
                    ObjectToUpdate.available_rides = [];
                    models.client_request.upsert(filter, ObjectToUpdate, function (err, updated_request) {
                        if (err) updated_request_callback(err, null);
                        if (!err) updated_request_callback(null,found_request, updated_request);
                    });
                }else{
                    ObjectToUpdate.available_rides = [...available_rides];
                    models.client_request.upsert(filter, ObjectToUpdate, function (err, updated_request) {
                        if (err) updated_request_callback(err, null);
                        if (!err) updated_request_callback(null,found_request, updated_request);
                    });
                }
            },
            function (found_request,updated_request,request_callback) {
                let filter = {_id: ObjectID(found_request._id)};
                models.client_request.get(filter,function (err, the_request) {
                    if (err) request_callback(err, null);
                    if (!err) request_callback(null, the_request);
                })
            }
        ],function (err, results) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: results});
        })
    },

    // 2. Confirm Trip or Job
    confirm_and_broadcast_request: (req, res) => {
        //let available_riders = [];
        async.waterfall([
            function (request_callback) {
                let filter = {_id: ObjectID(req.body.request_id)};
                models.client_request.get(filter, function (err, found_request) {
                    if (err) request_callback(err, null);
                    if (!err) request_callback(null, found_request);
                });
            },
            function (found_request, confirm_request_callback) {
                let filter = {_id: ObjectID(found_request._id)};
                let ObjectToUpdate = found_request;
                ObjectToUpdate.is_request_confirmed = true;
                ObjectToUpdate.request_status = 1;
                models.client_request.upsert(filter, ObjectToUpdate, function (err, updated_request) {
                    if (err) confirm_request_callback(err, null);
                    if (!err) confirm_request_callback(null, updated_request,found_request);
                });
            },
            function (updated_request,found_request, broadcast_callback) {
                const vehicles = found_request.available_rides;
                let fcm_tokens = [];

                async.forEach(vehicles, (item, callback) => {
                    console.log(item.user_id);

                    let filter = {_id: ObjectID(item.user_id), rider_status: {$ne: 'busy'}};
                    models.rider.get(filter, {}, (err, rider) => {
                        console.log("riders here: ",rider.fcm_token);
                        if (err) callback(err, null);
                        if (!err){
                            if (rider.fcm_token !== null) {
                                fcm_tokens.push(rider.fcm_token);
                                callback(null,fcm_tokens);
                            }
                        }
                    });
                }).then(() => {
                    let message = {
                        data: {
                            message: `Hello, rider you have a new request`,
                            item_id: `${found_request._id}`,
                            type: "new_request"
                        },
                        tokens: fcm_tokens
                    };
    
                    firebase.messaging().sendMulticast(message).then( (response) => {
                        broadcast_callback(null, found_request);
                        console.log("Successfully sent message: ", response);
                        if (response.failureCount === 1){
                            response.responses.forEach(err => {
                                console.log(err.error.errorInfo);
                            });
                        }
                        //broadcast_callback(null, found_request);
                    }).catch(error => {
                        console.log("Error sending some messages: ");
                        //broadcast_callback(error, null);
                    });
                });

                /*
                let requests = found_request.available_rides.reduce((promiseChain, item) => {
                    return promiseChain.then(() => new Promise((resolve) => {
                        list_gcm_tokens(item, resolve);
                    }));
                }, Promise.resolve());

                requests.then((fcm_tokens) => {
                    console.log('done ',fcm_tokens);

                    let message = {
                        data: {
                            message: `Hello, rider you have a new request`,
                            item_id: `${found_request._id}`,
                            type: "new_request"
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
                        broadcast_callback(null, found_request);
                    }).catch( (error) => {
                        console.log("Error sending message: ", error.message);
                        broadcast_callback(error, null);
                    });
                });
                */
            }
        ],function (err, results) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err});
                return;
            }
            http_status.OK(res, {message: results});
        });
    },
    // User Cancel request whilst rider has not accepted request
    customer_cancel_request: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {_id: ObjectID(req.body.request_id)};
                models.client_request.get(filter, function (err, found_request) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, found_request);
                });
            },
            function (found_request, callback) {
                let toUpdate = found_request;
                toUpdate.request_status = 0;
                toUpdate.is_request_confirmed = false;
                toUpdate.is_request_cancelled = true;
                toUpdate.date_modified = new Date() * constant.LONG_DATE_MULTIPLIER;
                let filter = {_id: ObjectID(req.body.request_id)};
                models.client_request.upsert(filter, toUpdate ,function (err, updated_request) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, updated_request, toUpdate);
                });
            },
            function (updated_request, toUpdate, callback) {
                let filter = {_id: ObjectID(toUpdate._id)};
                models.client_request.get(filter, function (err, cancelled_request) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, cancelled_request);
                });
            }
        ],function (err, result) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        });
    },

    // User Cancel Option after confirming pickup request
    customer_cancel_ride: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {_id: ObjectID(req.body.request_id)};
                models.client_request.get(filter, function (err, found_request) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, found_request);
                });
            },
            function (found_request, callback) {
                // redeem rider's token
                let filter = {_id: ObjectID(found_request.rider_accepting_request._id)};
                models.rider.get(filter, {}, (err, the_rider) => {
                    if (err) callback(err, null);
                    console.log(the_rider)
                    let token_used = found_request.rider_accepting_request.token_used;
                    let old_tokens = the_rider.old_tokens;
                    let filtered_old_tokens = old_tokens.filter(t => t !== token_used);

                    callback(null, found_request, filtered_old_tokens, token_used, filter, the_rider);
                });
            },
            function (found_request, filtered_old_tokens, token_used, filter, the_rider, callback) {
                let toUpdate = the_rider;
                toUpdate.new_tokens.push(token_used);
                toUpdate.old_tokens = filtered_old_tokens;
                toUpdate.rider_status = "idle";

                models.rider.upsert(filter, toUpdate, (err, updated) => {
                    if (err) callback(err, null);
                    if (!err) callback(null, found_request);
                })
            },
            function (found_request, callback) {
                let toUpdate = found_request;
                toUpdate.request_status = 0;
                toUpdate.is_request_confirmed = false;
                toUpdate.is_request_cancelled = true;
                toUpdate.date_modified = new Date() * constant.LONG_DATE_MULTIPLIER;
                let filter = {_id: ObjectID(req.body.request_id)};
                models.client_request.upsert(filter, toUpdate ,function (err, updated_request) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, updated_request, toUpdate);
                });
            },
            //Send notification to rider: Ride customer has cancelled the ride
            function (updated_request, toUpdate, callback) {
                let filter = {_id: ObjectID(toUpdate._id)};
                models.client_request.get(filter, function (err, cancelled_request) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, cancelled_request);
                });
            }
        ], function (err, result) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        })
    },

    check_rider_location_after_accepting_req: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {user_id: ObjectID(req.body.rider_id)};
                models.vehicle_information.get(filter, (err, vehicle) => {
                    if (err) callback(err, null);
                    callback(null, vehicle);
                });
            },
            function (vehicle, callback) {
                let filter = {_id: ObjectID(req.body.request_id)};

                models.client_request.get(filter, (err, the_request) => {
                    if (err) callback(err, null);
                    callback(null, vehicle, the_request);
                })
            },
            function (vehicle, the_request, callback) {
                let filter = {_id: ObjectID(req.body.user_id)};
                models.user.get(filter, {}, (err, the_user) => {
                    if (err) callback(err, null);
                    callback(null, vehicle, the_request, the_user)
                })
            },
            function (vehicle, the_request, the_user, callback) {
                let distance = distance_calc(vehicle.location.coordinates[1], vehicle.location.coordinates[0], parseFloat(the_request.location_info.pickup_location.latitude), parseFloat(the_request.location_info.pickup_location.longitude), "K")

                if (distance > 0.5){
                    let distance_object = {
                        success: true,
                        distance: distance,
                        unit: "Kilometres",
                        message: "rider is on the way"
                    }

                    let message = {
                        notification:{
                            title: "Rider is on the way",
                            body: "Hello, your ride is on the way",
                            click_action: "rider_on_the_way"
                        },
                        data: {
                            message: `Hello, your ride is on the way`,
                            coordinates: `${vehicle.location.coordinates[0]},${vehicle.location.coordinates[1]}`,
                            type: "rider_on_the_way"
                        }
                    };
                    let options = {
                        priority: "high",
                        timeToLive: 60 * 60 * 24
                    };
                    let gcm_token = the_user.fcm_token;

                    firebase.messaging().sendToDevice(gcm_token, message, options).then( (response) => {
                        console.log("Successfully sent message: ", response);
                        if (response.failureCount === 1){
                            response.results.forEach(err => {
                                console.log(err.error.message);
                            });
                        }
                        callback(null, distance_object);

                    }).catch( (error) => {
                        console.log("Error message: ", error.message);
                        callback(error, null);
                    });
                }else{
                    let distance_object = {
                        success: true,
                        distance: distance,
                        unit: "Kilometres",
                        message: "rider has arrived"
                    }

                    let message = {
                        notification:{
                            title: "Rider has arrived",
                            body: "Hello, your ride has arrived",
                            click_action: "rider_arrived"
                        },
                        data: {
                            message: `Hello, your ride has arrived`,
                            coordinates: `${vehicle.location.coordinates[0]},${vehicle.location.coordinates[1]}`,
                            type: "rider_arrived"
                        }
                    };
                    let options = {
                        priority: "high",
                        timeToLive: 60 * 60 * 24
                    };
                    let gcm_token = the_user.fcm_token;

                    firebase.messaging().sendToDevice(gcm_token, message, options).then( (response) => {
                        console.log("Successfully sent message: ", response);
                        if (response.failureCount === 1){
                            response.results.forEach(err => {
                                console.log(err.error.message);
                            });
                        }
                        callback(null, distance_object);

                    }).catch( (error) => {
                        console.log("Error message: ", error.message);
                        callback(error, null);
                    });
                }
            },
        ], (err, results) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: results});
            }
        })
    },

    // all requests for a rider
    client_request_history: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {'user_making_request._id': ObjectID(req.body.client_id)};

                console.log(filter)
                models.client_request.get_all(filter, (err, client_request) => {
                    if (err){
                        callback(err, null);
                        return;
                    }

                    callback(null, client_request);
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
    client_specific_request_by_id: (req, res) => {
        async.waterfall([
            function (callback) {
                let filter = {'_id': ObjectID(req.body.request_id)};

                console.log(filter);

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
    }
};

let fcm_tokens = [];
function list_gcm_tokens(item,cb) {
    setTimeout(() => {
        console.log(item.user_id);
        let filter = {_id: ObjectID(item.user_id), rider_status: {$ne: 'busy'}};
        models.rider.get(filter, {}, (err, rider) => {
            console.log("riders here: ",item.user_id);
            if (err) cb(err, null);
            if (!err)
                fcm_tokens.push(rider.fcm_token);
                cb(null,fcm_tokens);
        });
    }, 100);
    console.log("rider_fcm:::",fcm_tokens);
}

function asyncFunction (item, cb) {
    let available_rides = [];
    setTimeout( async () => {
        let filter = {number_of_new_tokens: {$ne: 0}, rider_status: {$ne: 'busy'}};
        models.rider.find_all(filter, {}, (err, rider) => {
            rider.forEach(async the_rider => {
                console.log(the_rider.vehicle_info)
                available_rides.push(rider.vehicle_info);
            })
            if (err) cb(err, null);
            cb(available_rides);
        });
    }, 100);
    console.log(available_rides)
}

function calculate_cost_per_km(distance, time, fuel_price_per_litre, fuel_consumption_per_km) {
    const cpk = fuel_price_per_litre * fuel_consumption_per_km * 1.33;
    const fare = calculate_fare(distance, time, cpk);
    return round(fare, 1);
}

function calculate_fare(distance, time, cost_per_km) {
    const base_fare = 1.5;
    const cost_per_minute = 0.05;
    const traffic_factor = 50/60;

    const fare = Math.ceil((base_fare + (distance * cost_per_km + time * cost_per_minute)) / traffic_factor)
    return round(fare, 1);
}

function round(value, precision) {
    let multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

function distance_calc(rider_lat, rider_long, pickup_lat, pickup_long, unit) {
    console.log(rider_lat, rider_long, pickup_lat, pickup_long, unit)

    if ((rider_lat === pickup_lat) && (rider_long === pickup_long)) {
        return 0;
    }
    else {
        let radlat1 = Math.PI * rider_lat/180;
        let radlat2 = Math.PI * pickup_lat/180;
        let theta = rider_long - pickup_long;
        let radtheta = Math.PI * theta/180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit === "K") { dist = dist * 1.609344 }
        if (unit === "N") { dist = dist * 0.8684 }
        return dist;
    }
}