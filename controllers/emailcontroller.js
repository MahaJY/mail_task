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

const imap = new Imap(imapConfig);

function fetchEmails(req, res) {
    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error opening INBOX' });
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
                    return res.status(500).json({ error: 'Error searching emails' });
                }
                const emails = {};
                let fetchedEmailsCount = 0;
                if (results.length === 0) {
                    imap.end();
                    res.json(emails);
                }

                results.forEach((result) => {
                    const fetchOptions = {
                        bodies: '',
                        markSeen: false
                    };
                    const fetch = imap.fetch(result, fetchOptions);
                    fetch.on('message', (msg, seqno) => {
                        msg.on('body', (stream, info) => {
                            simpleParser(stream, (err, parsed) => {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).json({ error: 'Error parsing email' });
                                }
                                emails[result] = {
                                    subject: parsed.subject,
                                    body: parsed.text
                                };
                                
                            });
                        });
                    });
                    fetch.once('error', (err) => {
                        console.error('Fetch error:', err);
                        return res.status(500).json({ error: 'Error fetching email' });
                    });
                    fetch.once('end', () => {
                            fetchedEmailsCount++;
                            if (fetchedEmailsCount === results.length) {
                                imap.end();
                                console.log(`Found ${fetchedEmailsCount} emails with subject containing "${subjectKeyword}" from ${senderEmail}`);
                                res.json({ Remaindermailcount: fetchedEmailsCount, emails: emails });
                            }
                        });
                    });
            });
        });
    });
    imap.once('error', (err) => {
        console.error('IMAP error:', err);
        return res.status(500).json({ error: 'IMAP error' });
    });
    imap.once('end', () => {
        console.log('IMAP connection ended');
    });
    imap.connect();
}
module.exports = {fetchEmails}