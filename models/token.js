let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    create_new_token: function (data, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.new_token_collection).insertOne(data, function (err, result) {
            callback(err, data);
        });
    },

    get_a_new_token: function (filter, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.new_token_collection).find(filter).limit(1).next(callback);
    },

    get_all_new_tokens: function (filter, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.new_token_collection).find(filter).toArray(callback);
    },

    update_a_token: function (filter, update, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.new_token_collection).updateOne(filter, update, callback);
    },

    remove_a_token: function (filter, toDelete, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.new_token_collection).deleteOne(filter, toDelete, callback);
    },

    //old Tokens
    add_old_token: function (data, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.old_token_collection).insertOne(data, function (err, result) {
            callback(err, data);
        });
    },

    get_all_old_tokens: function (filter, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.old_token_collection).find(filter).toArray(callback);
    },

    remove_old_token: function (filter, toDelete, callback) {
        const db = mongo_connection.get_connection();
        db.collection(db_constants.old_token_collection).deleteOne(filter, toDelete, callback);
    }
};