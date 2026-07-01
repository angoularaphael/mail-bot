'use strict';

/**
 * Lecture des emails entrants via IMAP.
 * Connexion à Gmail (ou tout serveur IMAP), récupération des emails non lus,
 * parsing avec mailparser, marquage comme lus après traitement.
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const cfg = {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_TLS !== 'false',
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
};

function makeClient() {
    return new ImapFlow({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
        logger: false,
        tls: { rejectUnauthorized: false },
    });
}

function isConfigured() {
    return Boolean(cfg.user && cfg.pass);
}

/**
 * Récupère et parse tous les emails non lus depuis INBOX.
 * Ne marque PAS comme lus — appeler markAsSeen(uids) séparément.
 *
 * @param {number} limit  Nombre max d'emails à récupérer
 * @returns {{ emails: Array, total: number }}
 */
async function fetchUnseenEmails(limit = 50) {
    if (!isConfigured()) {
        throw new Error(
            'IMAP non configuré — définissez IMAP_USER et IMAP_PASS dans .env\n' +
            'Pour Gmail : activez IMAP dans les paramètres + créez un mot de passe d\'application.'
        );
    }

    const client = makeClient();
    const emails = [];

    await client.connect();

    try {
        const lock = await client.getMailboxLock('INBOX');
        try {
            const uids = await client.search({ unseen: true }, { uid: true });

            if (!uids || uids.length === 0) {
                return { emails: [], total: 0 };
            }

            const batch = uids.slice(-limit); // prend les plus récents si > limit

            for await (const msg of client.fetch(
                batch,
                { uid: true, source: true },
                { uid: true }
            )) {
                try {
                    const parsed = await simpleParser(msg.source, {
                        skipTextToHtml: false,
                        skipHtmlToText: false,
                        skipImageLinks: true,
                    });

                    const fromAddr = parsed.from?.value?.[0] || {};
                    const toAddr   = parsed.to?.value?.[0]   || {};

                    emails.push({
                        uid:       msg.uid,
                        messageId: parsed.messageId || `imap-uid-${msg.uid}-${Date.now()}`,
                        from: {
                            address: fromAddr.address || '',
                            name:    fromAddr.name    || '',
                        },
                        to: {
                            address: toAddr.address || '',
                            name:    toAddr.name    || '',
                        },
                        subject: (parsed.subject || '').trim() || '(sans objet)',
                        text:    parsed.text  || '',
                        html:    parsed.html  || '',
                        date:    parsed.date  || new Date(),
                    });
                } catch (parseErr) {
                    console.warn(`[IMAP] Impossible de parser UID ${msg.uid}: ${parseErr.message}`);
                }
            }
        } finally {
            lock.release();
        }
    } finally {
        await client.logout();
    }

    return { emails, total: emails.length };
}

/**
 * Marque une liste d'UIDs comme lus dans INBOX.
 *
 * @param {number[]} uids
 */
async function markAsSeen(uids) {
    if (!uids || uids.length === 0) return;
    if (!isConfigured()) return;

    const client = makeClient();
    await client.connect();

    try {
        const lock = await client.getMailboxLock('INBOX');
        try {
            await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
        } finally {
            lock.release();
        }
    } finally {
        await client.logout();
    }
}

module.exports = { fetchUnseenEmails, markAsSeen, isConfigured };
