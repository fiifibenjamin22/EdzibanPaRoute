let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    get: function (filter, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.category_collection).find(filter).toArray(callback);
    },

    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.category_collection).insertOne(data, function (err, results) {
            callback(err, data);
        })
    },

    get_one: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.category_collection).find(filter).limit(1).next(callback);
    },

    update_one: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.category_collection).updateOne(filter, update, callback);
    },

    delete_one: function (filter, toDelete, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.category_collection).deleteOne(filter, toDelete, callback);
    }
};