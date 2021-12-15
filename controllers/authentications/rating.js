const   async         = require('async'),
        ObjectID      = require('mongodb').ObjectID;
        firebase       = require('firebase-admin');

const   models       = require('../../models/rider');
        constant      = require('../../configs/constants');
        http_status   = require('../../Helpers/http_stasuses');

module.exports = {
    rate_rider: (req, res) => {
        async.waterfall([
            function (callback) {
                let body = {
                    user_id: req.body.user_id,
                    rider_id: req.body.rider_id,
                    no_of_stars: req.body.no_of_stars,
                    date_created: Date() * constant.LONG_DATE_MULTIPLIER
                };
                models.rate.create_new_rating(body, function (err, rated_data) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, rated_data);
                });
            },
            function (rated_data, callback) {
                let filter = {_id: ObjectID(rated_data.rider_id)};
                models.rider.get(filter,{},function (err, the_rider) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, the_rider, rated_data);
                });
            },
            function (the_rider,rated_data, callback) {
                let filter = {_id: ObjectID(rated_data.user_id)};
                models.user.get(filter,{},function (err, the_user) {
                    if (err){
                        callback(err, null);
                        return;
                    }
                    callback(null, the_rider,the_user,rated_data);
                });
            },
            function (the_rider,the_user,rated_data,callback) {
                let payload = {
                    data: {
                        message: `Hello ${the_rider.last_name}, ${the_user.first_name} has rated you ${rated_data.no_of_stars}`
                    }
                };
                let options = {
                    priority: "high",
                    timeToLive: 60 * 60 * 24
                };
                firebase.messaging.sendToDevice(the_rider.fcm_token, payload, options).then(function (response) {
                    console.log("Successfully sent message: ", response);
                    callback(null, response);
                }).catch(function (error) {
                    console.log("Error sending message: ", error);
                    callback(error);
                });
            }
        ], function (err, result) {
            if (err){
                http_status.BAD_REQUEST(res, {error: err.message});
            }else{
                http_status.OK(res, {message: result});
            }
        })
    }
};