
var os = require('os'),
    assert = require('assert'),
    events = require('events'),
    util = require('util');

var redis = require('redis'),
    uuid = require('node-uuid'),
    cloudfiles = require('./cloudfiles');

var supportedFlags = ['Seen', 'Answered', 'Flagged', 'Draft', 'Deleted'];
var supportedMetas = ['From', 'Subject'];

function Storage(cloudFilesOptions, redisFunc) {
  this.cloudfiles = new cloudfiles.CloudFiles(cloudFilesOptions);
  this.newRedisClient = redisFunc || function () {
    return redis.createClient();
  };

  this.supportedFlags = supportedFlags;
  this.supportedMetas = supportedMetas;
}

function claimUuid(mailbox, dir, callback) {
  var client = this.newRedisClient();
  var id = uuid.v4();
  client.sadd([mailbox, 'ids'].join('.'), id, function (err, res) {
    if (res === 0) {
      client.quit();
      return claimUuid(callback);
    }
    else {
      client.quit();
      assert.ifError(err);
      callback(id);
    }
  });
}

function DataEmitter(data) {
  events.EventEmitter.call(this);
  this.data = data;

  this.readable = true;
}
util.inherits(DataEmitter, events.EventEmitter);

function storeMessage(mailbox, dir, data, score, id, callback) {
  var self = this;
  var client = this.newRedisClient();

  client.multi()
    .sadd([mailbox, 'folders'].join('.'), dir)
    .hset([mailbox, 'messages'].join('.'), id, dir)
    .zadd([mailbox, dir].join('/'), score, id)
    .set([mailbox, id, 'data'].join('/'), data)
    .exec(function (err, res) {
      client.quit();
      assert.ifError(err);

      callback(err, id);
    });
}

Storage.prototype.newMessage = function (mailbox, dir, data, score, callback) {
  var self = this;

  claimUuid.call(this, mailbox, dir, function (id) {
    return storeMessage.call(self, mailbox, dir, data, score, id, callback);
  });
};

Storage.prototype.deleteMessage = function (mailbox, id, callback) {
  var client = this.newRedisClient();
  client.hget([mailbox, 'messages'].join('.'), id, function (err, res) {
    assert.ifError(err);
    var dir = res;
    var multi = client.multi()
      .srem([mailbox, 'ids'].join('.'), id)
      .hdel([mailbox, 'messages'].join('.'), id)
      .zrem([mailbox, dir].join('/'), id);

    var i;
    for (i=0; i<supportedFlags.length; i++) {
      multi.srem([mailbox, supportedFlags[i]].join('.'), id);
    }

    multi.exec(function (err, res) {
      client.quit();
      assert.ifError(err);
      process.nextTick(function () {
        callback();
      });
    });
  });
};

Storage.prototype.getMessage = function (mailbox, id, callback) {
  var client = this.newRedisClient();
  client.get([mailbox, id, 'data'].join('/'), function (err, res) {
    callback(err, res);
  });
};

function addMetaToDirList(mailbox, ids, callback) {
  var i;
  var seenIds = 0, ret = [];
  ret.length = ids.length;

  function buildCallback(i, id) {
    return function (metas) {
      metas.id = id;
      ret[i] = metas;
      if (++seenIds >= ids.length) {
        process.nextTick(function () {
          callback(ret);
        });
      }
    };
  }

  for (i=0; i<ids.length; i++) {
    this.getMetas(mailbox, ids[i], buildCallback(i, ids[i]));
  }
}

Storage.prototype.getDirList = function (mailbox, dir, start, stop, callback) {
  var self = this;
  var client = this.newRedisClient();
  if (start === undefined) {
    start = 0;
  }
  if (stop === undefined) {
    stop = -1;
  }

  client.zrevrange([mailbox, dir].join('/'), start, stop, function (err, res) {
    client.quit();
    assert.ifError(err);
    process.nextTick(function () {
      callback(res);
    });
  });
};

Storage.prototype.newDir = function(mailbox, dir, callback) {
  var client = this.newRedisClient();
  client.sadd([mailbox, 'folders'].join('.'), dir, function (err, res) {
    client.quit();
    assert.ifError(err);
    process.nextTick(function () {
      callback(res);
    });
  });
};

Storage.prototype.getDirs = function (mailbox, callback) {
  var client = this.newRedisClient();

  client.smembers([mailbox, 'folders'].join('.'), function (err, res) {
    client.quit();
    assert.ifError(err);
    process.nextTick(function () {
      callback(res);
    });
  });
};

Storage.prototype.getTotalCounts = function (mailbox, dirs, callback) {
  var client = this.newRedisClient();
  var ret = {};
  var numFolders = dirs.length;
  var seenFolders = 0;

  function buildCallback(dir) {
    return function (err, res) {
      assert.ifError(err);
      ret[dir] = res;
      if (++seenFolders >= numFolders) {
        client.quit();
        process.nextTick(function () {
          callback(ret);
        });
      }
    };
  }

  for (i=0; i<numFolders; i++) {
    var key = [mailbox, dirs[i]].join('/');
    client.zcard(key, buildCallback(dirs[i]));
  }
};

Storage.prototype.setFlag = function (mailbox, id, whichFlag, callback) {
  var client = this.newRedisClient();
  var seenFlags = 0;

  var i, found = false;
  for (i=0; i<supportedFlags.length; i++) {
    if (supportedFlags[i] === whichFlag) {
      found = true;
      break;
    }
  }

  if (!found) {
    callback(false);
    return;
  }

  client.sadd([mailbox, whichFlag].join('.'), id, function (err, res) {
    client.quit();
    assert.ifError(err);
    process.nextTick(function () {
      callback(true);
    });
  });
};

Storage.prototype.unsetFlag = function (mailbox, id, whichFlag, callback) {
  var client = this.newRedisClient();
  var seenFlags = 0;

  var i, found = false;
  for (i=0; i<supportedFlags.length; i++) {
    if (supportedFlags[i] === whichFlag) {
      found = true;
      break;
    }
  }

  if (!found) {
    callback(false);
    return;
  }

  client.srem([mailbox, whichFlag].join('.'), id, function (err, res) {
    client.quit();
    assert.ifError(err);
    process.nextTick(function () {
      callback(true);
    });
  });
};

Storage.prototype.getFlags = function (mailbox, id, callback) {
  var client = this.newRedisClient();
  var ret = [];
  var seenFlags = 0;
  var i, numFlags = supportedFlags.length;

  function buildCallback(flag) {
    return function (err, res) {
      assert.ifError(err);
      if (res === 1) {
        ret.push(flag);
      }
      if (++seenFlags >= numFlags) {
        client.quit();
        process.nextTick(function () {
          callback(ret);
        });
      }
    };
  }

  for (i=0; i<numFlags; i++) {
    client.sismember([mailbox, supportedFlags[i]].join('.'), id, buildCallback(supportedFlags[i]));
  }
};

Storage.prototype.setMeta = function (mailbox, id, whichMeta, whatMeta, callback) {
  var client = this.newRedisClient();
  var seenMetas = 0;

  var i, found = false;
  for (i=0; i<supportedMetas.length; i++) {
    if (supportedMetas[i] === whichMeta) {
      found = true;
      break;
    }
  }

  if (!found) {
    callback(false);
    return;
  }

  client.hset([mailbox, whichMeta].join('.'), id, whatMeta, function (err, res) {
    client.quit();
    assert.ifError(err);
    process.nextTick(function () {
      callback(true);
    });
  });
};

Storage.prototype.unsetMeta = function (mailbox, id, whichMeta, callback) {
  var client = this.newRedisClient();
  var seenMetas = 0;

  var i, found = false;
  for (i=0; i<supportedMetas.length; i++) {
    if (supportedMetas[i] === whichMeta) {
      found = true;
      break;
    }
  }

  if (!found) {
    callback(false);
    return;
  }

  client.hdel([mailbox, whichMeta].join('.'), id, function (err, res) {
    client.quit();
    assert.ifError(err);
    process.nextTick(function () {
      callback(true);
    });
  });
};

Storage.prototype.setMetas = function (mailbox, id, metas, callback) {
  var seenMetas = 0;
  var i, numMetas = supportedMetas.length;

  function buildCallback(meta) {
    return function (ok) {
      if (++seenMetas >= numMetas) {
        process.nextTick(function () {
          callback();
        });
      }
    };
  }

  for (i=0; i<numMetas; i++) {
    var key = supportedMetas[i],
        val = metas[key];
    if (val) {
      this.setMeta(mailbox, id, key, val, buildCallback(key));
    }
    else {
      this.unsetMeta(mailbox, id, key, buildCallback(key));
    }
  }
}

Storage.prototype.getMetas = function (mailbox, id, callback) {
  var client = this.newRedisClient();
  var ret = {};
  var seenMetas = 0;
  var i, numMetas = supportedMetas.length;

  function buildCallback(meta) {
    return function (err, res) {
      assert.ifError(err);
      if (res) {
        ret[meta] = res;
      }
      if (++seenMetas >= numMetas) {
        client.quit();
        process.nextTick(function () {
          callback(ret);
        });
      }
    };
  }

  for (i=0; i<numMetas; i++) {
    client.hget([mailbox, supportedMetas[i]].join('.'), id, buildCallback(supportedMetas[i]));
  }
};

Storage.prototype.getUnreadCount = function (mailbox, dir, callback) {
  var client = this.newRedisClient();

  client.multi()
    .zinterstore(
      [mailbox, 'SeenCount'].join('.'),
      2,
      [mailbox, dir].join('/'),
      [mailbox, 'Seen'].join('.'),
      function (err, n) {
        assert.ifError(err);
        process.nextTick(function () {
          callback(n);
        });
      }
    )
    .del([mailbox, 'SeenCount'].join('.'))
    .exec(function (err, res) {
      client.quit();
      assert.ifError(err);
    });
};

exports.Storage = Storage;

// vim:et:sw=2:ts=2:sts=2:
