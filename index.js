const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

let workers = [];

if (cluster.isMaster) {
    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
        workers.push(cluster.fork());

        // to receive messages from worker process
        workers[i].on('message', function(message) {
            //console.log(message);
        });
    }

    // process is clustered on a core and process id is assigned
    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.process.pid + ' is listening');
    });

    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.process.pid + 'died');
        process.exit(1);
    });
} else {

    const   express     = require('express');
            BodyParser  = require('body-parser');
            app         = express();
            server      = require('http').createServer(app);
            io          = require('socket.io')(server);
            firebase     = require('firebase-admin');
            formData    = require("express-form-data");
            os          = require("os");
            path        = require('path');
            multer      = require('multer');
            morgan      = require('morgan');

    require('dotenv').config();

    const routes = require('./views/routes');
    const config = require('./configs/config');
    let http_status = require('./Helpers/http_stasuses');
    let serviceAccount = require("./configs/courier-f9fdc-firebase-adminsdk-c87pw-ba9684bc50.json");

// ENV --> Check
//console.log("ENV --> " + config.env);
    const options = {
        uploadDir: os.tmpdir(),
        autoClean: true
    };

    app.use(BodyParser.json());
    app.use(BodyParser.urlencoded({extended: true}));
    app.use(formData.parse(options));
    app.use(morgan('dev'));

    app.use('/api/v1/', routes);

// Firebase configuration
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount),
        databaseURL: "https://courier-f9fdc.firebaseio.com"
    });

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(multer({dest: __dirname + '/public'}).single('image'));
    app.use(express.static(__dirname + '/public'));

// catch 404 error handler
    app.use(function (req, res) {
        http_status.NOT_FOUND(res);
    });

// error handler
    app.use(function (err, req, res) {
        http_status.INTERNAL_SERVER_ERROR(res, { message: err.message });
    });

// Mongo Connection
    require('./Helpers/connect_mongo.js').connect_mongo(function () {
        console.log('listening on port: ', config.development.PORT);
        server.listen(config.development.PORT);
    });

    module.exports = app;
}