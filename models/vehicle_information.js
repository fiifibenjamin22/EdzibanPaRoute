let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.vehicle_collection).insertOne(data, function (err, results) {
            callback(err, data);
        });
    },
    get: function (filter, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.vehicle_collection).find(filter).limit(1).next(callback);
    },
    update: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.vehicle_collection).ensureIndex({"location":"2dsphere"});
        db.collection(db_constants.vehicle_collection).updateOne(filter, update, {upsert: true}, callback)//.updateOne(filter, update, callback);
    },

    nearest: function (filter, callback) {
        let db = mongo_connection.get_connection();
        console.log(filter);
        db.collection(db_constants.vehicle_collection).find(filter).toArray(callback);
    },

    find_all: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.vehicle_collection).find(filter).project(project).toArray(callback);
    },
};