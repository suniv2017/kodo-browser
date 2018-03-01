"use strict";

require("events").EventEmitter.prototype._maxListeners = 1000;

const AWS = require("aws-sdk");

var UploadJob = require("./upload-job");
var DownloadJob = require("./download-job");

/**
 * S3Store
 *
 * @constructor S3Store
 *
 * @param config
 *    config.aliyunCredential
 *    config.stsToken
 *    config.endpoint
 */

function S3Store(config) {
  if (!config) {
    console.log("config is required");
    return;
  }

  this._config = {};
  Object.assign(this._config, config);

  if (!this._config.endpoint) {
    console.log("config.endpoint is required");
    return;
  }

  var arr = this._config.endpoint.split("://");
  if (arr.length < 2) {
    console.log("config.endpoint format is error");
    return;
  }

  this._config.endpoint = {
    protocol: arr[0],
    host: arr[1]
  };

  this.client = new AWS.S3({
    apiVersion: "2006-03-01",
    endpoint: this._config.endpoint.protocol + "://" + this._config.endpoint.host,
    region: this._config.region,
    accessKeyId: this._config.credential.accessKeyId,
    secretAccessKey: this._config.credential.secretAccessKey,
    maxRetries: 3,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
    httpOptions: {
      connectTimeout: this._config.connectTimeout || 3000, // 3s
      timeout: this._config.timeout || 3600000 // 1h
    }
  });
}

/**
 *
 * Usage:
 *
 *  new S3Store(cfg)
 *     .createUploadJob({from:'/home/a.jpg', to:'s3://a/b.jpg'})
 *
 * UploadJob class:

 class UploadJob{
    status: ''
    from: { name, size, path }
    to: { bucket, key }
    prog: {loaded, total}

 }

 *
 * @param options
 *    options.from  {object|string} local path, as object: {name:'a.jpg', path:'/home/admin/a.jpg'},  as string: '/home/admin/a.jpg'
 *    options.to    {object|string} s3 path, as object: {bucket:'bucket',key:'pic/b.jpg'} as string: 's3://bucket/pic/b.jpg'
 *    options.checkPoints {object} saved progs
 */
S3Store.prototype.createUploadJob = function createUploadJob(options) {
  //默认是 waiting 状态
  return new UploadJob(this.client, options);
};

/**
 *
 * Usage:
 *
 *  new S3Store(cfg)
 *     .createDownloadJob({from:'/home/a.jpg', to:'s3://a/b.jpg'})
 *
 * DownloadJob class:

 class DownloadJob{
    status: ''
    from: { name, size, path }
    to: { bucket, key }
    prog: {loaded, total}

 }

 *
 * @param options
 *    options.from    {string} path string, under s3 prefix, example: '/pic/b.jpg', it will be append to presetting s3path
 *                       as: 's3://bucket/users/test_user/pic/b.jpg'
 *    options.to  {string} local path string,  example: '/home/admin/a.jpg'
 *
 *    options.checkPoints {object} saved progs
 */
S3Store.prototype.createDownloadJob = function createDownloadJob(options) {
  return new DownloadJob(this.client, options);
};

module.exports = S3Store;