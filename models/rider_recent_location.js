let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants.js');

module.exports = {

    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.riders_location_collection).ensureIndex({"location":"2dsphere"});

        db.collection(db_constants.riders_location_collection).insertOne(data, function (err, result) {
            callback(err, data);
        });
    },

    get: function (filter, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.riders_location_collection).find(filter).limit(1).next(callback);
    },

    find_all: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.riders_location_collection).find(filter).project(project).toArray(callback);
    },

    find_nearest: function (filter, callback) {
        let db = mongo_connection.get_connection();
        console.log(filter);
        db.collection(db_constants.riders_location_collection).find(filter).toArray(callback);
    }
};