const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const http_status = require('../../Helpers/http_stasuses.js');
const utils = require('../../Helpers/util');
const models = require('../../models');
const constant = require('../../configs/constants');

module.exports = {
    create_role: (req, res) => {
        let required_array = [
            {name: "role_name", message: "Role Name field is required"}
        ];
        let validate = utils.validate_required_fields(required_array, req.body);
        if (!validate.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }

        let role_details = {
            role_name: req.body.role_name,
            date_created: new Date() * constant.LONG_DATE_MULTIPLIER,
            date_modified: new Date() * constant.LONG_DATE_MULTIPLIER
        };
        models.role.create(role_details, (err, new_role) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: new_role});
            }
        })
    },

    get_all_roles: (req, res) => {
        models.role.find_all({}, {}, (err, role_details) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: role_details});
            }
        })
    },

    find_one_role: (req, res) => {
        let required_array = [
            {name: "role_name", message: "Role field is required"}
        ];
        let validate = utils.validate_required_fields(required_array, req.body);
        if (!validate.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        let filter = {'role_name': req.body.role_name};
        models.role.find_all(filter, {}, (err, role_details) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: role_details});
            }
        })
    },

    update_role: (req, res) => {
        let validate_request = validate_update_request(req.body);
        if (!validate_request.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate_request.message});
        }

        let filter = {'_id': ObjectID(req.body.role_id)};
        let set = get_role_update_data(req.body);
        if (Object.keys(set).length === 0) {
            http_status.BAD_REQUEST(res, {message: "No Data to update"});
        }
        set.date_modified = new Date();
        models.role.update_one(filter, {"$set": set}, function (err, update_result) {
            if (err) {
                http_status.INTERNAL_SERVER_ERROR(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: "Role Updated", "data": update_result});
        });
    },

    delete_role: (req, res) => {
        let filter = {'_id': ObjectID(req.body.role_id)};
        models.role.delete_one(filter, {}, (err, deleted_results) => {
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

let get_role_update_data = function (update_obj) {
    let update_data = {};
    let required_data = ['role_name', 'date_modified', 'date_deleted'];
    required_data.forEach(function (item) {
        if (update_obj[item]) {
            update_data[item] = update_obj[item];
        }
    });
    return update_data;
};