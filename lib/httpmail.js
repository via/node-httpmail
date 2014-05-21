
var restify = require('restify'),
    redis = require('redis');

var resources = require('./resources'),
    Storage = require('./storage').Storage;

var server = restify.createServer({});

server.use(restify.queryParser());

server.get('/mailboxes/:mailbox/tags/', resources.listTags);
server.put('/mailboxes/:mailbox/tags/:tag', resources.newTag);
server.del('/mailboxes/:mailbox/tags/:tag', resources.deleteTag);
server.head('/mailboxes/:mailbox/tags/:tag/', resources.getTagCount);

server.post('/mailboxes/:mailbox/messages/', resources.newMessage);
server.get('/mailboxes/:mailbox/messages/:message', resources.getMessage);
server.head('/mailboxes/:mailbox/messages/:message', resources.headMessage);
server.del('/mailboxes/:mailbox/messages/:message', resources.deleteMessage);
server.patch('/mailboxes/:mailbox/messages/:message', resources.patchMessage);

server.get('/mailboxes/:mailbox/messages/:message/flags/', resources.getMessageFlags);
server.get('/mailboxes/:mailbox/messages/:message/flags/:flag', resources.getMessageFlag);
server.put('/mailboxes/:mailbox/messages/:message/flags/:flag', resources.setMessageFlag);
server.del('/mailboxes/:mailbox/messages/:message/flags/:flag', resources.unsetMessageFlag);
server.get('/mailboxes/:mailbox/messages/:message/meta/', resources.getAllMessageMeta);

server.listen(3000);

// vim:et:sw=2:ts=2:sts=2:
