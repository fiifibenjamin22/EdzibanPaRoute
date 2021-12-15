let config = require('../configs/config.js');
let async = require('async');
let uuid = require('uuid4');
let moment = require('moment');
const crypto = require('crypto');
const rp = require('request-promise');
process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser;
const models = require('../models');
const ObjectID = require('mongodb').ObjectID;

let EventEmitter = require("events").EventEmitter;
let body = new EventEmitter();
let toReturn;

module.exports = {
    validate_required_fields: function(required_array, validate_object) {
        for (let i = 0; i < required_array.length; i++) {
            if (!validate_object[required_array[i].name]) {
                return { is_validated: 0, message: required_array[i].message };
            }
        }
        return { is_validated: 1, message: "OK" };
    },
    validate_email_address: function(email) {
        let reg_exp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return reg_exp.test(email);
    },
    generate_otp: function() {
        return Math.floor(100000 + Math.random() * 900000);
    },
    encrypt_token: function(password, content) {
        const key = crypto.scryptSync(password, config.development.tokenization.salt, config.development.tokenization.key_length);
        const iv = Buffer.alloc(config.development.tokenization.buffer_size, config.development.tokenization.buffer_fill);
        const algorithm = config.development.tokenization.algorithm;

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(content, config.development.tokenization.input_encoding, config.development.tokenization.output_encoding);
        encrypted += cipher.final(config.development.tokenization.output_encoding);
        //console.log(encrypted);

        return encrypted;
    },

    stringToBoolean: function(string){
        switch(string.toLowerCase().trim()){
            case "true": case "yes": case "1": return true;
            case "false": case "no": case "0": case null: return false;
            default: return Boolean(string);
        }
    },

    calculate_fare: function(distance, time, base_fare) {
        const base_charge = base_fare;
        const fare = base_charge + ((distance * time) / (base_charge + 1.5));
        return round(fare, 1);
    },

    forEachThen: function list_gcm_tokens(item,cb) {
        let amount_earned = 0;
        setTimeout(() => {
            amount_earned += item.fare;
            cb(amount_earned);
        }, 100);
    },

    forEachDistanceThen: function list_gcm_tokens(item,cb) {
        let distance = 0;
        setTimeout(() => {
            distance += item.distance;
            cb(distance);
        }, 100);
    },

    decrypt_token: function(encrypted, password) {
        const key = crypto.scryptSync(password, config.development.tokenization.salt, config.development.tokenization.key_length);
        const iv = Buffer.alloc(config.development.tokenization.buffer_size, config.development.tokenization.buffer_fill);
        const algorithm = config.development.tokenization.algorithm;

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = '';
        let new_decrypted = '';
        decipher.on(config.development.tokenization.decipher_readable_event, () => {
            while (null !== (chunk = decipher.read())) {
                decrypted += chunk.toString(config.development.tokenization.input_encoding);
            }
        });
        decipher.on(config.development.tokenization.decipher_end_event, () => {
            new_decrypted = decrypted;
        });
        const the_encrypted = encrypted;
        decipher.write(the_encrypted, config.development.tokenization.output_encoding);
        decipher.end();

        return new_decrypted;
    },

    merge_objects: function extend(dest, src) {
        for(let key in src) {
        dest[key] = src[key];
    }
        return dest;
    },

    //Slydpay
    slydpay_invoice: async function(data,payment_type, create_invoice_callback) {

        let payment_method = data.the_req_info.payment_method;
        let payment_options = ["VODAFONE_CASH", "AIRTEL_MONEY", "MTN_MONEY", "VODAFONE_CASH_PROMPT"];

        for (let i = 0; i < payment_options.length; i++) {
            let supp = payment_options[i];

            console.log(supp === payment_method);

            if (payment_method === supp) {
                let invoice = get_create_and_send_invoice(config.development.slydpay.values, data, supp,payment_type);
                toReturn = invoice;
            }
        }

        let resp = await toReturn.then(resp => {
            return resp;
        }).catch(err => {
            console.log(err);
            return err;
        });

        create_invoice_callback(null, resp);
    }
};

