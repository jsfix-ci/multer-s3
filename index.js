"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let { randomBytes } = require("crypto");
let stream = require("stream");
let fileType = require("file-type");
let isSvg = require("is-svg");
let parallel = require("run-parallel");
function staticValue(value) {
    return function (req, file, cb) {
        cb(null, value);
    };
}
let defaultAcl = staticValue("private");
let defaultContentType = staticValue("application/octet-stream");
let defaultMetadata = staticValue(null);
let defaultCacheControl = staticValue(null);
let defaultContentDisposition = staticValue(null);
let defaultStorageClass = staticValue("STANDARD");
let defaultSSE = staticValue(null);
let defaultSSEKMS = staticValue(null);
let defaultShouldTransform = staticValue(false);
let defaultTransforms = [];
function defaultKey(req, file, cb) {
    randomBytes(16, function (err, raw) {
        cb(err, err ? undefined : raw.toString("hex"));
    });
}
function autoContentType(req, file, cb) {
    file.stream.once("data", function (firstChunk) {
        const type = fileType(firstChunk);
        let mime;
        if (type) {
            mime = type.mime;
        }
        else if (isSvg(firstChunk)) {
            mime = "image/svg+xml";
        }
        else {
            mime = "application/octet-stream";
        }
        let outStream = new stream.PassThrough();
        outStream.write(firstChunk);
        file.stream.pipe(outStream);
        cb(null, mime, outStream);
    });
}
function collect(storage, req, file, cb) {
    parallel([
        storage.getBucket.bind(storage, req, file),
        storage.getKey.bind(storage, req, file),
        storage.getAcl.bind(storage, req, file),
        storage.getMetadata.bind(storage, req, file),
        storage.getCacheControl.bind(storage, req, file),
        storage.getShouldTransform.bind(storage, req, file),
        storage.getContentDisposition.bind(storage, req, file),
        storage.getStorageClass.bind(storage, req, file),
        storage.getSSE.bind(storage, req, file),
        storage.getSSEKMS.bind(storage, req, file),
    ], function (err, values) {
        if (err)
            return cb(err);
        storage.getContentType(req, file, function (err, contentType, replacementStream) {
            if (err)
                return cb(err);
            cb.call(storage, null, {
                bucket: values[0],
                key: values[1],
                acl: values[2],
                metadata: values[3],
                cacheControl: values[4],
                shouldTransform: values[5],
                contentDisposition: values[6],
                storageClass: values[7],
                contentType: contentType,
                replacementStream: replacementStream,
                serverSideEncryption: values[8],
                sseKmsKeyId: values[9],
            });
        });
    });
}
function S3Storage(opts) {
    switch (typeof opts.s3) {
        case "object":
            this.s3 = opts.s3;
            break;
        default: throw new TypeError("Expected opts.s3 to be object");
    }
    switch (typeof opts.bucket) {
        case "function":
            this.getBucket = opts.bucket;
            break;
        case "string":
            this.getBucket = staticValue(opts.bucket);
            break;
        case "undefined": throw new Error("bucket is required");
        default: throw new TypeError("Expected opts.bucket to be undefined, string or function");
    }
    switch (typeof opts.key) {
        case "function":
            this.getKey = opts.key;
            break;
        case "undefined":
            this.getKey = defaultKey;
            break;
        default:
            throw new TypeError("Expected opts.key to be undefined or function");
    }
    switch (typeof opts.acl) {
        case "function":
            this.getAcl = opts.acl;
            break;
        case "string":
            this.getAcl = staticValue(opts.acl);
            break;
        case "undefined":
            this.getAcl = defaultAcl;
            break;
        default: throw new TypeError("Expected opts.acl to be undefined, string or function");
    }
    switch (typeof opts.contentType) {
        case "function":
            this.getContentType = opts.contentType;
            break;
        case "undefined":
            this.getContentType = defaultContentType;
            break;
        default:
            throw new TypeError("Expected opts.contentType to be undefined or function");
    }
    switch (typeof opts.metadata) {
        case "function":
            this.getMetadata = opts.metadata;
            break;
        case "undefined":
            this.getMetadata = defaultMetadata;
            break;
        default:
            throw new TypeError("Expected opts.metadata to be undefined or function");
    }
    switch (typeof opts.cacheControl) {
        case "function":
            this.getCacheControl = opts.cacheControl;
            break;
        case "string":
            this.getCacheControl = staticValue(opts.cacheControl);
            break;
        case "undefined":
            this.getCacheControl = defaultCacheControl;
            break;
        default:
            throw new TypeError("Expected opts.cacheControl to be undefined, string or function");
    }
    switch (typeof opts.shouldTransform) {
        case "function":
            this.getShouldTransform = opts.shouldTransform;
            break;
        case "boolean":
            this.getShouldTransform = staticValue(opts.shouldTransform);
            break;
        case "undefined":
            this.getShouldTransform = defaultShouldTransform;
            break;
        default:
            throw new TypeError("Expected opts.shouldTransform to be undefined, boolean or function");
    }
    switch (typeof opts.transforms) {
        case "object":
            this.getTransforms = opts.transforms;
            break;
        case "undefined":
            this.getTransforms = defaultTransforms;
            break;
        default:
            throw new TypeError("Expected opts.transforms to be undefined or object");
    }
    this.getTransforms.map(function (transform, i) {
        switch (typeof transform.key) {
            case "function":
                break;
            case "string":
                // @ts-ignore
                transform.key = staticValue(transform.key);
                break;
            case "undefined":
                // @ts-ignore
                transform.key = defaultKey();
                break;
            default:
                throw new TypeError("Expected opts.transform[].key to be unedefined, string or function");
        }
        switch (typeof transform.transform) {
            case "function":
                break;
            default:
                throw new TypeError("Expected opts.transform[].transform to be function");
        }
        return transform;
    });
    switch (typeof opts.contentDisposition) {
        case "function":
            this.getContentDisposition = opts.contentDisposition;
            break;
        case "string":
            this.getContentDisposition = staticValue(opts.contentDisposition);
            break;
        case "undefined":
            this.getContentDisposition = defaultContentDisposition;
            break;
        default:
            throw new TypeError("Expected opts.contentDisposition to be undefined, string or function");
    }
    switch (typeof opts.storageClass) {
        case "function":
            this.getStorageClass = opts.storageClass;
            break;
        case "string":
            this.getStorageClass = staticValue(opts.storageClass);
            break;
        case "undefined":
            this.getStorageClass = defaultStorageClass;
            break;
        default:
            throw new TypeError("Expected opts.storageClass to be undefined, string or function");
    }
    switch (typeof opts.serverSideEncryption) {
        case "function":
            this.getSSE = opts.serverSideEncryption;
            break;
        case "string":
            this.getSSE = staticValue(opts.serverSideEncryption);
            break;
        case "undefined":
            this.getSSE = defaultSSE;
            break;
        default:
            throw new TypeError("Expected opts.serverSideEncryption to be undefined, string or function");
    }
    switch (typeof opts.sseKmsKeyId) {
        case "function":
            this.getSSEKMS = opts.sseKmsKeyId;
            break;
        case "string":
            this.getSSEKMS = staticValue(opts.sseKmsKeyId);
            break;
        case "undefined":
            this.getSSEKMS = defaultSSEKMS;
            break;
        default:
            throw new TypeError("Expected opts.sseKmsKeyId to be undefined, string, or function");
    }
}
S3Storage.prototype._handleFile = function (req, file, cb) {
    collect(this, req, file, function (err, opts) {
        if (err)
            return cb(err);
        // @ts-ignore
        let storage = this;
        if (!opts.shouldTransform) {
            storage.directUpload(opts, file, cb);
        }
        else {
            storage.transformUpload(opts, req, file, cb);
        }
    });
};
S3Storage.prototype.directUpload = function (opts, file, cb) {
    let currentSize = 0;
    let params = {
        Bucket: opts.bucket,
        Key: opts.key,
        ACL: opts.acl,
        CacheControl: opts.cacheControl,
        ContentType: opts.contentType,
        Metadata: opts.metadata,
        StorageClass: opts.storageClass,
        ServerSideEncryption: opts.serverSideEncryption,
        SSEKMSKeyId: opts.sseKmsKeyId,
        Body: opts.replacementStream || file.stream,
    };
    if (opts.contentDisposition) {
        params.ContentDisposition = opts.contentDisposition;
    }
    let upload = this.s3.upload(params);
    upload.on("httpUploadProgress", function (ev) {
        if (ev.total)
            currentSize = ev.total;
    });
    upload.send(function (err, result) {
        if (err)
            return cb(err);
        cb(null, {
            size: currentSize,
            bucket: opts.bucket,
            key: opts.key,
            acl: opts.acl,
            contentType: opts.contentType,
            contentDisposition: opts.contentDisposition,
            storageClass: opts.storageClass,
            serverSideEncryption: opts.serverSideEncryption,
            metadata: opts.metadata,
            location: result.Location,
            etag: result.ETag,
            versionId: result.VersionId,
        });
    });
};
S3Storage.prototype.transformUpload = function (opts, req, file, cb) {
    let storage = this;
    let results = [];
    parallel(storage.getTransforms.map(function (transform) {
        return transform.key.bind(storage, req, file);
    }), function (err, keys) {
        if (err)
            return cb(err);
        keys.forEach(function (key, i) {
            let currentSize = 0;
            storage.getTransforms[i].transform(req, file, function (err, piper) {
                if (err)
                    return cb(err);
                let upload = storage.s3.upload({
                    Bucket: opts.bucket,
                    Key: key,
                    ACL: opts.acl,
                    CacheControl: opts.cacheControl,
                    ContentType: opts.contentType,
                    Metadata: opts.metadata,
                    StorageClass: opts.storageClass,
                    ServerSideEncryption: opts.serverSideEncryption,
                    SSEKMSKeyId: opts.sseKmsKeyId,
                    Body: (opts.replacementStream || file.stream).pipe(piper),
                });
                upload.on("httpUploadProgress", function (ev) {
                    if (ev.total)
                        currentSize = ev.total;
                });
                upload.send(function (err, result) {
                    if (err)
                        return cb(err);
                    results.push({
                        id: storage.getTransforms[i].id || i,
                        size: currentSize,
                        bucket: opts.bucket,
                        key: key,
                        acl: opts.acl,
                        contentType: opts.contentType,
                        contentDisposition: opts.contentDisposition,
                        storageClass: opts.storageClass,
                        serverSideEncryption: opts.serverSideEncryption,
                        metadata: opts.metadata,
                        location: result.Location,
                        etag: result.ETag,
                    });
                    if (results.length === keys.length) {
                        return cb(null, { transforms: results });
                    }
                });
            });
        });
    });
};
S3Storage.prototype._removeFile = function (req, file, cb) {
    this.s3.deleteObject({ Bucket: file.bucket, Key: file.key }, cb);
};
module.exports = function (opts) {
    // @ts-ignore
    return new S3Storage(opts);
};
module.exports.AUTO_CONTENT_TYPE = autoContentType;
module.exports.DEFAULT_CONTENT_TYPE = defaultContentType;
//# sourceMappingURL=index.js.map