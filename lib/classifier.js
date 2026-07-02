'use strict';

/**
 * Classification des emails entrants en 12 catégories.
 * Algorithme basé sur des mots-clés pondérés — sans API externe.
 * Détecte également les emails urgents.
 */

// Poids de priorité : plus le chiffre est élevé, plus la catégorie est "forte"
// pour éviter qu'une catégorie générique (planning, tarif) l'emporte sur une spécifique.
const CATEGORIES = [
    {
        id: 'inscription',
        label: "Demande d'inscription",
        priority: 2,
        keywords: [
            "inscription", "inscrire", "s'inscrire", "m'inscrire",
            "je souhaite m'inscrire", "je voudrais m'inscrire",
            "adhésion", "adhérer", "membre", "rejoindre", "intégrer",
            "comment m'inscrire", "comment rejoindre", "devenir membre",
            "prendre une licence", "carte de membre",
        ],
    },
    {
        id: 'seance_essai',
        label: "Demande séance d'essai",
        priority: 3,
        keywords: [
            "essai", "séance d'essai", "cours d'essai", "essayer",
            "tester", "cours gratuit", "première séance", "séance gratuite",
            "séance découverte", "cours découverte", "venir essayer",
            "essai gratuit", "séance offerte", "cours offert",
            "voir si ça me convient", "avant de m'inscrire", "initiation",
            "découverte", "essai sans engagement",
        ],
    },
    {
        id: 'tarif',
        label: 'Demande tarif',
        priority: 1,
        keywords: [
            "tarif", "prix", "coût", "cout", "combien",
            "formule", "offre", "forfait", "mensuel", "mensualité",
            "cotisation", "grille tarifaire", "c'est combien",
            "quel est le tarif", "tarification", "quel prix",
            "tarif abonnement", "tarif adhésion", "tarif annuel",
            "tarif mensuel", "tarif trimestrel",
            "renseignement", "renseignements", "me renseigner",
            "offre d'été", "offre d ete", "offre été",
        ],
    },
    {
        id: 'planning',
        label: 'Demande planning',
        priority: 1,
        keywords: [
            "planning", "horaire", "horaires", "programme", "créneau",
            "emploi du temps", "agenda", "cours du soir", "cours du matin",
            "quand", "à quelle heure", "week-end", "samedi", "dimanche",
            "lundi", "mardi", "mercredi", "jeudi", "vendredi",
            "calendrier", "planning des cours", "horaires d'ouverture",
        ],
    },
    {
        id: 'enfant_ado',
        label: 'Demande enfant / ado',
        priority: 2,
        keywords: [
            "enfant", "ado", "adolescent", "mineur", "jeune", "junior",
            "fils", "fille", "gamin", "gamines", "mon fils", "ma fille",
            "mon enfant", "mes enfants", "baby boxing", "bébé",
            "école primaire", "lycée", "collège", "primaire",
            "cours enfants", "cours ados", "cours jeunes",
            "8 ans", "9 ans", "10 ans", "11 ans", "12 ans", "13 ans",
            "14 ans", "15 ans", "16 ans", "17 ans",
        ],
    },
    {
        id: 'remboursement',
        label: 'Demande remboursement',
        priority: 3,
        keywords: [
            "remboursement", "rembourser", "être remboursé", "avoir",
            "restitution", "récupérer mon argent", "trop prélevé",
            "prélèvement abusif", "erreur de paiement", "double prélèvement",
            "prélèvement erroné", "trop facturé", "crédit", "note de crédit",
            "remboursez-moi", "je demande un remboursement",
        ],
    },
    {
        id: 'resiliation',
        label: 'Demande résiliation',
        priority: 4,
        keywords: [
            "résiliation", "résilier", "annuler mon abonnement",
            "quitter le club", "annulation", "arrêter", "désinscription",
            "désabonnement", "mettre fin", "stopper mon abonnement",
            "clôturer", "clôture", "je ne veux plus", "souhaite partir",
            "partir du club", "ne plus être membre", "mettre fin à mon contrat",
            "lettre de résiliation", "préavis",
        ],
    },
    {
        id: 'partenariat',
        label: 'Demande partenariat',
        priority: 2,
        keywords: [
            "partenariat", "partenaire", "collaboration", "sponsoring",
            "sponsor", "proposition commerciale", "deal", "accord commercial",
            "contrat de partenariat", "prestataire", "fournisseur",
            "équipementier", "marque", "mettre en avant", "visibilité",
            "co-branding", "affiliation",
        ],
    },
    {
        id: 'competition',
        label: 'Demande compétition',
        priority: 2,
        keywords: [
            "compétition", "combat", "tournoi", "championnat", "gala",
            "fight", "match", "concours", "sélection", "équipe",
            "représenter", "inter-club", "médaille", "podium",
            "ceinture", "titre", "licence compétition",
            "combattre", "passer en compétition",
        ],
    },
    {
        id: 'facture',
        label: 'Demande facture',
        priority: 2,
        keywords: [
            "facture", "reçu", "justificatif", "attestation", "quittance",
            "preuve de paiement", "document fiscal", "note de frais",
            "bordereau", "certificat de paiement", "reçu de paiement",
            "avoir une facture", "obtenir une facture",
        ],
    },
    {
        id: 'reclamation',
        label: 'Réclamation',
        priority: 4,
        keywords: [
            "réclamation", "plainte", "insatisfait", "mécontent", "déçu",
            "dysfonctionnement", "pas normal", "inadmissible", "inacceptable",
            "scandaleux", "mauvais service", "je me plains", "honte", "litige",
            "erreur de votre part", "problème grave", "comportement inadmissible",
            "je suis choqué", "exige", "je réclame", "situation inacceptable",
        ],
    },
];

