const express = require('express');
const router = express.Router();

// Options Controllers
const roles = require('../controllers/Options/roles');
const sizes = require('../controllers/Options/sizes');
const categories = require('../controllers/Options/categories');
const settings = require('../controllers/Options/settings');

// Authentication Controller
const authentication = require('../controllers/authentications/authentication');

// Client Controller
const client_request = require('../controllers/clients/client_requests');
const client_report = require('../controllers/clients/clients_reports');

// Rider Controller
const identification_type = require('../controllers/riders/identification_types');
const vehicle_information = require('../controllers/riders/vehicles');
const vehicle_type_information = require('../controllers/Options/vehicle_type');
const rider_request = require('../controllers/riders/rider_requests');
const rider_location = require('../controllers/riders/recent_locations');
const rider = require('../controllers/riders/riders');
const rider_report = require('../controllers/riders/riders_reports');

// Tokens
const tokens = require('../controllers/tokens/tokens');

// Rates
const rate = require('../controllers/authentications/rating');

// Payments
const payments = require('../controllers/payments/payment_responses');
const client_payments = require('../controllers/clients/payment');

// Wallets
const wallets = require('../controllers/riders/wallets');

// Authentication - Routes
router.post('/auth/get_otp', authentication.generate_otp); // step 1
router.post('/auth/check_number', authentication.check_number); // Step 2
router.post('/auth/signup', authentication.signup); // step 3

// Riders
router.post('/auth/rider/identification', identification_type.new_identification);// step 3a
router.post("/auth/rider/vehicle", vehicle_information.add_new_vehicle);// step 3b
router.post('/auth/rider/onboard', authentication.onboard_new_driver); // step 4 for driver only
router.patch('/auth/rider/identification/verify', identification_type.update_identification);
router.patch("/auth/rider/vehicle/verify", vehicle_information.update_vehicle);

router.patch('/rider/activate', vehicle_information.activate_ride);
router.patch('/rider/change/status', rider_request.update_rider_status);

router.post('/rider/accept/order', rider_request.accept_orders_from_customers);
router.post('/rider/start/trip', rider_request.start_trip);
router.post('/rider/end/trip', rider_request.end_trip);

router.post('/rider/location/new', rider_location.add_rider_new_location);
router.post('/rider/location/recent', rider_location.fetch_rider_last_location);

router.post('/rider/cancel/order', rider_request.cancel_request_from_customers);
router.post('/rider/status', rider.check_rider_status);
router.post('/rider/last/task/status', rider_request.last_task_state);
router.post('/rider/request/history', rider_request.rider_request_history);
router.post('/rider/request/detail', rider_request.riders_specific_request_by_id);

router.post('/rider/daily/summary', rider_report.daily_reports);
router.post('/rider/all/token/receipts', rider_report.all_token_receipts);
router.post('/rider/token/receipt_detail', rider_report.a_token_receipt);

// Clients
router.post('/client/available/rides', client_request.all_idle_rides_nearby);
router.post('/client/check/recipient', client_request.check_recipient);
router.post('/client/new_request', client_request.request_distance_and_fares);// Step 4
router.post('/client/confirm/request', client_request.confirm_and_broadcast_request);// Step 5
router.post('/client/cancel/request', client_request.customer_cancel_ride);
router.post('/client/cancel/unaccepted_request', client_request.customer_cancel_request);
router.post('/client/request/history', client_request.client_request_history);
router.post('/client/specific/request', client_request.client_specific_request_by_id);
router.post('/client/suspend', client_report.suspend_client);
router.post('/client/reinstate', client_report.reinstate_client);
router.post('/client/status', client_report.check_client_status);
router.post('/client/payment/all_receipt', client_report.all_payment_receipt);
router.post('/client/payment/receipt_detail', client_report.receipt_detail);
router.post('/client/check/rider_moving', client_request.check_rider_location_after_accepting_req);
router.post('/client/one/user', authentication.fetch_user);

// General
router.post('/user/last/ongoing/request', rider_request.last_ongoing_request);

// Options Routes
router.post('/category/new', categories.create_category);
router.get('/category/all', categories.fetch_categories);
router.patch('/category/update', categories.update_a_category);
router.delete('/category/delete', categories.delete_a_category);

router.post('/role/new', roles.create_role);
router.get('/role/all', roles.get_all_roles);
router.post('/role/one', roles.find_one_role);
router.patch('/role/update', roles.update_role);
router.delete('/role/delete', roles.delete_role);

router.post('/size/new', sizes.create_size);
router.get('/size/all', sizes.get_all_sizes);
router.post('/size/one', sizes.find_one_size);
router.patch('/size/update', sizes.update_size);
router.delete('/size/delete', sizes.delete_size);

router.post('/vehicle/type/add', vehicle_type_information.new_vehicle_type);
router.get('/vehicle/type/all', vehicle_type_information.get_vehicle_types);
router.post('/vehicle/type/one', vehicle_type_information.get_a_vehicle_type);

// Tokens
router.post('/token/new', tokens.generate_new_token);
router.post('/token/balance', tokens.check_token_balances);
router.post('/token/purchase/history', tokens.all_token_purchases);
router.post('/token/purchase/history_item', tokens.get_a_token_purchase_detail);
router.delete('/token/purchase/delete/history_item', tokens.delete_a_token_purchase);

// Rating
router.post('/auth/user/rate', rate.rate_rider);

// Payments
router.post('/payments/callback', payments.payment_callback);
router.post('/payment/client/pay', client_payments.make_payment);
router.post('/payment/client/history', client_payments.payment_history);
router.post('/payment/rider/history', tokens.token_payment_history);

// Settings
router.post('/settings/share/live_location', settings.share_live_location);
router.post('/settings/client/save_locations', settings.save_client_locations);
router.post('/settings/retrieve/issues', settings.retrieve_frequent_issues);
router.post('/settings/submit/client_report', settings.submit_client_reports);

//Wallets
router.post('/rider/create/wallet', wallets.create_new_wallet);
router.post('/rider/wallet/add_money', wallets.add_cash_to_wallet);
router.post('/rider/wallet/balance', wallets.get_wallet_balance);
router.post('/rider/wallet/remove', wallets.remove_wallet);

module.exports = router;