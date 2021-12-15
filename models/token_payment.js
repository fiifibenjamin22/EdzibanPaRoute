let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {

    create: function (data, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.token_payments_collection).insertOne(data, function (err, result) {
            callback(err, data);
        });
    },

    get_a_token_payment: function (filter, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.token_payments_collection).find(filter).limit(1).next(callback);
    },

    get_all_token_payment: function (filter, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.token_payments_collection).find(filter).toArray(callback);
    },

    update_a_token_payment: function (filter, update, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.token_payments_collection).updateOne(filter, update, callback);
    },

    remove_a_token_payment: function (filter, toDelete, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.token_payments_collection).deleteOne(filter, toDelete, callback);
    }

};