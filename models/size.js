let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.size_collection).insertOne(data, function (err, results) {
            callback(err, data);
        });
    },

    get: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.size_collection).find(filter).project(project).toArray(callback);
    },

    get_one: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.size_collection).find(filter).project(project).limit(1).next(callback);
    },

    update_one: function (filter, toUpdate, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.size_collection).updateOne(filter, toUpdate, callback);
    },

    delete_one: function (filter, toDelete, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.size_collection).deleteOne(filter, toDelete, callback);
    }
};