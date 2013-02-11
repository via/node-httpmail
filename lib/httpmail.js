
var restify = require('restify'),
    redis = require('redis');

var resources = require('./resources'),
    Storage = require('./storage').Storage;

var server = restify.createServer({});

server.use(restify.queryParser());

server.get('/mailboxes/:mailbox/directories/', resources.listDirs);
server.get('/mailboxes/:mailbox/directories/:dir/', resources.listDirMessages);
server.head('/mailboxes/:mailbox/directories/:dir/', resources.getDirCount);
server.post('/mailboxes/:mailbox/directories/:dir/', resources.newMessage);
server.del('/mailboxes/:mailbox/directories/:dir', resources.deleteDir);
server.get('/mailboxes/:mailbox/messages/:message', resources.getMessage);
server.del('/mailboxes/:mailbox/messages/:message', resources.deleteMessage);
server.get('/mailboxes/:mailbox/messages/:message/flags/', resources.getMessageFlags);
server.get('/mailboxes/:mailbox/messages/:message/flags/:flag', resources.getMessageFlag);
server.put('/mailboxes/:mailbox/messages/:message/flags/:flag', resources.setMessageFlag);
server.del('/mailboxes/:mailbox/messages/:message/flags/:flag', resources.unsetMessageFlag);
server.get('/mailboxes/:mailbox/messages/:message/meta/', resources.getAllMessageMeta);

server.listen(3000);

// vim:et:sw=2:ts=2:sts=2:
