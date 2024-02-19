const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const moment = require('moment');
require('dotenv').config();
const imapConfig = {
    user: process.env.gmail_username,
    password: process.env.gmail_emailpassword,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
        rejectUnauthorized: false
    }
};
const senderEmail = 'info@tnebnet.org';
const subjectKeyword = 'Reminder';
let remainderEmailCount = 0;
const imap = new Imap(imapConfig);
function fetchEmails() {
    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                console.error(err);
                return;
            }
            const thirtydaysago = moment().subtract(30, 'days').toDate();
            const searchCriteria = [
                ['FROM', senderEmail],
                ['SINCE', thirtydaysago.toISOString()], 
                ['SUBJECT', subjectKeyword]
            ];
            imap.search(searchCriteria, (err, results) => {
                if (err) {
                    console.error(err);
                    return;
                }
                remainderEmailCount = results.length;
                console.log(`Found ${remainderEmailCount} emails with subject containing "${subjectKeyword}" from ${senderEmail}`);
                results.forEach((result) => {
                    const fetchOptions = {
                        bodies: '',
                        markSeen: false};
                    const fetch = imap.fetch(result, fetchOptions);
                    fetch.on('message', (msg, seqno) => {
                        msg.on('body', (stream, info) => {
                            simpleParser(stream, (err, parsed) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                }
                                console.log('Subject:', parsed.subject);
                                console.log('Body:', parsed.text);
                            });
                        });
                    });
                    fetch.once('error', (err) => {
                        console.error('Fetch error:', err);
                    });
                    fetch.once('end', () => {
                    });
                });
                imap.end();
            });
        });
    });
    
    imap.once('error', (err) => {
        console.error('IMAP error:', err);
    });

    imap.once('end', () => {
        console.log('IMAP connection ended');
    });

    imap.connect();
}
fetchEmails();
