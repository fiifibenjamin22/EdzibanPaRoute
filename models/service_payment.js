let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants.js');

module.exports = {
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.service_payment_collection).insertOne(data, function (err, results) {
            callback(err, data);
        });
    },
    find_all: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.service_payment_collection).find(filter).project(project).toArray(callback);
    },
    get: function (filter, project, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.service_payment_collection).find(filter).project(project).limit(1).next(callback);
    },
};