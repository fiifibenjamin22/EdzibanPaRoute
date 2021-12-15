const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs  = require('fs');
const util = require('util');
const uuidv4 = require('uuid4');

const config = require('../configs/config');
const bucket_name =  'kng-courier-bkt-1';

const s3 = new aws.S3({
    secretAccessKey: config.development.awsConfig.AWS_SECRET_ACCESS,
    accessKeyId: config.development.awsConfig.AWS_ACCESS_KEY,
    region: "us-west-2"
});

module.exports = {
    uploadToS3: async (data) => {
        let name = uuidv4();
        let file_url = `https://kng-courier-bkt.s3-us-west-2.amazonaws.com/${name}`;
        let params = {
            Bucket: bucket_name,
            ContentType: 'image/jpeg',
            Key: name,
            Body: data,
            ACL: 'public-read'
        };
        await s3.putObject(params).promise();
        console.log(file_url);
        return file_url;
    }
};