let config = require('../configs/config.js');

let state = {db: null};

module.exports = {
    connect_mongo: function (callback) {
        if (!state.db) {
            let MongoClient = require('mongodb').MongoClient;
            let host = config[config.env].mongodb.host;
            let port = config[config.env].mongodb.port;
            let db_name = config[config.env].mongodb.db;
            let url = `mongodb://${host}:${port}/${db_name}`;
            MongoClient.connect(url,{ poolSize: 10 }, function (err, db) {
                if (err) {
                    console.log("Mongo Connection Failed");
                    process.exit(1);
                    return;
                }
                console.log("Connected successfully to Mongodb server");
                state.db = db;
                callback();
            });
        } else {
            callback();
        }
    },
    get_connection: function () {
        return state.db;
    }
};



