'use strict';

/**
 * Filtre newsletters / expéditeurs automatiques / emails hors sujet.
 * Deux niveaux :
 *   1. expéditeur ou objet manifestement automatique → ignoré
 *   2. pas de mot-clé lié au Boxing Center → ignoré (évite les faux positifs)
 */

const MIN_CONFIDENCE = parseInt(process.env.MIN_CONFIDENCE || '3', 10);
const REQUIRE_BOXING_CONTEXT = process.env.REQUIRE_BOXING_CONTEXT !== 'false';

/** Motifs dans l'adresse expéditeur */
const SKIP_FROM = [
    /noreply|no-reply|donotreply|do-not-reply|ne-pas-repondre|nepasrepondre/i,
    /^info@/i,
    /^news@/i,
    /^newsletter@/i,
    /^marketing@/i,
    /^notifications?@/i,
    /^alert@/i,
    /^contact@/i,          // contact@studely, contact@… (sauf vrais clients rares)
    /^support@news\./i,
    /^webmestre/i,
    /@news\./i,            // news.lydia.me, news.fitnesspark.fr
    /@email\./i,            // email.meetup.com, email.carrefour.fr
    /@courriel\./i,
    /@emails\./i,
    /@announcements\./i,
    /@jobalert\./i,
    /@notifications/i,
    /@receipts\+/i,
    /@failed-payments/i,
    /@renewals@/i,
    /meetup\.com/i,
    /lydia\.me/i,
    /stripe\.com/i,
    /revolut\.com/i,
    /indeed\.com/i,
    /paypal\./i,
    /google\.com/i,
    /accounts\.google/i,
    /carrefour/i,
    /lidl\.com/i,
    /fitnesspark/i,
    /deliveroo/i,
    /klarna/i,
    /socgen/i,
    /ccleaner/i,
    /studely/i,
    /cursor\.com/i,
    /render\.com/i,
    /cognition\.ai/i,
    /mairie-toulouse/i,
    /tisseo/i,
    /wilout/i,
    /lafranceinsoumise/i,
    /lemfi/i,
];

/** Mots dans l'objet typiques des newsletters */
const SKIP_SUBJECT = [
    /offre d.?emploi/i,
    /job alert/i,
    /security alert/i,
    /payment to .+ was unsuccessful/i,
    /reçu pour votre paiement/i,
    /virement (instantané|exécuté|réussi)/i,
    /vous avez envoyé \d/i,
    /newsletter/i,
    /lettre d.information/i,
    /unsubscribe|désabonnez/i,
    /% offerts|🎂|📣|📅|⚡|🚨/,
    /rappel:/i,
    /profitez de deux ans/i,
    /introducing .+ app/i,
    /nouvelle suggestion de groupe/i,
    /programmé à l.instant/i,
    /\[news\.\]/i,
    /candidature pour le poste/i,
    /terms of service/i,
    /privacy policy/i,
    /relevé de compte/i,
    /votre billet pour/i,
    /travaux d.été/i,
    /challenge .+ commence/i,
    /inscris-toi maintenant/i,
    /fêtez les \d+ ans/i,
    /updated terms/i,
];

/** Au moins un de ces mots doit apparaître pour traiter l'email */
const BOXING_KEYWORDS = [
    'boxing center', 'boxingcenter', 'boxing-center',
    'boxe', 'boxing', 'boxeur', 'boxeuse',
    'cours de boxe', 'club de boxe', 'salle de boxe',
    'séance d essai', 'seance d essai', 'séance d\'essai',
    'inscription', 'inscrire', 'm inscrire',
    'abonnement', 'cotisation', 'adhésion', 'adhesion',
    'résiliation', 'resiliation', 'résilier',
    'remboursement', 'tarif', 'prix',
    'planning', 'horaire', 'cours du',
    'enfant', 'ado', 'mineur', 'boxe enfant',
    'compétition', 'competition', 'combat', 'gala',
    'partenariat', 'sponsor',
    'facture', 'réclamation', 'reclamation',
    'coach', 'entrainement', 'entraînement',
    'gants', 'ring', 'minimes', 'portet', 'ramonville', 'saint-cyprien',
];

function normalize(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['']/g, "'");
}

function hasBoxingContext(subject, body) {
    const text = normalize(`${subject} ${body}`);
    return BOXING_KEYWORDS.some((kw) => text.includes(normalize(kw)));
}

/**
 * @param {{ from: { address: string }, subject: string, text: string }} email
 * @param {{ category: string, confidence: number }} classification
 * @returns {{ skip: boolean, reason: string|null }}
 */
function shouldSkip(email, classification) {
    const addr    = (email.from?.address || '').toLowerCase();
    const subject = email.subject || '';
    const body    = email.text || '';
    const local   = addr.split('@')[0] || '';

    for (const pat of SKIP_FROM) {
        if (pat.test(addr) || pat.test(local)) {
            return { skip: true, reason: `expéditeur automatique (${addr})` };
        }
    }

    for (const pat of SKIP_SUBJECT) {
        if (pat.test(subject)) {
            return { skip: true, reason: 'objet newsletter/spam' };
        }
    }

    if (classification.category === 'autre' && classification.confidence === 0) {
        return { skip: true, reason: 'non classifié (autre)' };
    }

    if (classification.confidence < MIN_CONFIDENCE) {
        return { skip: true, reason: `score trop faible (${classification.confidence} < ${MIN_CONFIDENCE})` };
    }

    if (REQUIRE_BOXING_CONTEXT && !hasBoxingContext(subject, body)) {
        return { skip: true, reason: 'hors sujet Boxing Center' };
    }

    return { skip: false, reason: null };
}

/** Ne jamais envoyer de réponse auto à ces adresses */
function isNoReplyAddress(address) {
    const a = (address || '').toLowerCase();
    const local = a.split('@')[0] || '';
    const domain = a.split('@')[1] || '';
    if (/^(noreply|no-reply|donotreply|do-not-reply|ne-pas-repondre|info|news|newsletter|marketing|notifications?|webmestre)/.test(local)) {
        return true;
    }
    if (/@news\.|meetup\.com|lydia\.me|email\.|courriel\./i.test(domain)) {
        return true;
    }
    return false;
}

module.exports = { shouldSkip, isNoReplyAddress, hasBoxingContext, MIN_CONFIDENCE };
