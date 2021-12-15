// const express = require('express');
// const router = express.Router();
//
// // Options Controllers
// const roles = require('../controllers/Options/roles');
// const categories = require('../controllers/Options/categories');
//
// // Authentication Controller
// const authentication = require('../controllers/authentications/authentication');
//
// // Client Controller
// const client_request = require('../controllers/clients/requests');
//
// // Rider Controller
// const identification_type = require('../controllers/riders/identification_types');
// const vehicle_information = require('../controllers/riders/vehicles');
// const rider_request = require('../controllers/riders/requests_info');
// const rider_location = require('../controllers/riders/recent_locations');
//
// // Role - Routes
// router.post('/role/new', roles.create_role);
// router.get('/role/all', roles.get_all_roles);
// router.post('/role/one', roles.find_one_role);
// router.patch('/role/update', roles.update_role);
// router.delete('/role/delete', roles.delete_role);
//
// // Authentication - Routes
// router.post('/auth/get_otp', authentication.generate_otp); // step 1
// router.post('/auth/signup', authentication.signup); // step 2
// router.post('/auth/rider/identification', identification_type.new_identification);// step 2a
// router.post("/auth/rider/vehicle", vehicle_information.add_new_vehicle);// step 2b
// router.post('/auth/rider/onboard', authentication.onboard_new_driver); // step 3 for driver only
//
// // Options Routes
// router.post('/category/new', categories.create_category);
// router.get('/category/all', categories.fetch_categories);
// router.patch('/category/update', categories.update_a_category);
// router.delete('/category/delete', categories.delete_a_category);
//
// router.patch('/auth/rider/identification/update', identification_type.update_identification);
// router.patch("/auth/rider/vehicle/update", vehicle_information.update_vehicle);
//
// // Clients
// router.post('/client/riders/avail/fare', client_request.available_rides_and_calculate_fares);// Step 4
// router.post('/client/confirm/request', client_request.confirm_and_broadcast_request);// Step 5
//
// // Riders
// router.patch('/rider/change/status', rider_request.update_rider_status);
// router.post('/rider/accept/order', rider_request.accept_orders_from_customers);
// router.post('/rider/location/new', rider_location.get_rider_location_now);
//
// module.exports = router;