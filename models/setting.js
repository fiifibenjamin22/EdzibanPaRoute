let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants.js');

module.exports = {
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.settings_collection).insertOne(data, function (err, results) {
            callback(err, results);
        });
    },
    upsert: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.settings_collection).updateOne(filter, update, {upsert: true}, callback);
    },
    get: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.settings_collection).find(filter).project(project).limit(1).next(callback);
    },
    update_user_details: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.settings_collection).updateOne(filter, update, {upsert: true}, callback);
    },
    find_all: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.settings_collection).find(filter).project(project).toArray(callback);
    },
    find_and_update: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.settings_collection).replaceOne(filter, update, {upsert: true}, callback);
    }
};

