const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const http_status = require('../../Helpers/http_stasuses.js');
const utils = require('../../Helpers/util');
const models = require('../../models');
const constant = require('../../configs/constants');

module.exports = {
    create_size: (req, res) => {
        let required_array = [
            {name: "size_name", message: "Size name is required"}
        ];
        let validate = utils.validate_required_fields(required_array, req.body);
        if (!validate.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }

        let role_details = {
            size_name: req.body.size_name,
            date_created: new Date() * constant.LONG_DATE_MULTIPLIER,
            date_modified: new Date() * constant.LONG_DATE_MULTIPLIER
        };
        models.size.create(role_details, (err, new_size) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: new_size});
            }
        })
    },

    get_all_sizes: (req, res) => {
        models.size.get({}, {}, (err, size_details) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: size_details});
            }
        })
    },

    find_one_size: (req, res) => {
        let required_array = [
            {name: "size_name", message: "Size name is required"}
        ];
        let validate = utils.validate_required_fields(required_array, req.body);
        if (!validate.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        let filter = {'size_name': req.body.size_name};
        models.size.get_one(filter, {}, (err, size_details) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: size_details});
            }
        })
    },

    update_size: (req, res) => {
        let validate_request = validate_update_request(req.body);
        if (!validate_request.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate_request.message});
        }

        let filter = {'_id': ObjectID(req.body.size_id)};
        let set = get_size_update_data(req.body);
        if (Object.keys(set).length === 0) {
            http_status.BAD_REQUEST(res, {message: "No Data to update"});
        }
        set.date_modified = new Date();
        models.size.update_one(filter, {"$set": set}, function (err, update_result) {
            if (err) {
                http_status.INTERNAL_SERVER_ERROR(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: "Size Updated", "data": update_result});
        });
    },

    delete_size: (req, res) => {
        let filter = {'_id': ObjectID(req.body.size_id)};
        models.size.delete_one(filter, {}, (err, deleted_results) => {
            if (err) {
                http_status.INTERNAL_SERVER_ERROR(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: "Role Deleted", "data": deleted_results});
        });
    }
};


let validate_update_request = function (request_data) {
    if (request_data.date_modified && !moment(request_data.date_modified, 'YYYY-MM-DD', true).isValid()) {
        return {is_validated: 0, message: "Invalid Date Format"};
    }
    return {is_validated: 1, message: "OK"};
};

let get_size_update_data = function (update_obj) {
    let update_data = {};
    let required_data = ['size_name', 'date_modified', 'date_deleted'];
    required_data.forEach(function (item) {
        if (update_obj[item]) {
            update_data[item] = update_obj[item];
        }
    });
    return update_data;
};