'use strict';

/**
 * Transmission des emails au bon responsable selon la catégorie.
 * Génère un email de notification formaté et l'envoie via Brevo.
 */

const { sendEmail } = require('./mailer');
const { buildForwardHtml } = require('./brand');
const { getRoute } = require('../config/routing');

/**
 * Transmet un email entrant au responsable correspondant à sa catégorie.
 *
 * @param {Object} email           Email parsé
 * @param {Object} classification  { category, label, urgent }
 * @returns {Promise<string|null>} Adresse de destination, ou null si pas de transmission
 */
async function forwardEmail(email, classification) {
    const { category, label, urgent } = classification;
    const route = getRoute(category);

    if (!route.dest) return null;

    const urgentTag = urgent ? '🚨 URGENT — ' : '';
    const subject   = `${urgentTag}[${label}] ${email.subject} — de ${email.from.address}`;

    const html = buildForwardHtml({
        fromEmail:       email.from.address,
        fromName:        email.from.name,
        originalSubject: email.subject,
        originalBody:    email.text || '',
        category:        label,
        urgent:          urgent,
        receivedAt:      email.date,
    });

    const text = [
        `[Transfert automatique — ${label}]`,
        urgent ? '⚠️  URGENT — À TRAITER EN PRIORITÉ' : '',
        '',
        `De      : ${email.from.name ? `${email.from.name} ` : ''}<${email.from.address}>`,
        `Objet   : ${email.subject}`,
        `Reçu le : ${new Date(email.date).toLocaleString('fr-FR')}`,
        '',
        '─── Message original ────────────────────────────────────',
        email.text || '(corps en HTML uniquement)',
    ].filter((l) => l !== false && l !== undefined).join('\n');

    await sendEmail({
        to:      route.dest,
        subject,
        html,
        text,
        replyTo: email.from.address,
    });

    return route.dest;
}

module.exports = { forwardEmail };
