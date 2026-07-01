'use strict';

/**
 * Routing des emails par catégorie.
 *
 * Pour chaque catégorie, on définit :
 *  - dest  : adresse email du responsable à qui transmettre l'email
 *            null = pas de transmission (réponse automatique suffisante)
 *  - label : intitulé du rôle (pour les logs et les emails de transfert)
 *
 * Les adresses sont lues depuis .env pour rester configurables sans toucher au code.
 */

function routes() {
    const reception  = process.env.MAIL_RECEPTION  || process.env.BREVO_REPLY_TO || 'boxingcenter31@gmail.com';
    const manager    = process.env.MAIL_MANAGER    || reception;
    const compta     = process.env.MAIL_COMPTA     || reception;
    const direction  = process.env.MAIL_DIRECTION  || reception;
    const coach      = process.env.MAIL_COACH      || reception;

    return {
        // Inscription → réception (pour suivi)
        inscription:   { dest: reception, label: 'Réception' },

        // Séance d'essai → réception (planifier le RDV)
        seance_essai:  { dest: reception, label: 'Réception' },

        // Tarif → pas de transmission (réponse auto suffisante)
        tarif:         { dest: null, label: null },

        // Planning → pas de transmission (réponse auto suffisante)
        planning:      { dest: null, label: null },

        // Enfant/ado → coach (expertise pédagogique)
        enfant_ado:    { dest: coach, label: 'Coach' },

        // Remboursement → compta (traitement financier)
        remboursement: { dest: compta, label: 'Comptabilité' },

        // Résiliation → manager (process administratif sensible)
        resiliation:   { dest: manager, label: 'Responsable' },

        // Partenariat → direction (décision stratégique)
        partenariat:   { dest: direction, label: 'Direction' },

        // Compétition → coach (suivi sportif)
        competition:   { dest: coach, label: 'Coach' },

        // Facture → compta (traitement administratif)
        facture:       { dest: compta, label: 'Comptabilité' },

        // Réclamation → manager (priorité haute)
        reclamation:   { dest: manager, label: 'Responsable' },

        // Autre → réception (traitement manuel)
        autre:         { dest: reception, label: 'Réception' },
    };
}

/**
 * Retourne la destination pour une catégorie donnée.
 * @param {string} category
 * @returns {{ dest: string|null, label: string|null }}
 */
function getRoute(category) {
    const r = routes();
    return r[category] || r.autre;
}

module.exports = { getRoute, routes };
