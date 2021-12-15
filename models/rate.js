let mongo_connection = require('../Helpers/connect_mongo.js');
let db_constants = require('../configs/db_constants.js');

module.exports = {
    create_new_rating: function (data, callback) {
        let db = mongo_connection.get_connection();
        db.collection(db_constants.rider_rating_collection).insertOne(data, function (err, results) {
            callback(err, data);
        });
    }
};