# Multer S3 Transform

## Note on tycrek's fork

My fork is a fork of [AssetVal/multer-s3](https://github.com/AssetVal/multer-s3) which is a fork of [kyh/multer-s3](https://github.com/kyh/multer-s3) which is a fork of [gmenih341/multer-s3](https://github.com/gmenih341/multer-s3) which is a fork of [badunk/multer-s3](https://github.com/badunk/multer-s3). With my fork, I aim to centralize changes from all upstreams (when possible) and keep dependencies up-to-date. I don't know all the major changes between each fork, but the most significant one is [@kyh](https://github.com/kyh) adding [Transform](https://github.com/tehkaiyu/multer-s3#transforming-files-before-upload).

I have published this repo on [npm](https://www.npmjs.com/package/tycrek-s3-transform). It can be used in place of any of the aformentioned forks.

---

> This is a fork of [Multer S3](https://github.com/badunk/multer-s3), kept up to date, with the added [Transform](https://github.com/tehkaiyu/multer-s3#transforming-files-before-upload) property.

Streaming multer storage engine for AWS S3.

This project is mostly an integration piece for existing code samples from Multer's [storage engine documentation](https://github.com/expressjs/multer/blob/master/StorageEngine.md) with [s3fs](https://github.com/RiptideElements/s3fs) as the substitution piece for file system.  Existing solutions I found required buffering the multipart uploads into the actual filesystem which is difficult to scale.

## Installation

```sh
npm i tycrek-s3-transform
```

## Usage

```javascript
var aws = require('aws-sdk')
var express = require('express')
var multer = require('multer')
var multerS3 = require('tycrek-s3-transform')

var app = express()
var s3 = new aws.S3({ /* ... */ })

var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})

app.post('/upload', upload.array('photos', 3), function(req, res, next) {
  res.send('Successfully uploaded ' + req.files.length + ' files!')
})
```

### File information

Each file contains the following information exposed by `multer-s3`:

Key | Description | Note
--- | --- | ---
`size` | Size of the file in bytes |
`bucket` | The bucket used to store the file | `S3Storage`
`key` | The name of the file | `S3Storage`
`acl` | Access control for the file | `S3Storage`
`contentType` | The `mimetype` used to upload the file | `S3Storage`
`metadata` | The `metadata` object to be sent to S3 | `S3Storage`
`location` | The S3 `url` to access the file  | `S3Storage`
`etag` | The `etag`of the uploaded file in S3  | `S3Storage`
`contentDisposition` | The `contentDisposition` used to upload the file | `S3Storage`
`storageClass` | The `storageClass` to be used for the uploaded file in S3 | `S3Storage`
`versionId` | The `versionId` is an optional param returned by S3 for versioned buckets. | `S3Storage`

### Setting ACL

[ACL values](http://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl) can be set by passing an optional `acl` parameter into the `multerS3` object.

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})
```

Available options for canned ACL.

ACL Option | Permissions added to ACL
--- | ---
`private` | Owner gets `FULL_CONTROL`. No one else has access rights (default).
`public-read` | Owner gets `FULL_CONTROL`. The `AllUsers` group gets `READ` access.
`public-read-write` | Owner gets `FULL_CONTROL`. The `AllUsers` group gets `READ` and `WRITE` access. Granting this on a bucket is generally not recommended.
`aws-exec-read` | Owner gets `FULL_CONTROL`. Amazon EC2 gets `READ` access to `GET` an Amazon Machine Image (AMI) bundle from Amazon S3.
`authenticated-read` | Owner gets `FULL_CONTROL`. The `AuthenticatedUsers` group gets `READ` access.
`bucket-owner-read` | Object owner gets `FULL_CONTROL`. Bucket owner gets `READ` access. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
`bucket-owner-full-control` | Both the object owner and the bucket owner get `FULL_CONTROL` over the object. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
`log-delivery-write` | The `LogDelivery` group gets `WRITE` and `READ_ACP` permissions on the bucket. For more information on logs.

## Setting Metadata

The `metadata` option is a callback that accepts the request and file, and returns a metadata object to be saved to S3.

Here is an example that stores all fields in the request body as metadata, and uses an `id` param as the key:

```javascript
var opts = {
    s3: s3,
    bucket: config.originalsBucket,
    metadata: function (req, file, cb) {
      cb(null, Object.assign({}, req.body));
    },
    key: function (req, file, cb) {
      cb(null, req.params.id + ".jpg");
    }
  };
```

## Setting Cache-Control header

The optional `cacheControl` option sets the `Cache-Control` HTTP header that will be sent if you're serving the files directly from S3. You can pass either a string or a function that returns a string.

Here is an example that will tell browsers and CDNs to cache the file for one year:

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    cacheControl: 'max-age=31536000',
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})
```

## Setting Custom Content-Type

The optional `contentType` option can be used to set Content/mime type of the file. By default the content type is set to `application/octet-stream`. If you want multer-s3 to automatically find the content-type of the file, use the `multerS3.AUTO_CONTENT_TYPE` constant. Here is an example that will detect the content type of the file being uploaded.

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})
```
You may also use a function as the `contentType`, which should be of the form `function(req, file, cb)`.

## Setting StorageClass

[storageClass values](https://aws.amazon.com/s3/storage-classes/) can be set by passing an optional `storageClass` parameter into the `multerS3` object.

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    acl: 'public-read',
    storageClass: 'REDUCED_REDUNDANCY',
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})
```

