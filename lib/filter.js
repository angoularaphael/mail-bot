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
    /do[_\s.-]?not[_\s.-]?reply/i,
    /^team@updates\./i,
    /^notice@/i,
    /^hi@cursor/i,
    /^automate\./i,
    /@updates\./i,
    /hostinger\.com/i,
    /binance\.com/i,
    /anthropic\.com/i,
    /igensia\.com/i,
    /brevosend\.com/i,
    /suzinabot/i,
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
    /keyce\.fr/i,
    /ovhcloud\.com/i,
    /ovh\.com/i,
    /collegedeparis/i,
    /collège de paris/i,
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
    /information importante concernant votre compte/i,
    /de nouvelles façons de générer/i,
    /politique de (confidentialité|respect)/i,
    /learn more about our updated/i,
    /keyce academy/i,
    /olympiades/i,
    /updated invitation/i,
    /invitation:/i,
    /séance de travail/i,
    /code d.accès wi-?fi/i,
    /^TR:/i,
];

const STRONG_BOXING = [
    'boxing center', 'boxingcenter', 'boxing-center',
    'boxe', 'boxing', 'boxeur', 'boxeuse',
    'club de boxe', 'cours de boxe', 'salle de boxe',
    'boxe enfant', 'minimes', 'portet', 'ramonville', 'saint-cyprien',
];

const WEAK_BOXING = [
    'séance d essai', 'seance d essai', "séance d'essai",
    'inscription', 'inscrire', "m'inscrire",
    'résiliation', 'resiliation', 'résilier',
    'remboursement', 'tarif', 'planning', 'horaire',
    'enfant', 'ado', 'compétition', 'competition',
    'partenariat', 'facture', 'réclamation', 'reclamation',
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
    if (STRONG_BOXING.some((kw) => text.includes(normalize(kw)))) return true;
    // Mots faibles seuls (planning, compétition…) : exiger "boxe/boxing" explicite
    const hasBoxeWord = /\bboxe\b|\bboxing\b|boxingcenter|boxing.center/.test(text);
    return hasBoxeWord && WEAK_BOXING.some((kw) => text.includes(normalize(kw)));
}

/**
 * Emails envoyés par Brevo (réponses auto) — ignorer pour éviter les boucles.
 * Les emails de test [TEST-XX] passent quand même.
 */
function isOurOwnOutbound(email) {
    const from = (email.from?.address || '').toLowerCase();
    if (!/brevosend\.com|suzinabot/i.test(from)) return false;
    return !/^\[TEST-/i.test(email.subject || '');
}

/**
 * @param {{ category: string, confidence: number }} classification
 * @returns {{ skip: boolean, reason: string|null }}
 */
function shouldSkip(email, classification) {
    // Emails de test explicites — toujours traiter
    if (/^\[TEST-/i.test(email.subject || '')) {
        return { skip: false, reason: null };
    }

    if (isOurOwnOutbound(email)) {
        return { skip: true, reason: 'email sortant Brevo (évite boucle)' };
    }

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
    if (!a || !a.includes('@')) return true;
    const local = a.split('@')[0] || '';
    const domain = a.split('@')[1] || '';
    if (/do[_\s.-]?not[_\s.-]?reply|noreply|no-reply|donotreply|ne-pas-repondre/.test(local)) {
        return true;
    }
    if (/^(info|news|newsletter|marketing|notifications?|webmestre|notice|team)$/.test(local)) {
        return true;
    }
    if (/brevosend\.com|suzinabot|hostinger|binance|meetup\.com|lydia\.me/i.test(domain)) {
        return true;
    }
    if (/^news\.|\.email\.|courriel\./i.test(domain)) {
        return true;
    }
    return false;
}

/**
 * Adresse à laquelle envoyer la réponse auto.
 * Priorité : Reply-To → From (si adresse réelle, pas noreply/brevo).
 */
function getReplyAddress(email) {
    const candidates = [
        email.replyTo?.address,
        email.from?.address,
    ].filter(Boolean);

    for (const addr of candidates) {
        if (!isNoReplyAddress(addr)) return addr;
    }
    return null;
}

module.exports = { shouldSkip, isNoReplyAddress, getReplyAddress, hasBoxingContext, MIN_CONFIDENCE };
