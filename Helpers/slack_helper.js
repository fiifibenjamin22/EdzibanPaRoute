const IncomingWebhook = require('@slack/client').IncomingWebhook;
const config = require('../configs/config.js');

module.exports = {
    send_message: function (message, callback) {
        let url = config[config.env].slack_web_hook_url;
        let webhook = new IncomingWebhook(url);
        webhook.send(message, callback);
    }
};