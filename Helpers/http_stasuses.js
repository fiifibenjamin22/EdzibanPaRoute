const HTTPStatus = require('http-status');

module.exports = {
    OK: function (res, data) {
        res.status(HTTPStatus.OK).json(data);
    },
    NOT_FOUND: function (res) {
        res.status(HTTPStatus.NOT_FOUND).json({message: HTTPStatus[404]});
    },
    INTERNAL_SERVER_ERROR: function (res, data) {
        res.status(HTTPStatus.INTERNAL_SERVER_ERROR).json(data);
    },
    BAD_REQUEST: function (res, data) {
        res.status(HTTPStatus.BAD_REQUEST).json(data);
    },
    FORBIDDEN: function (res, data) {
        res.status(HTTPStatus.FORBIDDEN).json(data);
    },
    UNAUTHORIZED: function (res, data) {
        res.status(HTTPStatus.UNAUTHORIZED).json(data);
    }
};


