const ObjectID = require('mongodb').ObjectID;
const async = require('async');
const models = require('../../models');
const firebase = require('firebase-admin');
const http_status = require('../../Helpers/http_stasuses');
const constants = require('../../configs/constants');
const moment = require('moment');
const utils = require('../../Helpers/util');

// in here i am just logging to see whats coming from the server
module.exports = {
    payment_callback: (req, res) => {

        ///Debug data:- POSTMAN
        const payment_amount = req.body.amount
        const payment_date = req.body.date
        const payment_time = req.body.time
        const payment_status = req.body.status
        const payment_provider_code = req.body.provider_code
        const payment_recipient_number = req.body.recipient_no
        const ref_string = req.body.reference
        const request_id = req.body.request_id

        console.log(req.body)

        const payment_type = `${ref_string}`.slice(0,3);
        switch (payment_type) {
            case 'TKN':
                console.log("Token Purchase")
                token_payment(payment_recipient_number,payment_amount,payment_date,payment_time,payment_status,payment_provider_code,ref_string, req, res);
                break;
            case 'SVC':
                console.log("Service Payment");
                service_payment(request_id, payment_recipient_number,payment_amount,payment_date,payment_time,payment_status,payment_provider_code,ref_string, req, res);
                break;
            default:
                console.log(payment_type);
        }
    }
};

function service_payment(request_id, phone, amount, date, time, status, provider, ref_string, req, res) {
    let filter = {phone_number: phone};
    switch (status) {
        case 'CONFIRMED':
            async.waterfall([
                function (rider_callback) {
                    models.user.get(filter,{}, (err, the_user) => {
                        if (err) rider_callback(err, null);
                        if (!the_user) return http_status.BAD_REQUEST(res, {message: 'user not registered'})
                        if (!err) rider_callback(null, the_user);
                    });
                },
                function (the_user, generate_service_callback) {
                    let filter = {'_id': ObjectID(request_id)};
                    models.client_request.get(filter, (err, the_request) => {
                        if (err) generate_service_callback(err, null);
                        if (!err) generate_service_callback(null, the_user, the_request);
                    })
                },
                function (the_user, the_request, update_callback) {
                    let filter = {_id: ObjectID(the_request.rider_accepting_request._id)};
                    models.rider.get(filter, {}, (err, the_rider) => {

                        if (err) update_callback(err, null);
                        if (!err) update_callback(null, the_rider, the_user, the_request);
                    });
                },
                function (the_rider, the_user, the_request, send_notification_callback) {

                    let gcm_token = the_rider.fcm_token;
                    let message = {
                        notification:{
                            title: "Trip Payment",
                            body: "Payment for trip received",
                            click_action: "trip_payment"
                        },
                        data: {
                            message: `Payment for completed trip received`,
                            type: "trip_payment",
                            item_id: `${the_rider._id}`
                        }
                    };

                    let options = {
                        priority: "high",
                        timeToLive: 60 * 60 * 24
                    };

                    firebase.messaging().sendToDevice(gcm_token, message, options).then( (response) => {
                        console.log("Successfully sent message: ", response);
                        if (response.failureCount === 1){
                            response.responses.forEach(err => {
                                console.log(err.error.message);
                            })
                        }

                        let transaction_object = {
                            phone_number: phone,
                            amount: amount,
                            date: date,
                            time: time,
                            provider: provider,
                            reference: ref_string,
                            rider_id: the_rider._id,
                            request_id: request_id,
                            status: status
                        };
                        console.log(transaction_object)

                        models.service_payment.create(transaction_object, (err, transaction) => {

                            console.log("transaction_data: ",transaction);

                            if (err) send_notification_callback(err, null);
                            if (!err) send_notification_callback(null, transaction);
                        });

                    }).catch( (error) => {
                        console.log("Error sending message: ", error);
                        send_notification_callback(error, null);
                    });
                }

            ],(err, results) => {
                if (err) http_status.BAD_REQUEST(res, {message: err.message});
                if (!err) http_status.OK(res, {message: results});
            });
            break
        case 'CANCELLED':
            async.waterfall([
                function (rider_callback) {
                    console.log("failed");

                    models.user.get(filter,{}, (err, the_user) => {
                        if (err) rider_callback(err, null);
                        if (!err) rider_callback(null, the_user);
                    });
                },

                function (the_user, send_notification_callback) {

                    let gcm_token = the_user.fcm_token;
                    let message = {
                        notification:{
                            title: "Trip Payment",
                            body: "Payment for trip failed",
                            click_action: "trip_payment"
                        },
                        data: {
                            message: `Payment for completed trip failed`,
                            type: "trip_payment",
                            item_id: `${the_user._id}`
                        }
                    };

                    let options = {
                        priority: "high",
                        timeToLive: 60 * 60 * 24
                    };

                    firebase.messaging().sendToDevice(gcm_token, message, options).then( (response) => {
                        console.log("Successfully sent message: ", response);
                        send_notification_callback(null, the_user);
                    }).catch( (error) => {
                        console.log("Error sending message: ", error);
                        send_notification_callback(error, null);
                    });
                },

                function (the_rider, failed_transaction_callback) {
                    let transaction_object = {
                        phone_number: phone,
                        amount: amount,
                        date: date,
                        time: time,
                        provider: provider,
                        reference: ref_string,
                        rider_id: the_rider._id,
                        request_id: request_id,
                        status: status
                    };
                    models.failed_transaction.create_new_failed_transaction(transaction_object, (err, transaction) => {
                        if (err) failed_transaction_callback(err, null);
                        if (!err) failed_transaction_callback(null, transaction);
                    });
                }
            ],(err, results) => {
                if (err) http_status.BAD_REQUEST(res, {message: err.message});
                if (!err) http_status.OK(res, {message: results});
            });
            break
        default:
            console.log("nothing");
    }
}

