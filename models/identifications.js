let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants');

module.exports = {
    create: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.identification_collection).insertOne(data, function (err, results) {
            callback(err, data);
        })
    }
};