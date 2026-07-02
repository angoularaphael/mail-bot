'use strict';

/**
 * Filtre les emails automatiques / newsletters / spam
 * pour éviter de répondre à Stripe, Indeed, Revolut, etc.
 */

const MIN_CONFIDENCE = parseInt(process.env.MIN_CONFIDENCE || '3', 10);

/** Domaines ou motifs d'expéditeurs à ignorer */
const SKIP_FROM = [
    /noreply|no-reply|donotreply|do-not-reply|ne-pas-repondre|nepasrepondre/i,
    /@stripe\.com$/i,
    /@revolut\.com$/i,
    /@indeed\.com$/i,
    /@paypal\./i,
    /@google\.com$/i,
    /@accounts\.google/i,
    /@notificationsclients\./i,
    /@socgen\.com$/i,
    /@ccleaner\.com$/i,
    /@deliveroo\.com$/i,
    /@klarna\.com$/i,
    /@lemfi\.com$/i,
    /@meetup\.com$/i,
    /@studely\.com$/i,
    /@cursor\.com$/i,
    /@mail\.cursor/i,
    /@emails\./i,
    /@announcements\./i,
    /@jobalert\./i,
    /@hello\./i,
    /@team@/i,
    /@notification/i,
    /@receipts\+/i,
    /@failed-payments/i,
    /@renewals@/i,
    /@lafranceinsoumise/i,
];

/** Mots dans l'objet typiques des newsletters (pas des vrais clients) */
const SKIP_SUBJECT = [
    /offre d.?emploi/i,
    /job alert/i,
    /security alert/i,
    /payment to .+ was unsuccessful/i,
    /reçu pour votre paiement/i,
    /virement (instantané|exécuté|réussi)/i,
    /vous avez envoyé \d/i,
    /newsletter/i,
    /unsubscribe/i,
    /% offerts/i,
    /rappel:/i,
    /profitez de deux ans/i,
    /introducing .+ app/i,
];

/**
 * @param {{ from: { address: string }, subject: string, text: string }} email
 * @param {{ category: string, confidence: number }} classification
 * @returns {{ skip: boolean, reason: string|null }}
 */
function shouldSkip(email, classification) {
    const addr    = (email.from?.address || '').toLowerCase();
    const subject = email.subject || '';
    const local   = addr.split('@')[0] || '';

    for (const pat of SKIP_FROM) {
        if (pat.test(addr) || pat.test(local)) {
            return { skip: true, reason: `expéditeur automatique (${addr})` };
        }
    }

    for (const pat of SKIP_SUBJECT) {
        if (pat.test(subject)) {
            return { skip: true, reason: `objet newsletter/spam` };
        }
    }

    if (classification.category === 'autre' && classification.confidence === 0) {
        return { skip: true, reason: 'non classifié (autre)' };
    }

    if (classification.confidence < MIN_CONFIDENCE) {
        return { skip: true, reason: `score trop faible (${classification.confidence} < ${MIN_CONFIDENCE})` };
    }

    return { skip: false, reason: null };
}

/** Ne jamais envoyer de réponse auto à ces adresses */
function isNoReplyAddress(address) {
    const a = (address || '').toLowerCase();
    return /^(noreply|no-reply|donotreply|do-not-reply|ne-pas-repondre)/.test(a.split('@')[0]);
}

module.exports = { shouldSkip, isNoReplyAddress, MIN_CONFIDENCE };
