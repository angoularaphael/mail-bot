'use strict';

/**
 * Construction de la réponse — Groq IA si dispo, sinon template fixe.
 */

const { renderTemplate } = require('./templates');
const { generateReplyBody, isAiEnabled } = require('./groq');

const SITE_URL = (process.env.BOXING_CENTER_SITE_URL || 'https://boxingcenter.fr/').replace(/\/?$/, '/');

function withWebsiteMention(body) {
    const text = body || '';
    if (/boxingcenter\.fr|https?:\/\/\S+/i.test(text)) return text;

    return `${text.trim()}

Vous pouvez aussi retrouver les informations utiles sur notre site : ${SITE_URL}`;
}

/**
 * @returns {Promise<{ subject: string, body: string, source: string }>}
 */
async function buildReply(category, email) {
    const name = email.from?.name || email.replyTo?.name || '';
    const tpl  = renderTemplate(category, name);

    if (!isAiEnabled()) {
        return { subject: tpl.subject, body: withWebsiteMention(tpl.body), source: 'template' };
    }

    try {
        const body = await generateReplyBody({
            label:        tpl.subject.replace(/^Re : /, ''),
            subject:      email.subject || '',
            body:         email.text || '',
            senderName:   name,
            templateBody: tpl.body,
        });

        return {
            subject: tpl.subject,
            body:    withWebsiteMention(body || tpl.body),
            source:  'groq',
        };
    } catch (err) {
        console.warn(`[REPLY] Groq indisponible, template utilisé: ${err.message}`);
        return { subject: tpl.subject, body: withWebsiteMention(tpl.body), source: 'template-fallback' };
    }
}

module.exports = { buildReply };
