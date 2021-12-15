let fs = require("fs");
let path = require("path");
let controllers = {};

fs.readdirSync(__dirname).filter(function (file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
}).forEach(function (file) {
    let file_name = file.replace(".js", "");
    controllers[file_name] = require(path.join(__dirname, file));
});

module.exports = controllers;

