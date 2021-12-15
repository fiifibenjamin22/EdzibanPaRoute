let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    get: function (filter, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.otp_collection).find(filter).limit(1).next(callback);
    },
    get_count: function (filter, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.otp_collection).find(filter).count(callback);
    },
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.otp_collection).insertOne(data, function (err, results) {
            callback(err, data);
        });
    },
    update_one: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.otp_collection).updateOne(filter, update, callback);
    }
};