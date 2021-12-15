let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    create_new_failed_transaction: function (data, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.failed_transactions_collection).insertOne(data, function (err, result) {
            callback(err, data);
        });
    },

    get_a_failed_transaction: function (filter, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.failed_transactions_collection).find(filter).limit(1).next(callback);
    },

    get_all_failed_transactions: function (filter, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.failed_transactions_collection).find(filter).toArray(callback);
    },

    remove_a_failed_transaction: function (filter, toDelete, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.failed_transactions_collection).deleteOne(filter, toDelete, callback);
    }

};