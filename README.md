
# API Documentation

### GET /mailboxes/`mailbox`/directories/

Returns a JSON list of directories for the mailbox.

### GET /mailboxes/`mailbox`/directories/`dir`/

Returns a JSON list of messages in the directory, sorted with the most recent
messages appearing first.

### HEAD /mailboxes/`mailbox`/directories/`dir`/

The headers `X-Total-Count` and `X-Unread-Count` contain the number of total
messages in the directory and the number of unread messages in the directory,
respectively.

### POST /mailboxes/`mailbox`/directories/`dir`/

Adds a new message to the directory. If given `message/rfc822` data, the raw
message is parsed and stored. If given `application/json` data, it should be a
mail object with the properties described by the
[node-mailparser](https://github.com/andris9/mailparser) project.

### DELETE /mailboxes/`mailbox`/directories/`dir`

Deletes the directory and all messages inside it.

### GET /mailboxes/`mailbox`/messages/`id`

Fetches the message from storage. The result will be `application/json` data
for an object as described by the
[node-mailparser](https://github.com/andris9/mailparser) project.

### DELETE /mailboxes/`mailbox`/messages/`id`

Deletes the message from storage and removes its indices from the directory it
was contained in.

### GET /mailboxes/`mailbox`/messages/`id`/flags/

Gets all the flags associated with the message. These are the same flags
described by IMAP (`Seen`, `Answered`, `Flagged`, `Draft`, `Deleted`) and are
case-sensitive. The response is a JSON list of set flags.

### GET /mailboxes/`mailbox`/messages/`id`/flags/`flag`

Returns `200` status if the flag is set for the message, or `404` if the flag
is not set (or the flag was not recognized).

### PUT /mailboxes/`mailbox`/messages/`id`/flags/`flag`

Sets the given flag for the message.

### DELETE /mailboxes/`mailbox`/messages/`id`/flags/`flag`

Unsets the given flag for the message.

### GET /mailboxes/`mailbox`/messages/`id`/meta/

Gets all the meta information associated with the message. Currently, this will
return a JSON dictionary with two keys, `From` and `Subject`.

# Algorithmic Complexities

## Loading the page

    125   SISMEMBER     O(1)
    50    HGET          O(1)
    1     ZCARD         O(1)
    1     SMEMBERS      O(N)                 N -> Number of folders
    1     ZREVRANGE     O(log(N)+M)          N -> Number of messages in the folder
                                             M -> Page size
    1     *DEL          O(N)                 N -> Number of read messages in the folder
    1     *ZINTERSTORE  O(2*N)+O(M*log(M))   N -> Number of messages in the folder
                                             M -> Number of read messages in the folder

## Loading a message

    5     SISMEMBER     O(1)
    1     SADD          O(1)
    1     ZCARD         O(1)
    1     SwiftRead     O(1)
    1     *DEL          O(N)                 N -> Number of read messages in the folder
    1     *ZINTERSTORE  O(2*N)+O(M*log(M))   N -> Number of messages in the folder
                                             M -> Number of read messages in the folder
