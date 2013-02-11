#!/usr/bin/python2

import sys
import urllib2
import getpass, imaplib2

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
password = getpass.getpass()

def migrate_set(ids):
    for num in ids.split():
        typ, data = M.fetch(num, '(RFC822)')
        req = urllib2.Request(url, data[0][1])
        req.add_header('Content-Type', 'message/rfc822')
        f = urllib2.urlopen(req)
        out = '{0} {1}'.format(f.getcode(), f.read(100))
        print out

while True:
    M = imaplib2.IMAP4_SSL('secure.emailsrvr.com')
    M.login(user, password)
    M.select(folder.replace('&', '&-'))
    
    typ, data = M.search(None, 'RECENT')
    if data[0]:
        migrate_set(data[0])
    else:
        M.idle()
        typ, data = M.search(None, 'RECENT')
        if data[0]:
            migrate_set(data[0])
    M.close()
    M.logout()

# vim:et:fdm=marker:sts=4:sw=4:ts=4
