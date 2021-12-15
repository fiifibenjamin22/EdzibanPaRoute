let AWS = require('aws-sdk');
let uuid = require('uuid4');

let s3 = new AWS.S3();

const bucket_name =  'kng-courier-bkt';
/* required; Bucket name */

module.exports.aws_fns = {

    init_bucket: async () =>{
        try {
            let params = {
                Bucket: bucket_name
            };

            let buckets = s3.headBucket(params, (err, data)=>{
                if(err){
                    console.log(err, err.stack);

                    //Creates bucket when
                    s3.createBucket(params, (err, data)=>{
                        if(err) console.log(err, err.stack)
                    })
                } else {
                    console.log(data)
                }
            })

        } catch (error) {
            console.log('Init Error [AWS S3] : ' +error)
        }
    },

    upload_files : async (folder_url, key, body) => {
        try {
            //let  url = bucket_name + '/' + folder_url;
            let param = {
                Bucket: bucket_name,
                Key: key,
                Body: body
            };

            console.log(param);

            s3promise = await s3.putObject(param).promise();

            if (s3promise.$response)
                return true;
            else
                return false

        } catch (error) {
            console.log('Upload Error [AWS S3]: '+error);
            return false
        }
    },

    download_files : async (uri) =>{
        try {
            let param = {
                Bucket: bucket_name,
                Key: uri
            };

            return s3.getObject(param, (err) =>{
                if (err) {
                    console.log(err);
                    return null;
                }
            }).promise()



        } catch (error) {
            console.log('Error [AWS S3] : ' +error);
            return null
        }
    },

    stream_file: async (uri)=>{
        try {
            const getParams = {
                Bucket: bucket_name,
                Key: uri
            };

            let s3Stream = s3.getObject(getParams).createReadStream();

            // Listen for errors returned by the service
            s3Stream.on('error', (err) =>{
                // NoSuchKey: The specified key does not exist
                console.error('Error [AWS S3 File stream] : ' +err);
                s3Stream.pause();
                s3Stream.emit('error');
                return null
            });

            return s3Stream

        } catch (error) {
            console.log('Error [AWS S3] : ' +error);
            return null
        }
    }
};
