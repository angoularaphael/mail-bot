'use strict';

/**
 * Routing simplifié — 2 boîtes seulement :
 *
 *   MAIL_RECEPTION   → boîte principale (tous les messages entrants)
 *   MAIL_SECRETARIAT → secrétariat (si le bot ne peut pas répondre au client)
 *
 * En production :
 *   MAIL_RECEPTION   = boxingcenter31@gmail.com
 *   MAIL_SECRETARIAT = secretariat.boxingcenter@gmail.com
 *
 * En test :
 *   MAIL_RECEPTION   = angoularaphael05@gmail.com
 *   MAIL_SECRETARIAT = linuxcam05@gmail.com
 */

function getReception() {
    return (
        process.env.MAIL_RECEPTION ||
        process.env.BREVO_REPLY_TO ||
        'boxingcenter31@gmail.com'
    ).trim();
}

function getSecretariat() {
    return (
        process.env.MAIL_SECRETARIAT ||
        'secretariat.boxingcenter@gmail.com'
    ).trim();
}

/** @deprecated Conservé pour compatibilité logs / --verify */
function routes() {
    const reception   = getReception();
    const secretariat = getSecretariat();

    return {
        reception:   { dest: reception,   label: 'Réception' },
        secretariat: { dest: secretariat, label: 'Secrétariat' },
    };
}

function getRoute() {
    return { dest: getSecretariat(), label: 'Secrétariat' };
}

module.exports = { getReception, getSecretariat, getRoute, routes };
