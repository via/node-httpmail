
# API Documentation

### GET /mailboxes/`mailbox`/tags/

Returns a JSON list of tags for the mailbox.

### HEAD /mailboxes/`mailbox`/tags/`tag`/

The headers `X-Total-Count` and `X-Unread-Count` contain the number of total
messages in the directory and the number of unread messages with the
tag, respectively.

### PUT /mailboxes/`mailbox`/tags/`tag`

Create a new tag.

### DELETE /mailboxes/`mailbox`/tags/`tag``

Deletes the tag, and any messages that are associated only with the one
tag.

### POST /mailboxes/`mailbox`/messages/

Adds a new message to the directory.  The provided body should be of
content-type `message/rfc822`.  Use the header `X-Message-Tag` to
specify any directories the message should be associated with.  

### GET /mailboxes/`mailbox`/messages/

Returns a JSON list of all messages in the mailbox.  Various headers
are usable to filter the response:

```
X-Filter-Tag
X-Filter-Flag
X-Filter-Bcc
X-Filter-Body
X-Filter-Subject
X-Filter-Text
X-Filter-To
X-Filter-From
X-Filter-Cc
X-Filter-Header-`header`
```

Some filters may include qualifiers `>`, `<`, `=`, expressing
larger/later, smaller/earlier, and equal, respectively
```
X-Filter-Size 
X-Filter-Sent
X-Filter-Stored
```

Message listings can be sorted using the `X-Sort` header:
X-Sort: Subject ~Date


Valid sorts, drawn from RFC5256:
```
Arrival
CC
Date
From
Size
Subject
To
```

Prefixing a sort parameter with ~ will reverse the sort.

Example:
```
X-Filter-To: v@shitler.net
X-Filter-Size: < 65535
X-Sort: ~Arrival
```

### PATCH /mailboxes/`mailbox`/messages/`id`

Sets tags for the message.  Use one or more `X-Message-Tag` headers to
indicicate the tags.

### GET /mailboxes/`mailbox`/messages/`id`

Fetches the message from storage. The result will be `message/rfc822`
data for the raw mail message.

### DELETE /mailboxes/`mailbox`/messages/`id`

Deletes the message from storage.

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
