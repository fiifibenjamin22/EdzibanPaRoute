function define(name, value) {
    Object.defineProperty(exports, name, {
        value: value,
        enumerable: true
    });
}

define("role_collection", "roles");
define("size_collection", "sizes");
define("otp_collection", "otps");
define("user_collection", "users");
define("rider_collection", "riders");
define("category_collection", "categories");

define("client_request_collection", "client_requests");

define("identification_type_collection", "identification_types");
define("identification_collection", "identifications");
define("vehicle_collection", "vehicles");
define("vehicle_type_collection", "vehicle_types");
define("riders_information_collection", "riders_information");
define("riders_location_collection", "riders_location");
define("new_token_collection", "new_tokens");
define("old_token_collection", "used_tokens");
define("rider_rating_collection", "ratings");
define("settings_collection", "settings");
define("reports_collection", "reports");
define("token_payments_collection", "token_payments");
define("service_payment_collection", "service_payments");
define("failed_transactions_collection", "failed_transactions");