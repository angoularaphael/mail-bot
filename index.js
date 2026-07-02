'use strict';

/**
 * Boxing Center — Mail Bot
 * ═══════════════════════════════════════════════════════════
 *  node index.js              → traitement unique (single run)
 *  node index.js --watch      → surveillance continue (polling)
 *  node index.js --report     → rapport des emails non traités
 *  node index.js --dry-run    → simulation sans envoi
 *  node index.js --verify     → test connexion IMAP + SMTP
 * ═══════════════════════════════════════════════════════════
 */

require('dotenv').config();

const { fetchUnseenEmails, markAsSeen } = require('./lib/imap');
const { classify, detectUrgency }       = require('./lib/classifier');
const { renderTemplate }                = require('./lib/templates');
const { buildEmailHtml, buildPlainText } = require('./lib/brand');
const { sendEmail, isConfigured: isSmtpReady, verify: verifySmtp } = require('./lib/mailer');
const { forwardEmail }                  = require('./lib/forwarder');
const { saveEmail, getUnprocessed, getRecent } = require('./lib/tracker');
const { isConfigured: isImapReady }     = require('./lib/imap');

// ─── Configuration ────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));

const DRY_RUN   = args.has('--dry-run')  || process.env.BOT_DRY_RUN === 'true';
const WATCH     = args.has('--watch')    || process.env.WATCH_MODE  === 'true';
const REPORT    = args.has('--report');
const VERIFY    = args.has('--verify');
const POLL_MS   = parseInt(process.env.POLL_INTERVAL_MS  || '300000', 10);
const MAX_MAILS = parseInt(process.env.MAX_EMAILS_PER_RUN || '50',    10);

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function now() {
    return new Date().toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    });
}

function log(msg)  { console.log(`[${now()}] ${msg}`); }
function warn(msg) { console.warn(`[${now()}] ⚠️  ${msg}`); }
function err(msg)  { console.error(`[${now()}] ❌ ${msg}`); }

function divider() { log('─'.repeat(58)); }

// ─── Traitement d'un email ────────────────────────────────────────────────────

async function processEmail(email) {
    const { category, label, confidence } = classify(email.subject, email.text);
    const { urgent, keyword: urgKw }      = detectUrgency(email.subject, email.text);

    const classification = { category, label, confidence, urgent };

    const urgTag = urgent ? ' 🚨 URGENT' : '';
    log(`  📧 [${label}]${urgTag}  score:${confidence}  de: ${email.from.address}`);
    log(`     Objet: ${email.subject}`);

    let autoReplied = false;
    let forwardedTo = null;
    let errorMsg    = null;

    if (DRY_RUN) {
        const tpl = renderTemplate(category, email.from.name);
        log(`  🔍 [DRY-RUN] Réponse type: "${tpl.subject}"`);
        if (urgent) log(`  🔍 [DRY-RUN] Urgence détectée: "${urgKw}"`);

        await saveEmail({
            ...email,
            classification,
            autoReplied: false,
            forwardedTo: null,
            processed:   false,
            error:       null,
        });

        return { autoReplied: false, forwardedTo: null, error: null };
    }

    if (!isSmtpReady()) {
        warn('SMTP non configuré — aucune réponse auto ni transmission envoyée.');
        await saveEmail({
            ...email,
            classification,
            autoReplied: false,
            forwardedTo: null,
            processed:   false,
            error:       'smtp_not_configured',
        });
        return { autoReplied: false, forwardedTo: null, error: 'smtp_not_configured' };
    }

    // 1. Réponse automatique à l'expéditeur
    try {
        const tpl  = renderTemplate(category, email.from.name);
        const html = buildEmailHtml({ body: tpl.body, subject: tpl.subject });
        const text = buildPlainText({ body: tpl.body });

        await sendEmail({
            to:      email.from.address,
            subject: tpl.subject,
            html,
            text,
        });

        autoReplied = true;
        log(`  ✅ Réponse auto envoyée → ${email.from.address}`);
    } catch (e) {
        errorMsg = `reply:${e.message}`;
        warn(`Erreur réponse auto: ${e.message}`);
    }

    // 2. Transmission au responsable
    try {
        forwardedTo = await forwardEmail(email, classification);
        if (forwardedTo) {
            log(`  📤 Transmis → ${forwardedTo}`);
        }
    } catch (e) {
        const fe = `forward:${e.message}`;
        errorMsg  = errorMsg ? `${errorMsg}; ${fe}` : fe;
        warn(`Erreur transmission: ${e.message}`);
    }

    const processed = autoReplied && !errorMsg;

    // 3. Sauvegarde
    await saveEmail({
        ...email,
        classification,
        autoReplied,
        forwardedTo,
        processed,
        error: errorMsg,
    });

    return { autoReplied, forwardedTo, error: errorMsg };
}

// ─── Cycle principal ──────────────────────────────────────────────────────────

