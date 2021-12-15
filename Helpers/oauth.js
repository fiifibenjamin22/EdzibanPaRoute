let jwt = require('jsonwebtoken');
let config = require('../configs/config.js');
let http_status = require('./http_stasuses.js');

module.exports = {
    generate_token: function (user_id, callback) {
        jwt.sign({user_id: user_id}, config[config.env].jwt.secret, {expiresIn: config[config.env].jwt.expiry_days}, function (err, token) {
            if (err) {
                callback(err, null);
                return;
            }
            let token_details = {
                token: token,
                expiry_at: jwt.decode(token).exp
            };
            callback(null, token_details);
        });
    },
    verify_token: function (req, res, next) {
        if (!req.get('Authorization')) {
            http_status.UNAUTHORIZED(res, {message: 'Unauthorized'});
            return;
        }
        let token = req.get('Authorization').replace("Bearer ", "");
        jwt.verify(token, config[config.env].jwt.secret, function (err, decoded) {
            if (err) {
                http_status.UNAUTHORIZED(res, {message: err.message});
                return;
            }
            req.body.token_data = decoded;
            next();
        });
    }
};