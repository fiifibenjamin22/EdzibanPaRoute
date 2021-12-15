const async = require('async');
const ObjectID = require('mongodb').ObjectID;

const http_status = require('../../Helpers/http_stasuses');
const utils = require('../../Helpers/util');
const models = require('../../models');
const config = require('../../configs/config.js');

module.exports = {
    new_identification: (req, res) => {
        let required_fields = [
            {name: "user_id", message: "User Id is required"},
            {name: "identification_type", message: "Identification type is required"},
            {name: "date_of_birth", message: "Date of birth is required"},
            {name: "identification_image", message: "Identification image is required"},
            {name: "identification_number", message: "Identification number is required"},
            {name: "previous_home_address", message: "Previous home address from ghana post (asaase GPS) is required"},
            {name: "current_home_address", message: "Current home address from ghana post (asaase GPS) is required"},
            {name: "next_of_kin", message: "Next of kin is required"},
            {name: "next_of_kin_relation", message: "Next of kin relation is required"},
            {name: "next_of_kin_contact", message: "Next of kin contact is required"},
            {name: "next_of_kin_address", message: "Next of kin address is required"},
        ];
        let validate = utils.validate_required_fields(required_fields, req.body);
        if (!validate.is_validated){
            http_status.BAD_REQUEST(res, {message: validate.message});
            return;
        }
        models.identification_type.create(req.body, function (err, identification) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: identification});
        })
    },
    update_identification: (req, res)  => {
        let filter = {
            user_id: req.body.user_id
        };
        let updater = {
            is_verified: true
        };
        models.identification_type.update(filter, {'$set': updater}, function (err, updated_id) {
            if (err){
                http_status.BAD_REQUEST(res, {message: err.message});
                return;
            }
            http_status.OK(res, {message: updated_id});
        })
    }
};