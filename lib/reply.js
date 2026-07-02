'use strict';

/**
 * Construction de la réponse — Groq IA si dispo, sinon template fixe.
 */

const { renderTemplate } = require('./templates');
const { generateReplyBody, isAiEnabled } = require('./groq');

/**
 * @returns {Promise<{ subject: string, body: string, source: string }>}
 */
async function buildReply(category, email) {
    const name = email.from?.name || email.replyTo?.name || '';
    const tpl  = renderTemplate(category, name);

    if (!isAiEnabled()) {
        return { subject: tpl.subject, body: tpl.body, source: 'template' };
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
            body:    body || tpl.body,
            source:  'groq',
        };
    } catch (err) {
        console.warn(`[REPLY] Groq indisponible, template utilisé: ${err.message}`);
        return { subject: tpl.subject, body: tpl.body, source: 'template-fallback' };
    }
}

module.exports = { buildReply };
