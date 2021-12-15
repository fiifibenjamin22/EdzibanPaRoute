module.exports = {
    PARSING_ERROR: function (res, error) {
        res.status(error);
    },
    DB_INSERT_ERROR: function (res, error) {
        res.status(error);
    },
    DB_READ_ERROR : function(res , error){
        res.status(error);
    },
    FILE_READ_ERROR: function (res, error) {
        res.status(error);
    }
};


