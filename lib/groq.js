'use strict';

/**
 * Groq API — génération de réponses avec bascule sur 2 clés.
 */

const axios = require('axios');

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getApiKeys() {
    const keys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        ...(process.env.GROQ_API_KEYS || '').split(','),
    ]
        .map((k) => (k || '').trim())
        .filter((k) => k.startsWith('gsk_'));

    return [...new Set(keys)];
}

function isAiEnabled() {
    if (process.env.USE_AI_REPLY === 'false') return false;
    return getApiKeys().length > 0;
}

function shouldRetry(status) {
    return status === 429 || status === 401 || status === 403 || status === 503 || (status >= 500 && status < 600);
}

/**
 * Appel chat Groq avec failover entre les clés API.
 */
async function chatCompletion(messages, { maxTokens = 900, temperature = 0.35 } = {}) {
    const keys = getApiKeys();
    if (!keys.length) throw new Error('GROQ_API_KEY manquant');

    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        try {
            const { data } = await axios.post(
                API_URL,
                {
                    model:       MODEL,
                    messages,
                    temperature,
                    max_tokens:  maxTokens,
                },
                {
                    headers: {
                        Authorization:  `Bearer ${key}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 45000,
                }
            );

            const content = data?.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error('Réponse Groq vide');

            return { content, keyIndex: i + 1 };
        } catch (err) {
            lastError = err;
            const status = err.response?.status;
            const msg    = err.response?.data?.error?.message || err.message;
            console.warn(`[GROQ] Clé ${i + 1}/${keys.length} échec: ${msg}`);

            if (i < keys.length - 1 && (shouldRetry(status) || !status)) {
                continue;
            }
            throw new Error(msg);
        }
    }

    throw lastError || new Error('Groq indisponible');
}

/**
 * Génère le corps d'une réponse email personnalisée.
 */
async function generateReplyBody({ label, subject, body, senderName, templateBody }) {
    const prenom = (senderName || '').trim().split(/\s+/)[0] || '';

    const { content } = await chatCompletion([
        {
            role:    'system',
            content: [
                'Tu rédiges des emails pour le club Boxing Center (boxe à Toulouse, France).',
                'Ton : professionnel, chaleureux, concis. Français uniquement.',
                'Ne invente jamais de tarifs chiffrés, dates précises ni promesses non dans le modèle.',
                'Pas de markdown. Pas de signature (elle est ajoutée automatiquement).',
                'Réponds uniquement avec le corps du message, sans objet.',
            ].join(' '),
        },
        {
            role:    'user',
            content: [
                `Catégorie : ${label}`,
                prenom ? `Prénom client : ${prenom}` : 'Prénom client : inconnu',
                `Objet du message reçu : ${subject}`,
                '',
                'Message du client :',
                (body || '').slice(0, 2500),
                '',
                'Modèle de référence (à adapter, pas copier mot pour mot) :',
                templateBody,
            ].join('\n'),
        },
    ]);

    return content.replace(/^```[\w]*\n?|```$/g, '').trim();
}

async function verify() {
    if (!isAiEnabled()) {
        return { ok: false, error: 'GROQ_API_KEY / GROQ_API_KEY_2 manquant' };
    }
    try {
        const { keyIndex } = await chatCompletion(
            [{ role: 'user', content: 'Réponds uniquement OK' }],
            { maxTokens: 5, temperature: 0 }
        );
        return { ok: true, model: MODEL, keyIndex };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

module.exports = { chatCompletion, generateReplyBody, isAiEnabled, verify, getApiKeys };
