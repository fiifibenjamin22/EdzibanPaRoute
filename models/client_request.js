let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants.js');

module.exports = {
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.client_request_collection).ensureIndex({"pickup_location":"2dsphere"});
        db.collection(db_constants.client_request_collection).ensureIndex({"destination_location":"2dsphere"});
        db.collection(db_constants.client_request_collection).insertOne(data, function (err, results) {
            callback(err, data);
        });
    },

    upsert: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.client_request_collection).updateOne(filter, update, {upsert: true}, callback);
    },

    delete_one: function (filter, toDelete, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.client_request_collection).deleteOne(filter, toDelete, callback);
    },

    get: function (filter, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.client_request_collection).find(filter).limit(1).next(callback);
    },

    get_all: function (filter, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.client_request_collection).find(filter).toArray(callback);
    },

    get_distance_btn_pickup_n_rider: function (filter, riders_location, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.client_request_collection).aggregate([riders_location],(err, data) => {
            console.log(err);
            console.log(data);
            if (err) callback(err, null);
            callback(null, data);
        })
    }
};