async function run() {
    divider();
    log(`🥊 Boxing Center Mail Bot — début du cycle`);
    if (DRY_RUN) log('⚠️  Mode DRY-RUN : aucun email envoyé');

    // Récupération
    let emails;
    try {
        const result = await fetchUnseenEmails(MAX_MAILS);
        emails = result.emails;
        log(`📬 ${emails.length} email(s) non lu(s) détecté(s)`);
    } catch (e) {
        err(`Connexion IMAP impossible: ${e.message}`);
        return { replied: 0, forwarded: 0, errors: 1 };
    }

    if (emails.length === 0) {
        log('📭 Boîte vide — rien à traiter.');
        return { replied: 0, forwarded: 0, errors: 0 };
    }

    let replied = 0, forwarded = 0, errors = 0;
    const seenUids = [];

    for (const email of emails) {
        try {
            const res = await processEmail(email);
            if (res.autoReplied) replied++;
            if (res.forwardedTo) forwarded++;
            if (res.error)       errors++;
            seenUids.push(email.uid);
        } catch (e) {
            err(`Traitement ${email.messageId}: ${e.message}`);
            errors++;
        }
    }

    // Marquer comme lus
    if (seenUids.length > 0 && !DRY_RUN) {
        try {
            await markAsSeen(seenUids);
            log(`📌 ${seenUids.length} email(s) marqué(s) comme lus`);
        } catch (e) {
            warn(`Impossible de marquer comme lus: ${e.message}`);
        }
    }

    log(`📊 Résumé → Réponses: ${replied} | Transmis: ${forwarded} | Erreurs: ${errors}`);
    return { replied, forwarded, errors };
}

// ─── Rapport ──────────────────────────────────────────────────────────────────

async function report() {
    divider();
    log('📋 Rapport — emails non traités');

    const items = await getUnprocessed();

    if (items.length === 0) {
        log('✅ Aucun email en attente.');
        return;
    }

    log(`\n⚠️  ${items.length} email(s) non traité(s) :\n`);

    for (const e of items) {
        const urgTag = e.urgent ? ' 🚨' : '';
        const date   = new Date(e.received_at).toLocaleString('fr-FR');
        console.log(`  • [${e.label || e.category}]${urgTag}`);
        console.log(`    De    : ${e.from_email}`);
        console.log(`    Objet : ${e.subject}`);
        console.log(`    Reçu  : ${date}`);
        if (e.error) console.log(`    Erreur: ${e.error}`);
        console.log();
    }
}

// ─── Vérification des connexions ──────────────────────────────────────────────

async function verify() {
    divider();
    log('🔧 Vérification des connexions...\n');

    // IMAP
    if (!isImapReady()) {
        warn('IMAP : IMAP_USER ou IMAP_PASS manquant dans .env');
    } else {
        log(`✅ IMAP configuré → ${process.env.IMAP_USER}@${process.env.IMAP_HOST || 'imap.gmail.com'}`);
    }

    // SMTP
    log('   Test SMTP Brevo...');
    const smtpResult = await verifySmtp();
    if (smtpResult.ok) {
        log(`✅ SMTP OK → ${process.env.BREVO_SMTP_LOGIN}@${process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'}`);
    } else {
        warn(`SMTP : ${smtpResult.error}`);
    }

    // Routing
    log('\n📮 Routing actuel :');
    const { routes } = require('./config/routing');
    for (const [cat, route] of Object.entries(routes())) {
        const dest = route.dest || '(réponse auto uniquement)';
        console.log(`   ${cat.padEnd(16)} → ${dest}`);
    }
}

// ─── Serveur HTTP (health check pour bot-hosting) ────────────────────────────

function startHttpServer() {
    const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '0', 10);
    if (!PORT) return;

    const http = require('http');
    const startedAt = new Date().toISOString();
    let lastRun = null;
    let totalReplied = 0;
    let totalCycles = 0;

    global._mailBotStats = {
        recordRun: (r) => {
            lastRun = new Date().toISOString();
            totalReplied += r.replied || 0;
            totalCycles++;
        },
    };

    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            service:      'mail-bot',
            status:       'running',
            startedAt,
            lastRun,
            totalCycles,
            totalReplied,
            pollIntervalMin: Math.round(POLL_MS / 60000),
            dryRun: DRY_RUN,
        }, null, 2));
    });

    server.listen(PORT, () => {
        log(`🌐 Health check → http://0.0.0.0:${PORT}/`);
    });
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

async function startWatcher() {
    log(`🔄 Mode surveillance — vérification toutes les ${Math.round(POLL_MS / 60000)} min`);
    log(`   Appuyez sur Ctrl+C pour arrêter.\n`);

    startHttpServer();

    const doRun = async () => {
        try {
            const r = await run();
            global._mailBotStats?.recordRun(r);
        } catch (e) {
            err(`Erreur cycle: ${e.message}`);
        }
    };

    await doRun();
    setInterval(doRun, POLL_MS);
}

// ─── Entrée principale ────────────────────────────────────────────────────────

(async () => {
    try {
        if (VERIFY)  { await verify();       return; }
        if (REPORT)  { await report();       return; }
        if (WATCH)   { await startWatcher(); return; }
        await run();
    } catch (e) {
        err(`Erreur fatale: ${e.message}`);
        if (process.env.DEBUG) console.error(e);
        process.exit(1);
    }
})();
