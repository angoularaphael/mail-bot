'use strict';

/**
 * Envoie des emails de test vers la boîte surveillée.
 * Usage : node scripts/send-tests.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', 'env.bothosting') });

const axios = require('axios');

const API_KEY = process.env.BREVO_API_KEY;
const TO      = process.env.IMAP_USER || 'angoularaphael05@gmail.com';
const FROM    = process.env.BREVO_SENDER_EMAIL || 'suzinabot@gmail.com';
const NAME    = process.env.BREVO_SENDER_NAME || 'Boxing Center';

const TESTS = [
    {
        id: '01',
        category: 'inscription',
        forwardTo: 'angoularaphael05@gmail.com (Réception)',
        subject: '[TEST-01] Demande inscription Boxing Center',
        body: 'Bonjour,\n\nJe souhaite m\'inscrire au Boxing Center. Pouvez-vous me dire comment faire pour rejoindre le club ?\n\nMerci,\nMarie Test',
    },
    {
        id: '02',
        category: 'seance_essai',
        forwardTo: 'angoularaphael05@gmail.com (Réception)',
        subject: '[TEST-02] Séance d\'essai Boxing Center',
        body: 'Bonjour,\n\nJe voudrais venir essayer une séance d\'essai gratuite au Boxing Center avant de m\'inscrire.\n\nCordialement,\nPaul Test',
    },
    {
        id: '03',
        category: 'tarif',
        forwardTo: '(réponse auto uniquement)',
        subject: '[TEST-03] Tarifs abonnement Boxing Center',
        body: 'Bonjour,\n\nQuels sont vos tarifs et formules d\'abonnement mensuel au Boxing Center ?\n\nMerci,\nLuc Test',
    },
    {
        id: '04',
        category: 'planning',
        forwardTo: '(réponse auto uniquement)',
        subject: '[TEST-04] Planning des cours Boxing Center',
        body: 'Bonjour,\n\nPouvez-vous m\'envoyer le planning et les horaires des cours de boxe au Boxing Center ?\n\nMerci,\nSophie Test',
    },
    {
        id: '05',
        category: 'enfant_ado',
        forwardTo: 'konizakoniza3@gmail.com (Coach)',
        subject: '[TEST-05] Cours boxe enfant Boxing Center',
        body: 'Bonjour,\n\nMon fils a 10 ans et souhaite faire de la boxe. Avez-vous des cours enfants au Boxing Center ?\n\nMerci,\nNadia Test',
    },
    {
        id: '06',
        category: 'remboursement',
        forwardTo: 'farenogif05@gmail.com (Compta)',
        subject: '[TEST-06] Demande remboursement Boxing Center',
        body: 'Bonjour,\n\nJe demande un remboursement de ma cotisation au Boxing Center, prélèvement en double ce mois-ci.\n\nMerci,\nKarim Test',
    },
    {
        id: '07',
        category: 'resiliation',
        forwardTo: 'linuxcam05@gmail.com (Manager)',
        subject: '[TEST-07] Résiliation abonnement Boxing Center',
        body: 'Bonjour,\n\nJe souhaite résilier mon abonnement au Boxing Center. Merci de me confirmer la procédure.\n\nCordialement,\nJulie Test',
    },
    {
        id: '08',
        category: 'partenariat',
        forwardTo: 'giffareno05@gmail.com (Direction)',
        subject: '[TEST-08] Proposition partenariat Boxing Center',
        body: 'Bonjour,\n\nJe vous contacte pour une proposition de partenariat commercial avec le Boxing Center.\n\nBien cordialement,\nThomas Test',
    },
    {
        id: '09',
        category: 'competition',
        forwardTo: 'konizakoniza3@gmail.com (Coach)',
        subject: '[TEST-09] Compétition boxe Boxing Center',
        body: 'Bonjour,\n\nJe souhaite passer en compétition avec le Boxing Center. Quelle est la procédure pour les combats ?\n\nMerci,\nAlex Test',
    },
    {
        id: '10',
        category: 'facture',
        forwardTo: 'farenogif05@gmail.com (Compta)',
        subject: '[TEST-10] Demande facture Boxing Center',
        body: 'Bonjour,\n\nPourriez-vous m\'envoyer une facture acquittée de ma cotisation au Boxing Center ?\n\nMerci,\nEmma Test',
    },
    {
        id: '11',
        category: 'reclamation',
        forwardTo: 'linuxcam05@gmail.com (Manager)',
        subject: '[TEST-11] Réclamation Boxing Center',
        body: 'Bonjour,\n\nJe suis mécontent du service au Boxing Center et je souhaite déposer une réclamation.\n\nCordialement,\nMarc Test',
    },
];

async function sendOne(test) {
    await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
            sender:      { name: `Test Client ${test.id}`, email: FROM },
            to:          [{ email: TO, name: 'Boîte surveillée' }],
            replyTo:     { email: TO, name: 'Boîte surveillée' },
            subject:     test.subject,
            textContent: test.body,
            htmlContent: `<p>${test.body.replace(/\n/g, '<br>')}</p>`,
            headers:     { 'X-Mailin-custom': `mail-bot-test-${test.id}` },
        },
        {
            headers: {
                'api-key':      API_KEY,
                'Content-Type': 'application/json',
                Accept:         'application/json',
            },
            timeout: 30000,
        }
    );
}

async function main() {
    if (!API_KEY?.startsWith('xkeysib-')) {
        console.error('BREVO_API_KEY manquant dans env.bothosting');
        process.exit(1);
    }

    console.log(`\n📬 Envoi de ${TESTS.length} emails de test → ${TO}\n`);
    console.log('Attendez le prochain cycle du bot (max 5 min) ou redémarrez-le.\n');

    for (const test of TESTS) {
        try {
            await sendOne(test);
            console.log(`✅ TEST-${test.id} envoyé — ${test.category} → ${test.forwardTo}`);
            await new Promise((r) => setTimeout(r, 2000));
        } catch (err) {
            console.error(`❌ TEST-${test.id} échec:`, err.response?.data?.message || err.message);
        }
    }

    console.log('\n── Vérifiez ──────────────────────────────────────────');
    console.log('1. Logs du bot sur bot-hosting');
    console.log('2. Boîtes mail des responsables (transmissions)');
    console.log('3. Réponses auto sur suzinabot@gmail.com (expéditeur Brevo)\n');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