## Setting Content-Disposition

The optional `contentDisposition` option can be used to set the `Content-Disposition` header for the uploaded file. By default, the `contentDisposition` isn't forwarded. As an example below, using the value `attachment` forces the browser to download the uploaded file instead of trying to open it.

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    acl: 'public-read',
    contentDisposition: 'attachment',
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})
```

## Using Server-Side Encryption

*An overview of S3's server-side encryption can be found in the [S3 Docs] (http://docs.aws.amazon.com/AmazonS3/latest/dev/serv-side-encryption.html); be advised that customer-managed keys (SSE-C) is not implemented at this time.*

You may use the S3 server-side encryption functionality via the optional `serverSideEncryption` and `sseKmsKeyId` parameters. Full documentation of these parameters in relation to the S3 API can be found [here] (http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property) and [here] (http://docs.aws.amazon.com/AmazonS3/latest/dev/UsingServerSideEncryption.html).

`serverSideEncryption` has two valid values: 'AES256' and 'aws:kms'. 'AES256' utilizes the S3-managed key system, while 'aws:kms' utilizes the AWS KMS system and accepts the optional `sseKmsKeyId` parameter to specify the key ID of the key you wish to use. Leaving `sseKmsKeyId` blank when 'aws:kms' is specified will use the default KMS key. **Note:** *You must instantiate the S3 instance with `signatureVersion: 'v4'` in order to use KMS-managed keys [[Docs]] (http://docs.aws.amazon.com/AmazonS3/latest/dev/UsingAWSSDK.html#specify-signature-version), and the specified key must be in the same AWS region as the S3 bucket used.*

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    acl: 'authenticated-read',
    contentDisposition: 'attachment',
    serverSideEncryption: 'AES256',
    key: function(req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})
```

## Transforming Files Before Upload

The optional `shouldTransform` option tells multer whether it should transform the file before it is uploaded. By default, it is set to `false`. If set to `true`, `transforms` option must be added, which tells how to transform the file. `transforms` option should be an `Array`, containing objects with can have properties `id`, `key` and `transform`.

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    shouldTransform: function (req, file, cb) {
      cb(null, /^image/i.test(file.mimetype))
    },
    transforms: [{
      id: 'original',
      key: function (req, file, cb) {
        cb(null, 'image-original.jpg')
      },
      transform: function (req, file, cb) {
        cb(null, sharp().jpeg())
      }
    }, {
      id: 'thumbnail',
      key: function (req, file, cb) {
        cb(null, 'image-thumbnail.jpg')
      },
      transform: function (req, file, cb) {
        cb(null, sharp().resize(100, 100).jpeg())
      }
    }]
  })
})
```
If this option is used, each file passed to your router request will have a `transforms` array, with every transform you defined.
```json
{
  "data": {
    "fieldname": "image",
    "originalname": "image.jpg",
    "encoding": "7bit",
    "mimetype": "image/jpg",
    "transforms": [
      {
        "id": "thumbnail",
        "size": 2440,
        "bucket": "some-bucket",
        "key": "image-thumbnail.jpg",
        "acl": "public-read",
        "contentType": "image/jpg",
        "metadata": null,
        "location": "https://some-bucket.s3.us-east-1.amazonaws.com/image-thumbnail.jpg",
        "etag": "\"9d554e03e37c79bff7ce31d375900db6\""
      },
      {
        "id": "original",
        "size": 18006,
        "bucket": "some-bucket",
        "key": "image-original.jpg",
        "acl": "public-read",
        "contentType": "image/jpg",
        "metadata": null,
        "location": "https://some-bucket.s3.us-east-1.amazonaws.com/image-original.jpg",
        "etag": "\"76c09df7bdd752a749f91b9663838fb2\""
      },
    ]
  }
}
```
## Testing

The tests mock all access to S3 and can be run completely offline.

```sh
npm test
```
