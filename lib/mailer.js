'use strict';

/**
 * Envoi d'emails via Brevo SMTP.
 * Compatible avec la configuration déjà utilisée dans les autres bots du projet.
 */

const nodemailer = require('nodemailer');

const SMTP_HOST    = process.env.BREVO_SMTP_HOST  || 'smtp-relay.brevo.com';
const SMTP_PORT    = parseInt(process.env.BREVO_SMTP_PORT || '587', 10);
const SMTP_USER    = (process.env.BREVO_SMTP_LOGIN || '').trim();
const SMTP_PASS    = (process.env.BREVO_SMTP_KEY   || '').trim();
const SENDER_EMAIL = (process.env.BREVO_SENDER_EMAIL || 'suzinabot@gmail.com').trim();
const SENDER_NAME  = (process.env.BREVO_SENDER_NAME  || 'Boxing Center').trim();
const REPLY_TO     = (process.env.BREVO_REPLY_TO || 'boxingcenter31@gmail.com').trim();

let _transport = null;

function getTransport() {
    if (!_transport) {
        _transport = nodemailer.createTransport({
            host:   SMTP_HOST,
            port:   SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth:   { user: SMTP_USER, pass: SMTP_PASS },
        });
    }
    return _transport;
}

function isConfigured() {
    return Boolean(SMTP_USER && SMTP_PASS);
}

/**
 * Vérifie la connexion SMTP.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function verify() {
    if (!isConfigured()) {
        return { ok: false, error: 'BREVO_SMTP_LOGIN ou BREVO_SMTP_KEY manquant dans .env' };
    }
    try {
        await getTransport().verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

/**
 * Envoie un email via Brevo SMTP.
 *
 * @param {{ to: string, subject: string, html: string, text?: string, replyTo?: string }} opts
 */
async function sendEmail({ to, subject, html, text, replyTo }) {
    if (!isConfigured()) {
        throw new Error(
            'Brevo SMTP non configuré — ajoutez BREVO_SMTP_LOGIN et BREVO_SMTP_KEY dans .env'
        );
    }
    if (!to) throw new Error('Destinataire requis');

    await getTransport().sendMail({
        from:    `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to,
        replyTo: replyTo || REPLY_TO,
        subject,
        html:    html || '',
        text:    text || '',
        headers: {
            'X-Mailer':    'Boxing Center Mail Bot',
            'X-Bot-Name':  'mail-bot',
        },
    });
}

module.exports = { sendEmail, isConfigured, verify };
