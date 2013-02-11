#!/usr/bin/python2

import sys
import urllib2
import getpass, imaplib

user = sys.argv[1]
folder = sys.argv[2]
try:
    host = sys.argv[3]
except IndexError:
    host = 'localhost:3000'
url = 'http://{0}/mailboxes/{1}/directories/{2}/'.format(
        host,
        urllib2.quote(user),
        urllib2.quote(folder))

M = imaplib.IMAP4_SSL('secure.emailsrvr.com')
M.login(user, getpass.getpass())
M.select(folder.replace('&', '&-'))
typ, data = M.search(None, 'ALL')
for num in data[0].split():
    typ, data = M.fetch(num, '(RFC822)')
    req = urllib2.Request(url, data[0][1])
    req.add_header('Content-Type', 'message/rfc822')
    f = urllib2.urlopen(req)
    out = '{0} {1}'.format(f.getcode(), f.read(100))
    print out
M.close()
M.logout()

# vim:et:fdm=marker:sts=4:sw=4:ts=4
