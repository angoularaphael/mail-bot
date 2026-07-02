'use strict';

/**
 * Envoi d'emails via Brevo — API REST (prioritaire) ou SMTP (fallback).
 * L'API REST évite l'erreur "525 Unauthorized IP address" sur bot-hosting.
 */

const axios      = require('axios');
const nodemailer = require('nodemailer');

const BREVO_API_KEY  = (process.env.BREVO_API_KEY || '').trim();
const SMTP_HOST      = process.env.BREVO_SMTP_HOST  || 'smtp-relay.brevo.com';
const SMTP_PORT      = parseInt(process.env.BREVO_SMTP_PORT || '587', 10);
const SMTP_USER      = (process.env.BREVO_SMTP_LOGIN || '').trim();
const SMTP_PASS      = (
    process.env.BREVO_SMTP_KEY ||
    (BREVO_API_KEY.startsWith('xsmtpsib-') ? BREVO_API_KEY : '')
).trim();
const SENDER_EMAIL   = (process.env.BREVO_SENDER_EMAIL || 'suzinabot@gmail.com').trim();
const SENDER_NAME    = (process.env.BREVO_SENDER_NAME  || 'Boxing Center').trim();
const REPLY_TO       = (process.env.BREVO_REPLY_TO || 'boxingcenter31@gmail.com').trim();

let _transport = null;

function useApi() {
    return Boolean(BREVO_API_KEY && BREVO_API_KEY.startsWith('xkeysib-'));
}

function useSmtp() {
    return Boolean(SMTP_USER && SMTP_PASS);
}

function isConfigured() {
    return useApi() || useSmtp();
}

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

async function sendViaApi({ to, subject, html, text, replyTo, bcc }) {
    const payload = {
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email: to }],
        replyTo:     { email: replyTo || REPLY_TO, name: SENDER_NAME },
        subject,
        htmlContent: html || '',
        textContent: text || '',
        headers:     { 'X-Mailer': 'Boxing Center Mail Bot' },
    };
    if (bcc) payload.bcc = [{ email: bcc }];

    await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'api-key':        BREVO_API_KEY,
                'Content-Type':   'application/json',
                Accept:           'application/json',
            },
            timeout: 30000,
        }
    );
}

async function sendViaSmtp({ to, subject, html, text, replyTo, bcc }) {
    await getTransport().sendMail({
        from:    `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to,
        bcc:     bcc || undefined,
        replyTo: replyTo || REPLY_TO,
        subject,
        html:    html || '',
        text:    text || '',
        headers: { 'X-Mailer': 'Boxing Center Mail Bot', 'X-Bot-Name': 'mail-bot' },
    });
}

/**
 * @returns {Promise<{ ok: boolean, via?: string, error?: string }>}
 */
async function verify() {
    if (!isConfigured()) {
        return { ok: false, error: 'BREVO_API_KEY (xkeysib…) ou BREVO_SMTP_LOGIN + BREVO_SMTP_KEY requis' };
    }

    if (useApi()) {
        try {
            await axios.get('https://api.brevo.com/v3/account', {
                headers: { 'api-key': BREVO_API_KEY, Accept: 'application/json' },
                timeout: 15000,
            });
            return { ok: true, via: 'api' };
        } catch (err) {
            return { ok: false, via: 'api', error: err.response?.data?.message || err.message };
        }
    }

    try {
        await getTransport().verify();
        return { ok: true, via: 'smtp' };
    } catch (err) {
        return { ok: false, via: 'smtp', error: err.message };
    }
}

/**
 * Envoie un email — API REST en priorité (pas de blocage IP).
 */
async function sendEmail({ to, subject, html, text, replyTo, bcc }) {
    if (!isConfigured()) {
        throw new Error('Brevo non configuré — ajoutez BREVO_API_KEY dans .env');
    }
    if (!to) throw new Error('Destinataire requis');

    const payload = { to, subject, html, text, replyTo, bcc };

    if (useApi()) {
        await sendViaApi(payload);
        return;
    }

    try {
        await sendViaSmtp(payload);
    } catch (err) {
        if (/525|unauthorized ip/i.test(err.message || '')) {
            throw new Error(
                `${err.message} — Ajoutez BREVO_API_KEY (xkeysib…) dans .env pour utiliser l'API REST sans whitelist IP.`
            );
        }
        throw err;
    }
}

module.exports = { sendEmail, isConfigured, verify, useApi, useSmtp };
