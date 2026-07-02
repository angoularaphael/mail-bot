'use strict';

/**
 * Boxing Center — Mail Bot Bootstrap
 * ════════════════════════════════════════════════════════════════
 * Ce fichier est déposé en tant que  index.js  à la racine
 * du container bot-hosting (/home/container/index.js).
 *
 * Au démarrage il :
 *   1. Lit le .env racine (/home/container/.env)
 *   2. Clone ou met à jour le repo GitHub
 *   3. Copie le .env dans le dossier de l'app
 *   4. Installe les dépendances
 *   5. Lance le bot en mode surveillance (--watch)
 * ════════════════════════════════════════════════════════════════
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const GITHUB_REPO   = 'https://github.com/angoularaphael/mail-bot.git';
const APP_DIR_NAME  = 'mail-bot-app';
const APP_DIR       = path.join(__dirname, APP_DIR_NAME);
const ROOT_ENV_PATH = path.join(__dirname, '.env');

// ─── 1. Lire le .env racine ───────────────────────────────────────────────────

function loadRootEnv() {
    if (!fs.existsSync(ROOT_ENV_PATH)) return;
    for (const line of fs.readFileSync(ROOT_ENV_PATH, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq < 1) continue;
        const key = t.slice(0, eq).trim();
        let   val = t.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
    }
}

loadRootEnv();

// ─── 2. Vérifier le port ──────────────────────────────────────────────────────

const PORT = String(process.env.SERVER_PORT || process.env.PORT || '').trim();
if (!PORT || !/^\d+$/.test(PORT)) {
    console.error('❌  SERVER_PORT manquant dans /home/container/.env — ajoutez votre port bot-hosting.');
    process.exit(1);
}

console.log('════════════════════════════════════════════════');
console.log('  📬 BOXING CENTER — MAIL BOT  (bootstrap)');
console.log(`  Port : ${PORT}`);
console.log('════════════════════════════════════════════════\n');

// Afficher l'IP publique du container
try {
    require('https').get('https://api.ipify.org', (r) => {
        let d = '';
        r.on('data', (c) => { d += c; });
        r.on('end',  () => {
            console.log(`🌍 IP container : http://${d.trim()}:${PORT}/`);
            const host = process.env.BOT_PUBLIC_HOST;
            if (host) console.log(`🌍 URL publique : http://${host}:${PORT}/`);
        });
    }).on('error', () => {});
} catch {}

// ─── 3. Clone / pull du repo ──────────────────────────────────────────────────

function run(cmd, cwd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: cwd || __dirname, stdio: 'inherit' });
}

if (!fs.existsSync(APP_DIR)) {
    console.log('\n📥 Clonage du repo...');
    run(`git clone ${GITHUB_REPO} ${APP_DIR_NAME}`);
} else {
    console.log('\n🔄 Mise à jour du repo...');
    try { run('git pull', APP_DIR); } catch (e) { console.warn('git pull échoué (ignoré) :', e.message); }
}

// ─── 4. Copier le .env dans l'app ────────────────────────────────────────────

const APP_ENV = path.join(APP_DIR, '.env');

if (fs.existsSync(ROOT_ENV_PATH)) {
    fs.copyFileSync(ROOT_ENV_PATH, APP_ENV);
    console.log('✅ .env copié vers l\'app');
} else {
    // Génère un .env minimal depuis les variables d'environnement du panneau
    const ENV_KEYS = [
        'PORT', 'SERVER_PORT',
        'IMAP_HOST', 'IMAP_PORT', 'IMAP_TLS', 'IMAP_USER', 'IMAP_PASS',
        'BREVO_API_KEY', 'BREVO_SMTP_HOST', 'BREVO_SMTP_PORT', 'BREVO_SMTP_LOGIN', 'BREVO_SMTP_KEY',
        'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME', 'BREVO_REPLY_TO',
        'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
        'MAIL_RECEPTION', 'MAIL_SECRETARIAT',
        'POLL_INTERVAL_MS', 'MAX_EMAILS_PER_RUN', 'BOT_DRY_RUN', 'MIN_CONFIDENCE', 'IMAP_SINCE_DAYS', 'IMAP_RECENT_READ_HOURS',
        'WATCH_MODE',
        'BOXING_CENTER_SITE_URL', 'BOXING_CENTER_CONTACT_EMAIL',
        'BOT_PUBLIC_HOST',
        'USE_AI_REPLY', 'GROQ_API_KEY', 'GROQ_API_KEY_2', 'GROQ_MODEL',
    ];
    const lines = ['# Auto-généré par bootstrap.js'];
    for (const k of ENV_KEYS) {
        const v = process.env[k];
        if (v) lines.push(/[\s#]/.test(v) ? `${k}="${v.replace(/"/g, '\\"')}"` : `${k}=${v}`);
    }
    fs.writeFileSync(APP_ENV, lines.join('\n') + '\n', 'utf8');
    console.log('✅ .env généré depuis les variables du panneau');
}

// ─── 5. npm install ───────────────────────────────────────────────────────────

console.log('\n📦 Installation des dépendances...');
run('npm install --omit=dev', APP_DIR);

// ─── 6. Lancer le bot ────────────────────────────────────────────────────────

console.log('\n🚀 Démarrage Mail Bot (mode surveillance)...\n');
process.env.WATCH_MODE = 'true';   // active --watch dans index.js
process.chdir(APP_DIR);
require(path.join(APP_DIR, 'index.js'));
