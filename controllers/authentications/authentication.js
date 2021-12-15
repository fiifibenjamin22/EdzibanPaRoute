const moment        = require('moment'),
      async         = require('async'),
      ObjectID      = require('mongodb').ObjectID;
      //fs            = require('fs');

const oauth         = require('../../Helpers/oauth.js'),
      http_status   = require('../../Helpers/http_stasuses'),
      utils         = require('../../Helpers/util'),
      models        = require('../../models'),
      config         = require('../../configs/config.js'),
      twilio_helper = require('../../Helpers/sms_helper.js'),
      slack         = require('../../Helpers/slack_helper.js'),
      upload        = require('../../Helpers/file-upload');
      constant      = require('../../configs/constants');

module.exports = {

    // Step 1
    generate_otp: (req, res) => {
        async.waterfall([
            function (get_non_expired_otp) {
                let required_array = [
                    {name: "country_code", message: "Country code is required"},
                    {name: "phone_number", message: "Phone number is required"},
                    {name: "role_name", message: "Role name is required"}
                ];
                let validate = utils.validate_required_fields(required_array, req.body);
                if (!validate.is_validated) {
                    http_status.BAD_REQUEST(res, {message: validate.message});
                }

                let filter = {
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number,
                    date: { "$gte": new Date(moment().subtract(config[config.env].otp.expiry_time_in_minutes, 'minutes')) },
                    is_expired: 0
                };

                models.otp.get(filter, (err, non_expired_otp) => {
                    if (err) {
                        get_non_expired_otp(err);
                        return;
                    }
                    get_non_expired_otp(null, non_expired_otp);
                });
            },

            // Pass non-expired otp for a check
            function (non_expired_otp, otp_count_in_allowed_duration_callback) {
                if (non_expired_otp) {
                    if (non_expired_otp.sent_count >= config[config.env].otp.total_resend_allowed) {
                        otp_count_in_allowed_duration_callback({ status: 400, message: "Maximum Limit Reached" });
                        return;
                    }
                    otp_count_in_allowed_duration_callback(null, non_expired_otp);
                    return;
                }

                let filter = {
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number,
                    date: { "$gte": new Date(moment().subtract(config[config.env].otp.duration_for_maximum_limit_in_hours, 'hours')) }
                };

                models.otp.get_count(filter, function (err, otp_count) {

                    if (err) {
                        otp_count_in_allowed_duration_callback(err);
                        return;
                    }

                    if (otp_count >= config[config.env].otp.total_otp_allowed_in_duration) {
                        otp_count_in_allowed_duration_callback({ status: 400, message: "Maximum Limit Reached" });
                        return;
                    }
                    otp_count_in_allowed_duration_callback(null, non_expired_otp);
                });
            },

            // Generate and save otp
            function (non_expired_otp, generate_otp_callback) {
                if (non_expired_otp) {
                    generate_otp_callback(null, non_expired_otp);
                    return;
                }
                let otp_details = {
                    otp: utils.generate_otp(),
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number,
                    role_name: req.body.role_name,
                    date: new Date(),
                    is_expired: 0,
                    sent_count: 0
                };
                models.otp.create(otp_details, function (err, new_otp) {
                    if (err) {
                        generate_otp_callback(err);
                        return;
                    }
                    generate_otp_callback(null, new_otp);
                });
            }
        ], function (err, otp) {
            if (err) {
                if (err.status && err.status === 400) {
                    http_status.BAD_REQUEST(res, { message: err.message });
                    return;
                }
                http_status.INTERNAL_SERVER_ERROR(res, { message: err.message });
                return;
            }

            console.log("OTP Sent " + otp.otp);
            //http_status.OK(res, { message: "OTP Sent " + otp.otp });
            async.waterfall([
                function (send_otp_callback) {
                    let slack_message = "Phone Number :- " + otp.phone_number + "\n\One Time Password is " + otp.otp + " for Rider verification";
                    let text_message = "One Time Password is " + otp.otp + " for Rider verification";
                    let to = otp.country_code + otp.phone_number;
                    if (config.env !== "development") {
                        slack.send_message(slack_message, function (err, sent_result) {
                            if (err) {
                                send_otp_callback(err);
                                return;
                            }
                            send_otp_callback(null, sent_result);
                        });
                        return;
                        //mail_helper.mail_otp(otp, function (err, mail_success) {});
                    }
                    twilio_helper.send_message(text_message, to, function (err, sent_result) {
                        if (err) {
                            send_otp_callback(err);
                            return;
                        }
                        send_otp_callback(null, sent_result);
                    });
                },
                function (sent_result, sent_count_update_callback) {
                    let filter = { '_id': otp['_id'] };
                    let inc = { sent_count: 1 };
                    models.otp.update_one(filter, { "$inc": inc }, function (err, update_result) {
                        if (err) {
                            sent_count_update_callback(err);
                            return;
                        }
                        sent_count_update_callback(null, update_result);
                    });
                }
            ], function (err) {
                if (err) {
                    console.log(err.message);
                }else{
                    http_status.OK(res, { message: "OTP Sent " + otp.otp });
                    console.log("results sent");
                }
            });
        });
    },

    // Step 2
    check_number: (req, res) => {
        let required_fields = [
            {name: "phone_number", message: "Phone number is required"},
            {name: "country_code", message: "country code is required"},
            {name: "role_name", message: "user role is required"},
            {name: "otp", message: "OTP is required"},
            {name: "fcm_token", message: "FM Token is required"},
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
        }
        async.waterfall([
            // Verify OTP
            function (verify_otp_callback) {
                let filter = {
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number,
                    date: {"$gte": new Date(moment().subtract(config[config.env].otp.expiry_time_in_minutes, 'minutes'))},
                    is_expired: 0
                };
                models.otp.get(filter, function (err, non_expired_otp) {
                    if (err) {
                        verify_otp_callback(err);
                        return;
                    }
                    if (non_expired_otp === null) {
                        http_status.OK(res, {message: "OTP has expired, Generate a new OTP"})
                        return;
                    }
                    if (non_expired_otp.otp !== parseInt(req.body.otp)) {
                        http_status.OK(res, {message: "OTP verification Failed"})
                        return;
                    }
                    verify_otp_callback(null, non_expired_otp);
                });
            },
            function (non_expired_otp, set_otp_expired_callback) {
                let filter = {'_id': non_expired_otp['_id']};
                let set = {is_expired: 1};
                models.otp.update_one(filter, {"$set": set}, function (err, update_result) {
                    if (err) {
                        set_otp_expired_callback(err);
                        return;
                    }
                    //console.log("update otp: ",update_result);
                    set_otp_expired_callback(null, non_expired_otp, update_result);
                });
            },
            // Check number exist
            function (non_expired_otp, update_result, check_user_callback) {
                let filter = {
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number,
                };

                console.log("non-expired-otp: ",non_expired_otp);
                console.log(non_expired_otp['role_name']);
                if (non_expired_otp['role_name'] === "Rider") {
                    // Check rider DB
                    models.rider.get(filter, {}, (err, the_rider) => {
                        if (err){
                            check_user_callback(err, null);
                            return;
                        }
                        if (!the_rider){
                            http_status.OK(res, {message: "new user"})
                            return;
                        }
                        check_user_callback(null, the_rider, non_expired_otp, filter);
                    });
                }else{
                    models.user.get(filter, {}, function (err, the_user) {
                        if (err) {
                            check_user_callback(err);
                            return;
                        }
                        if (!the_user){
                            http_status.OK(res, {message: "new user"})
                            return;
                        }
                        check_user_callback(null, the_user, non_expired_otp, filter);
                    });
                }
            },
            function (the_user, otp, filter, callback) {
                console.log(req.body.fcm_token);

                let role = otp['role_name'];
                switch (role) {
                    case 'Rider':
                        let toUpdate = the_user;
                        toUpdate.fcm_token = req.body.fcm_token;
                        models.rider.find_and_update(filter, toUpdate, (err, updated) => {
                            if (err) callback(err, null);
                            if (!err) callback(null, otp, filter)
                        });
                        break
                    case 'Customer':
                        let toUpdateCustomer = the_user;
                        toUpdateCustomer.fcm_token = req.body.fcm_token;
                        models.user.find_and_update(filter, toUpdateCustomer, (err, updated) => {
                            if (err) callback(err, null);
                            if (!err) callback(null, otp, filter)
                        });
                        break
                    default:
                        console.log("nothing");
                }
            },
            function (otp, filter, check_user_callback) {
                let role = otp['role_name'];
                switch (role) {
                    case "Rider":
                        models.rider.get(filter, {}, (err, the_rider) => {
                            console.log("the customer: ", the_rider);

                            if (err) check_user_callback(err);
                            check_user_callback(null, the_rider);
                        });
                        break
                    case "Customer":
                        models.user.get(filter, {}, function (err, the_user) {
                            console.log("the customer: ", the_user);

                            if (err)  check_user_callback(err);
                            check_user_callback(null, the_user);
                        });
                        break
                    default:
                        console.log("nothing");
                }
            }
        ], function (err, results) {
            if (err){
                console.log(err);
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            if (results === null){
                http_status.OK(res, {message: 'new user'});
                return;
            }
            http_status.OK(res, {message: results});
        });
    },

    // Step 3
    signup: (req, res) => {
        let required_array = [
            //{name: "role_name", message: "Role name is required"},
            {name: "phone_number", message: "Phone number is required"},
            {name: "first_name", message: "First name is required"},
            {name: "last_name", message: "Last name is required"},
            {name: "fcm_token", message: "FCM Token is required"}
        ];

        let validate = utils.validate_required_fields(required_array, req.body);
        if (!validate.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate.message})
        }
        async.waterfall([
            // Upload image to s3
            function (upload_image_callback) {
                console.log(req.files);
                let file = req.files.image;
                let image_url = upload.uploadToS3(file.path);
                image_url.then(images => {
                    console.log("user image: "+images);
                    upload_image_callback(null, images);
                }).catch(err => {
                    console.log(err);
                    upload_image_callback(err);
                });
            },
            function (imageUrl, roles_callback) {
                let filter = {'role_name': req.body.role_name};
                models.role.get(filter, function (err, roles_results) {
                    if (err){
                        roles_callback(err);
                        return;
                    }
                    console.log(roles_results);
                    roles_callback(null, roles_results, imageUrl);
                });
            },
            function (roles, imageUrl, upsert_user_callback) {
                let filter = {
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number
                };

                let set = {
                    role_id: roles._id,
                    role_name: roles.role_name,
                    phone_number: req.body.phone_number,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    passport_photo: imageUrl,
                    device_id: req.body.device_id,
                    date_created: new Date() * constant.LONG_DATE_MULTIPLIER,
                    date_modified: new Date() * constant.LONG_DATE_MULTIPLIER,
                    fcm_token: req.body.fcm_token
                };

                if (roles.role_name === 'Rider') {
                    console.log("rider");
                    set.driver_is_fully_verified = false;
                    models.rider.upsert(filter, {"$set": set}, function (err, upsert_result) {
                        if (err) {
                            upsert_user_callback(err);
                            return;
                        }
                        upsert_user_callback(null, roles);
                    });
                }else{
                    console.log("Customer");
                    models.user.upsert(filter, {"$set": set}, function (err, upsert_result) {
                        if (err) {
                            upsert_user_callback(err);
                            return;
                        }
                        upsert_user_callback(null, roles);
                    });
                }
            },
            function (roles, get_user_callback) {
                let filter = {
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number
                };

                console.log(roles);

                if (roles.role_name === "Rider"){
                    models.rider.get(filter, {}, function (err, user_details) {
                        if (err) {
                            get_user_callback(err);
                            return;
                        }
                        console.log(user_details);

                        get_user_callback(null, user_details);
                    });
                }else{
                    models.user.get(filter, {}, function (err, user_details) {
                        if (err) {
                            get_user_callback(err);
                            return;
                        }

                        console.log(user_details);

                        get_user_callback(null, user_details);
                    });
                }
            },
            function (user_details, generate_token_callback) {
                oauth.generate_token(user_details['_id'], function (err, token) {
                    if (err) {
                        generate_token_callback(err);
                        return;
                    }
                    generate_token_callback(null, user_details, token);
                });
            },
            function (user_details, token, update_user_callback) {

                let filter = {
                    country_code: req.body.country_code,
                    phone_number: req.body.phone_number
                };

                user_details.access_token = token;

                if (req.body.role_name === 'Rider'){
                    models.rider.upsert(filter, {"$set": user_details}, (err, new_user_created) => {
                        if (err) {
                            update_user_callback(err, null);
                            return;
                        }
                        update_user_callback(null, filter, new_user_created);
                    })
                }else{
                    models.user.upsert(filter, {"$set": user_details}, (err, new_user_created) => {
                        if (err) {
                            update_user_callback(err, null);
                            return;
                        }
                        update_user_callback(null, filter, new_user_created);
                    })
                }
            },
            function (filter, new_user_created, get_user_callback) {

                if (req.body.role_name === "Rider"){
                    models.rider.get(filter, {}, function (err, user_details) {
                        if (err) {
                            get_user_callback(err);
                            return;
                        }
                        console.log(user_details);

                        get_user_callback(null, user_details);
                    });
                }else{
                    models.user.get(filter, {}, function (err, user_details) {
                        if (err) {
                            get_user_callback(err);
                            return;
                        }

                        console.log(user_details);

                        get_user_callback(null, user_details);
                    });
                }
            }
        ],function (err, user_details) {

            if (err) {
                if (err.status && err.status === 400) {
                    http_status.BAD_REQUEST(res, {message: err.message});
                    return;
                }
                http_status.INTERNAL_SERVER_ERROR(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: user_details});
        });
    },

    // Confirm Rider and Add his/Her Vehicle
    onboard_new_driver: (req, res) => {
        let required_fields = [
            {name: "user_id", message: "rider's user_id is required"}
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        async.waterfall([
           function (get_user_callback) {
               let filter = {
                   _id: ObjectID(req.body.user_id)
               };
                models.rider.get(filter,{}, function (err, the_user) {
                    if (err){
                        get_user_callback(err);
                        return;
                    }
                    get_user_callback(null, the_user);
                })
           },
            function (the_user, update_callback) {
                let filter = {
                    user_id: `${the_user._id}`
                };
                models.identification_type.get(filter, {}, function (err, user_identification) {
                    if (err){
                        update_callback(err);
                        return;
                    }
                    update_callback(null, the_user, user_identification);
                });
            },
            function (the_user, user_identification, vehicle_info_callback) {
                let filter = {
                    user_id: user_identification.user_id
                };
                models.vehicle_information.get(filter, function (err, vehicle_info) {
                    if (err){
                        vehicle_info_callback(err);
                        return;
                    }
                    //the_user.user_identification = user_identification;
                    //the_user.vehicle = vehicle_info;
                    vehicle_info_callback(null, the_user, user_identification, vehicle_info);
                })
            },
            function (the_user, user_identification, vehicle_info, user_update_callback) {
                let the_filter = {
                    _id: Object(the_user._id)
                };

                let objectToUpdate = the_user;
                objectToUpdate.identification = user_identification;
                objectToUpdate.vehicle_info = vehicle_info;
                objectToUpdate.rider_activated = false;
                objectToUpdate.rider_status = "idle";
                objectToUpdate.number_of_new_tokens = 0;
                objectToUpdate.number_of_used_tokens = 0;
                objectToUpdate.has_tokens = false;
                objectToUpdate.new_tokens = [];
                objectToUpdate.old_tokens = [];

                models.rider.update_user_details(the_filter, objectToUpdate, (err, new_rider) => {
                    if (err){
                        user_update_callback(err);
                        return;
                    }
                    user_update_callback(null, the_user, new_rider);
                });
            },
            function (the_user, new_rider, rider_callback) {
                let the_filter = {
                    _id: Object(the_user._id)
                };
                models.rider.get(the_filter, {}, function (err, the_rider) {
                    if (err){
                        rider_callback(err);
                        return;
                    }
                    rider_callback(null, the_rider);
                })
            }
        ], function (err, results) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err});
                return;
            }
            http_status.OK(res, {message: results});
        });
    },

    //Get the user
    fetch_user: (req, res) => {
        let filter = {_id: ObjectID(req.body.user_id)};

        async.waterfall([
            function(callback){
                models.user.get(filter, {}, (err, the_user) => {
                    if (err) return callback(err, null);
                    if (!the_user) return callback(null, filter);
                    if (the_user) return http_status.OK(res, {message: the_user});
                });
            },
            function(user,callback){
                models.rider.get(filter, {}, (err, the_rider) => {
                    if (err) return callback(err, null);
                    if (the_rider) return callback(null, the_rider);
                });
            }
        ],(err, result) => {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: result});
        })
    }
};

