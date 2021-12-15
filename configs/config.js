require('dotenv').config();

module.exports = {
    env: 'development',
    development: {
        PORT: 3000, //process.env.PORT,
        mongodb: {
            host: 'localhost',
            port: 27017,
            db: 'courier',
            connection_options: {poolSize: 10}
        },
        bcrypt_salt_rounds: 10,
        jwt: {
            secret: 'COUR!ER',
            expiry_days: '90 days'
        },
        slydpay: {
            values: {
                "emailOrMobileNumber": "stacey@kngtechnologies.com",
                "merchantKey": "1592438874545"
            },
            local_callback_url: "http://localhost:8000/api/v1/payments/callback",
            live_callback_url: "http://ec2-35-163-191-66.us-west-2.compute.amazonaws.com/api/v1/payments/callback"
        },
        otp: {
            expiry_time_in_minutes: 100,
            total_otp_allowed_in_duration: 100,
            duration_for_maximum_limit_in_hours: 24,
            total_resend_allowed: 30
        },
        twilio: {
            accountSid: "AC058904f1557c3925eb0636ba579c5a35",//"AC4e4585ba3db9d10be06041f5caa110e4",
            authToken: "c84c3f54ebbab2d0173c02a42dbb5208",//"ecd096e50c4b901fb8088f20a3279abc",
            from_number: "+18304235274"//"+12029521552"
        },
        slack_web_hook_url: "https://hooks.slack.com/services/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",
        riders:{
            location_time: 5
        },
        firebaseConfig: {
            serverKey: "AAAAcjSwSOk:APA91bGeVP8CmNZR4LhHuTGbz5bFFAiG1E8FuOq7vtE_M2D2iJwgk_dhBepJli873Dc0EyZPLcTQZ0QnHE7rejRHNLLNHGc7LWARmuvS_mRpUT4B2Exo8G0exWsPkoGg1YPQCTZD-mlH",
            senderId: "490510239977"
        },
        awsConfig: {
            AWS_SECRET_ACCESS: "FOPDWccSo7ljGdXaGivRFwF5ILYxnJ1cl+I7ei6S",//process.env.AWS_SECRET_ACCESS,
            AWS_ACCESS_KEY: "AKIA26JFFSFGVN2YON6X", //process.env.AWS_ACCESS_KEY,
            AWS_PORT: 9000
        },
        tokenization: {
            password: "",
            algorithm: "aes-192-cbc",
            buffer_size: 16,
            buffer_fill: 0,
            key_length: 24,
            salt: 'salt',
            input_encoding: 'utf8',
            output_encoding: 'hex',
            decipher_readable_event: 'readable',
            decipher_end_event: 'end'
        }
    }
};