const URGENCY_KEYWORDS = [
    "urgent", "urgence", "urgentissime",
    "immédiatement", "immédiat",
    "rapidement", "très rapidement", "le plus rapidement possible",
    "asap", "au plus vite", "dès que possible",
    "avant demain", "aujourd'hui", "ce soir", "ce matin",
    "prioritaire", "critique", "extrêmement urgent",
    "blessé", "blessure", "accident", "danger", "sécurité",
    "menace", "police", "juridique", "avocat",
    "mise en demeure", "procédure judiciaire", "tribunal",
    "contentieux", "huissier",
];

/** Supprime les accents et met en minuscules pour comparaison robuste */
function normalize(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['']/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Classifie un email dans l'une des 12 catégories.
 *
 * @param {string} subject  Objet de l'email
 * @param {string} body     Corps de l'email (texte brut)
 * @returns {{ category: string, label: string, confidence: number, scores: Object }}
 */
/** Vérifie la présence d'un mot-clé avec frontière de mot (évite savoir → avoir). */
function containsKeyword(text, keyword) {
    const nkw = normalize(keyword);
    if (!nkw) return false;
    if (nkw.includes(' ')) return text.includes(nkw);

    const escaped = nkw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9''])${escaped}([^a-z0-9'']|$)`).test(text);
}

function classify(subject, body) {
    // Poids double pour l'objet (plus informatif que le corps)
    const textFull  = normalize(`${subject} ${subject} ${body}`);

    const scores = {};

    for (const cat of CATEGORIES) {
        let score = 0;
        for (const kw of cat.keywords) {
            if (!containsKeyword(textFull, kw)) continue;
            const nkw = normalize(kw);
            const occurrences = textFull.split(nkw).length - 1;
            score += occurrences * cat.priority;
        }
        if (score > 0) scores[cat.id] = score;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        return {
            category:   'autre',
            label:      'Autre',
            confidence: 0,
            scores:     {},
        };
    }

    const [topId, topScore] = sorted[0];
    const topCat = CATEGORIES.find(c => c.id === topId);

    return {
        category:   topId,
        label:      topCat?.label || 'Autre',
        confidence: topScore,
        scores:     Object.fromEntries(sorted),
    };
}

/**
 * Détecte si l'email contient des signaux d'urgence.
 *
 * @param {string} subject
 * @param {string} body
 * @returns {{ urgent: boolean, keyword: string|null }}
 */
function detectUrgency(subject, body) {
    const text = normalize(`${subject} ${body}`);

    for (const kw of URGENCY_KEYWORDS) {
        if (text.includes(normalize(kw))) {
            return { urgent: true, keyword: kw };
        }
    }

    return { urgent: false, keyword: null };
}

module.exports = { classify, detectUrgency, CATEGORIES, URGENCY_KEYWORDS };
