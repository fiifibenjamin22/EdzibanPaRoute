let twilio = require('twilio');
let config = require('../configs/config.js');

module.exports = {
    send_message: function (message, to, callback) {
        console.log("twilio sends to: ",to);
        let client = new twilio(config.development.twilio.accountSid, config.development.twilio.authToken);
        client.messages.create({
            body: message,
            to: to, // Text this number
            from: config.development.twilio.from_number // From a valid Twilio number
        }, callback);
    }
};