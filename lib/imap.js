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
function getSinceDate() {
    const days = parseInt(process.env.IMAP_SINCE_DAYS || '14', 10);
    if (!days || days <= 0) return null;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    return since;
}

function getRecentReadSince() {
    const hours = parseInt(process.env.IMAP_RECENT_READ_HOURS || '12', 10);
    if (!hours || hours <= 0) return null;
    return new Date(Date.now() - hours * 3600 * 1000);
}

/**
 * Récupère les emails à traiter : non-lus + reçus récemment même déjà lus
 * (Gmail marque « lu » dès qu'on ouvre le message dans l'interface).
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
    const since = getSinceDate();
    const recentSince = getRecentReadSince();
    let unseenTotal = 0;

    await client.connect();

    try {
        const lock = await client.getMailboxLock('INBOX');
        try {
            const unseenCriteria = since ? { unseen: true, since } : { unseen: true };
            const unseenUids = await client.search(unseenCriteria, { uid: true }) || [];

            // Emails récents même lus — évite de rater un mail ouvert dans Gmail avant le bot
            let recentUids = [];
            if (recentSince) {
                recentUids = await client.search({ since: recentSince }, { uid: true }) || [];
            }

            const uidSet = new Set([...unseenUids, ...recentUids]);
            if (uidSet.size === 0) {
                return { emails: [], total: 0, unseenTotal: 0 };
            }

            unseenTotal = unseenUids.length;

            const dated = [];
            for await (const msg of client.fetch(
                [...uidSet],
                { uid: true, internalDate: true, flags: true },
                { uid: true }
            )) {
                dated.push({
                    uid:    msg.uid,
                    date:   msg.internalDate || new Date(0),
                    unseen: !msg.flags?.has('\\Seen'),
                });
            }
            dated.sort((a, b) => new Date(b.date) - new Date(a.date));
            unseenTotal = unseenUids.length;
            const batch = dated.slice(0, limit).map((d) => d.uid);
            const unseenByUid = new Map(dated.map((d) => [d.uid, d.unseen]));

            for await (const msg of client.fetch(
                batch,
                { uid: true, source: true, internalDate: true },
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

                    const replyAddr = parsed.replyTo?.value?.[0] || {};

                    emails.push({
                        uid:       msg.uid,
                        unseen:    unseenByUid.get(msg.uid) ?? true,
                        internalDate: msg.internalDate || parsed.date || new Date(),
                        messageId: parsed.messageId || `imap-uid-${msg.uid}-${Date.now()}`,
                        from: {
                            address: fromAddr.address || '',
                            name:    fromAddr.name    || '',
                        },
                        replyTo: {
                            address: replyAddr.address || '',
                            name:    replyAddr.name    || '',
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

    return {
        emails: emails.sort((a, b) => new Date(b.date) - new Date(a.date)),
        total:  emails.length,
        unseenTotal,
    };
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
