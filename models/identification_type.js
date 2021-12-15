
let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.identification_type_collection).insertOne(data, function (err, results) {
            console.log(results);
            callback(err, data);
        })
    },

    get: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.identification_type_collection).find(filter).project(project).limit(1).next(callback);
    },

    update: function (filter, update, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.identification_type_collection).updateOne(filter, update, callback);
    }
};