const get_create_and_send_invoice = async (values, data, payment_method,payment_type) => {

    let body = {
        "emailOrMobileNumber": values.emailOrMobileNumber,
        "merchantKey": values.merchantKey,
        "amount": data.the_req_info.amount,
        "description": data.payment_desc,
        "orderCode": uuid(),
        "sendInvoice": true,
        "payOption": payment_method,
        "customerName": `${data.the_user.first_name} ${data.the_user.last_name}`,
        "customerMobileNumber": data.the_req_info.phone_number
    };

    let options = {
        url: 'https://app.slydepay.com.gh/api/merchant/invoice/create',
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        json: body
    };

    let response = rp(options);

    await response.then(d => {

        (function payment_status() {
            const statusInfo = check_payment_status(d, values);
            response = statusInfo;

            statusInfo.then(status_data => {
                switch (status_data.result) {
                    case "NEW":
                        console.log("new")
                        setTimeout(payment_status, 10000);
                        break
                    case "PENDING":
                        console.log("pending")
                        confirm_transaction(d, values)
                        setTimeout(payment_status, 10000);
                        break
                    case "CONFIRMED":
                        (function confirmTransaction() {
                            const transaction_info = confirm_transaction(d, values);
                            transaction_info.then(inf => {

                                if (inf.result !== "CONFIRMED") {
                                    confirm_transaction(d, values);
                                    setTimeout(confirmTransaction, 10000);
                                }

                                send_payment_to_callback(inf, data, payment_method, payment_type);
                            }).catch(e => {
                                console.log(e.message);
                            })
                        })()
                        break
                    case "DISPUTED":
                        console.log("DISPUTED")
                        send_payment_to_callback(status_data, data, payment_method, payment_type);
                        break
                    case "CANCELLED":
                        console.log("CANCELLED")
                        send_payment_to_callback(status_data, data, payment_method, payment_type);
                        break
                    default:
                        console.log("nothing");
                }
            }).catch(err => {
                console.log(err.message);
            })
        })()
    });

    return response;
};

const send_payment_to_callback = (payment_state_info, data, payment_method, payment_type) => {
    let body = {
        phone_number: data.the_req_info.phone_number,
        amount: data.the_req_info.amount,
        date: new Date(moment().date()),
        time: new Date(moment().time),
        provider: payment_method,
        reference: `${payment_type}${create_ref_id(10)}`,
        status: payment_state_info.result,
        request_id: data._id
    };

    console.log("data to callback: ", body);

    let options = {
        url: config.development.slydpay.live_callback_url,
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        json: body
    }

    let response = rp(options);
    response.then(to_callback => {
        console.log(to_callback);
    });

    return response;
}

function create_ref_id(length) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const check_payment_status = (resp_data, req_data) => {

    console.log(resp_data);
    //console.log(body);

    let body = {
        "emailOrMobileNumber": req_data.emailOrMobileNumber,
        "merchantKey": req_data.merchantKey,
        "orderCode": resp_data.result.orderCode,
        "payToken": resp_data.result.payToken,
        "confirmTransaction": true
    };

    let options = {
        url: 'https://app.slydepay.com.gh/api/merchant/invoice/checkstatus',
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        json: body
    }

    const response = rp(options);

    return response
};

const confirm_transaction = (resp_data, req_data) => {
    let body = {
        "emailOrMobileNumber": req_data.emailOrMobileNumber,
        "merchantKey": req_data.merchantKey,
        "orderCode": resp_data.result.orderCode,
        "payToken": resp_data.result.payToken,
    };

    let options = {
        url: 'https://app.slydepay.com.gh/api/merchant/transaction/confirm',
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        json: body
    }

    const response = rp(options);

    return response;
};

function round(value, precision) {
    let multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}