//Token payment
function token_payment(phone, amount, date, time, status, provider, ref_string, req, res) {
    let filter = {phone_number: phone};
    switch (status) {
        case 'CONFIRMED':
            async.waterfall([
                function (rider_callback) {
                    models.rider.get(filter,{}, (err, the_rider) => {
                        if (err) rider_callback(err, null);
                        if (!err) rider_callback(null, the_rider);
                    });
                },
                function (the_rider, generate_token_callback) {
                    let order = `{
                        "phone_number": "${the_rider.phone_number}",
                        "last_name": "${the_rider.last_name}",
                        "id_number": "${the_rider.identification.identification_number}",
                        "amount": "${amount}",
                        "rider_id": "${the_rider._id}",
                        "accepted_requests": 0,
                        "payment_status": "0"
                        "date_purchased": "${new Date() * constants.LONG_DATE_MULTIPLIER}",
                        "date_modified": "${new Date(moment().format())}"
                    }`;

                    let password = the_rider.identification.date_of_birth;

                    let call_count = 1
                    const flat_Rate = 2.0
                    const number_of_tokens = amount / flat_Rate

                    console.log(number_of_tokens);

                    let encrypted = [];
                    while(call_count <= number_of_tokens){
                        let token = utils.encrypt_token(password, order);
                        encrypted.push(token);
                        call_count += 1
                    }

                    console.log(encrypted.length);

                    //let encrypted = utils.encrypt_token(password, order);
                    //let decrytped = utils.decrypt_token(encrypted, password);

                    generate_token_callback(null, the_rider, encrypted);
                },
                function (the_rider, encrypted, update_callback) {
                    let rider = the_rider;
                    rider.new_tokens.push(...encrypted);
                    rider.has_tokens = true;
                    rider.number_of_new_tokens = rider.new_tokens.length;
                    models.rider.update_user_details(filter, rider, (err, update_resp) => {
                        if (err) update_callback(err, null);
                        if (!err) update_callback(null, the_rider, update_resp);
                    });
                },

                function (the_rider, update_resp, send_notification_callback) {

                console.log(the_rider.fcm_token);

                    let gcm_token = the_rider.fcm_token;
                    let message = {
                        notification:{
                            title: "Token Purchases",
                            body: "Payment for token purchases successful",
                            click_action: "token_purchase"
                        },
                        data: {
                            message: `Payment for token purchases successful`,
                            type: "token_purchase",
                            item_id: `${the_rider._id}`
                        }
                    };

                    let options = {
                        priority: "high",
                        timeToLive: 60 * 60 * 24
                    };

                    firebase.messaging().sendToDevice(gcm_token, message, options).then( (response) => {
                        console.log("Successfully sent message: ", response);
                        let if_notification_Error = '';
                        if (response.failureCount === 1){
                            response.results.forEach(err => {
                                console.log(err.error.message);
                                if_notification_Error = err.error.message;
                            })
                        }

                        let transaction_object = {
                            phone_number: phone,
                            amount: amount,
                            date: date,
                            time: time,
                            provider: provider,
                            reference: ref_string,
                            rider_id: the_rider._id,
                            status: status,
                            if_notification_error: if_notification_Error
                        };
                        console.log(transaction_object)

                        models.token_payment.create(transaction_object, (err, transaction) => {

                            console.log("transaction_data: ",transaction);

                            if (err) send_notification_callback(null, the_rider);
                            if (!err) send_notification_callback(null, transaction);
                        });

                    }).catch( (error) => {
                        console.log("Error sending message: ", error);
                        send_notification_callback(error, null);
                    });
                },
            
            ],(err, results) => {
                if (err) http_status.BAD_REQUEST(res, {message: err.message});
                if (!err) http_status.OK(res, {message: results});
            });
            break
        case 'CANCELLED':
            async.waterfall([
                function (rider_callback) {
                    console.log("failed");

                    models.rider.get(filter,{}, (err, the_rider) => {
                        if (err) rider_callback(err, null);
                        if (!err) rider_callback(null, the_rider);
                    });
                },

                function (the_rider, send_notification_callback) {

                    let gcm_token = the_rider.fcm_token;
                    let message = {
                        notification:{
                            title: "Token Purchases",
                            body: "Payment for token purchases failed",
                            click_action: "token_purchase"
                        },
                        data: {
                            message: `Payment for token purchases failed`,
                            type: "token_purchase",
                            item_id: `${the_rider._id}`
                        }
                    };

                    let options = {
                        priority: "high",
                        timeToLive: 60 * 60 * 24
                    };

                    firebase.messaging().sendToDevice(gcm_token, message, options).then( (response) => {
                        console.log("Successfully sent message: ", response);
                        send_notification_callback(null, the_rider);
                    }).catch( (error) => {
                        console.log("Error sending message: ", error);
                        send_notification_callback(error, null);
                    });
                },

                function (the_rider, failed_transaction_callback) {
                    let transaction_object = {
                        phone_number: phone,
                        amount: amount,
                        date: date,
                        time: time,
                        provider: provider,
                        reference: ref_string,
                        rider_id: the_rider._id,
                        status: status
                    };
                    models.failed_transaction.create_new_failed_transaction(transaction_object, (err, transaction) => {
                        if (err) failed_transaction_callback(err, null);
                        if (!err) failed_transaction_callback(null, transaction);
                    });
                }
            ],(err, results) => {
                if (err) http_status.BAD_REQUEST(res, {message: err.message});
                if (!err) http_status.OK(res, {message: results});
            });
            break
        default:
            console.log("nothing");
    }
}
