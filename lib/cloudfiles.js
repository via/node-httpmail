
var https = require('https'),
    url = require('url'),
    assert = require('assert');

function CloudFiles(options) {
  this.username = options.username;
  this.apiKey = options.apiKey;
  this.authUrl = options.authUrl;
  this.container = options.container;
  
  
  var updateTokenInterval = options.updateTokenInterval || 7200000;
  this.token = options.token;
  this.storageUrl = options.storageUrl;

  var self = this;
  setInterval(function () {
    updateToken.call(self);
  }, updateTokenInterval);
}

function updateToken(callback) {
  var self = this;
  var options = url.parse(this.authUrl);
  options.headers = {
    'X-Auth-User': this.username,
    'X-Auth-Key': this.apiKey,
  };
  https.get(options, function (res) {
    assert.ok(res.statusCode >= 200 && res.statusCode < 300, 'Authentication failed.');
    self.token = res.headers['x-auth-token'];
    self.storageUrl = res.headers['x-storage-url'];
    if (callback) {
      callback();
    }
  });
}

CloudFiles.prototype.download = function (id, callback) {
  var self = this;

  if (!this.token) {
    updateToken.call(this, function () {
      self.download(id, callback);
    });
    return;
  }

  var fullUrl = [this.storageUrl, this.container, id].join('/');
  var options = url.parse(fullUrl);
  options.headers = {
    'X-Auth-Token': this.token,
  };
  https.get(options, function (res) {
    if (res.statusCode === 200) {
      var data = [];
      res.on('data', function (buf) {
        data.push(buf);
      });
      res.on('end', function () {
        var fullData = data.join('');
        callback(null, fullData);
      });
    }
    else {
      callback(res.statusCode);
    }
  });
};

CloudFiles.prototype.upload = function (id, data, callback) {
  var self = this;

  if (!this.token) {
    updateToken.call(this, function () {
      self.upload(id, data, callback);
    });
    return;
  }

  var fullUrl = [this.storageUrl, this.container, id].join('/');
  var options = url.parse(fullUrl);
  options.method = 'PUT';
  options.headers = {
    'X-Auth-Token': this.token,
  };
  https.request(options, function (res) {
    if (res.statusCode === 201) {

      callback(null);
    }
    else {
      callback(res.statusCode);
    }
  }).end(data);
};

exports.CloudFiles = CloudFiles;

// vim:et:sw=2:ts=2:sts=2:
