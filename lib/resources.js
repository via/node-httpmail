
var assert = require('assert');

var MailParser = require('mailparser').MailParser;
var passthrough = require('stream').PassThrough;

var cloudFilesOptions = {
  username: process.env.npm_package_config_rackspaceCloud_username,
  apiKey: process.env.npm_package_config_rackspaceCloud_apiKey,
  authUrl: process.env.npm_package_config_rackspaceCloud_authUrl,
  container: process.env.npm_package_config_rackspaceCloud_container,
};

var Storage = require('./storage').Storage,
    store = new Storage(cloudFilesOptions);

exports.listTags = function listTags(req, res, next) {
  store.getTags(req.params.mailbox, function (tags) {
    res.send(tags);
  });
};

exports.listMessages = function listMessages(req, res, next) {
  var page = Number(req._query.page || 0);
  var pageSize = Number(req._query.pagesize || 50);

  var start = page * pageSize;
  var stop = start + pageSize - 1;

  filters = []
  sorts = []

  store.getList(
      req.params.mailbox,
      filters, sorts,
      start, stop,
      function (messages) {
        res.send(messages);
      }
    );
};

exports.getTagCount = function getTagCount(req, res, next) {
  var remaining = 2;
  var total, read;

  function sendMyResponse() {
    res.header('X-Total-Count', total);
    res.header('X-Unread-Count', total-read);
    res.end();
  }

  store.getTotalCounts(
      req.params.mailbox,
      [req.params.tag],
      function (counts) {
        total = counts[req.params.tag];
        if (--remaining <= 0) {
          sendMyResponse();
        }
      }
    );

  store.getUnreadCount(
      req.params.mailbox,
      req.params.tag,
      function (n) {
        read = n;
        if (--remaining <= 0) {
          sendMyResponse();
        }
      }
    );
};

function newRawMessage(req, res, next) {
  var mailbox = req.params.mailbox;
  var dir = req.headers['x-message-tag'];
  var mailparser = new MailParser();

  var msgId = null;
  var metaDone = 0, numMeta = 2;
  var rawmsg = "";
  raw = new passthrough;


  mailparser.on('end', function (mail) {
    if (!mail.from) {
      mail.from = [{address: ''}];
    }
    if (!mail.subject) {
      mail.subject = '';
    }

    store.newMessage(
        mailbox, tag,
        rawmsg.toString(),
        new Date().getTime(),
        function (err, id) {
          store.setMetas(
              mailbox, id,
              {
                'Subject': mail.subject,
                'From': mail.from[0].name || mail.from[0].address,
              },
              function () {
                res.send(201, id);
              }
            );
        }
      );
  });

  raw.on('data', function(chunk)  {
    rawmsg += chunk; 
  });
  
  req.pipe(raw);
  req.pipe(mailparser, {end: true});
}

exports.newMessage = function newMessage(req, res, next) {
  if (req.is('message/rfc822') || !req.headers['content-type']) {
    return newRawMessage(req, res, next);
  }
  
  res.writeHead(415);
  res.end();
};

exports.deleteTag = function deleteTag(req, res, next) {
  res.send(501, 'Not Implemented');
};

exports.newTag = function newTag(req, res, next) {
  store.newTag(req.params.mailbox, req.params.tag, function (r) {
    res.writeHead('200');
    res.end();
  });
};

exports.getAllMessageMeta = function getAllMessageMeta(req, res, next) {
  store.getMetas(req.params.mailbox, req.params.message, function (metas) {
    res.send(metas);
  });
};

exports.headMessage = function headMessage(req, res, next) {
  store.getMessageHeaders(req.params.mailbox, req.params.message, function (err, data) {
    assert.ifError(err);
    if (data) {
      res.setHeader('Content-Type', 'message/rfc822');
      res.writeHead('200');
      res.end(data);
    }
    else {
      res.writeHead('404');
      res.end();
    }
  });
};

exports.getMessage = function getMessage(req, res, next) {
  store.getMessage(req.params.mailbox, req.params.message, function (err, data) {
    assert.ifError(err);
    if (data) {
      res.setHeader('Content-Type', 'message/rfc822');
      res.writeHead('200');
      res.end(data);
    }
    else {
      res.writeHead('404');
      res.end();
    }
  });
};

exports.getMessageFlags = function getMessageFlags(req, res, next) {
  store.getFlags(req.params.mailbox, req.params.message, function (flags) {
    res.send(flags);
  });
};

exports.getMessageFlag = function getMessageFlag(req, res, next) {
  store.getFlags(req.params.mailbox, req.params.message, function (flags) {
    var i;
    for (i=0; i<flags.length; i++) {
      if (flags[i] === req.params.flag) {
        res.writeHead('200');
        res.end();
        return;
      }
    }
    res.writeHead('404');
    res.end();
  });
};

exports.setMessageFlag = function setMessageFlag(req, res, next) {
  store.setFlag(req.params.mailbox, req.params.message, req.params.flag, function (ok) {
    if (ok) {
      res.writeHead('200');
      res.end();
    }
    else {
      res.writeHead('404');
      res.end();
    }
  });
};

exports.unsetMessageFlag = function setMessageFlag(req, res, next) {
  store.unsetFlag(req.params.mailbox, req.params.message, req.params.flag, function (ok) {
    if (ok) {
      res.writeHead('200');
      res.end();
    }
    else {
      res.writeHead('404');
      res.end();
    }
  });
};

exports.deleteMessage = function deleteMessage(req, res, next) {
  store.deleteMessage(
      req.params.mailbox,
      req.params.message,
      function () {
        res.writeHead('200');
        res.end();
      }
    );
};

// vim:et:sw=2:ts=2:sts=2:
