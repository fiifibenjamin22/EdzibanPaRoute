const ObjectID = require('mongodb').ObjectID;
const http_status = require('../../Helpers/http_stasuses');
const utils = require('../../Helpers/util');
const models = require('../../models');
const constants = require('../../configs/constants');

module.exports = {
    create_category: (req, res) => {
        let required_fields = [
            {name: "cat_name", message: "Category name is required"}
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated) {
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        let category_details = {
            cat_name: req.body.cat_name,
            date_created: new Date() * constants.LONG_DATE_MULTIPLIER,
            date_modified: new Date() * constants.LONG_DATE_MULTIPLIER
        };
        models.category.create(category_details, (err, new_category) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: new_category});
            }
        })
    },

    fetch_categories: (req, res) => {
        models.category.get({}, (err, all_categories) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: all_categories});
            }
        });
    },

    update_a_category: (req, res) => {
        let filter = {
            _id:  ObjectID(req.body.category_id)
        };
        let set = get_category_update_data(req.body);
        if (Object.keys(set).length === 0) {
            http_status.BAD_REQUEST(res, {message: "No Data to update"});
        }
        set.date_modified = new Date();
        models.category.update_one(filter, {"$set": set}, (err, updated_category) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: updated_category});
            }
        })
    },

    delete_a_category: (req, res) => {
        let filter = {
            _id:  ObjectID(req.body.category_id)
        };
        models.category.delete_one(filter, {}, (err, deleted_category) => {
            if (err) {
                http_status.BAD_REQUEST(res, {message: err.message});
            }else{
                http_status.OK(res, {message: deleted_category});
            }
        })
    }
};

let get_category_update_data = function (update_obj) {
    let update_data = {};
    let required_data = ['cat_name', 'date_modified', 'date_deleted'];
    required_data.forEach(function (item) {
        if (update_obj[item]) {
            update_data[item] = update_obj[item];
        }
    });
    return update_data;
};