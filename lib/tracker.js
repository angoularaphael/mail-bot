'use strict';

/**
 * Suivi des emails entrants.
 * Priorité Supabase (table mail_inbox), fallback sur un fichier JSON local.
 */

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const LOCAL_FILE   = path.join(__dirname, '..', 'data', 'inbox.json');
const TABLE        = 'mail_inbox';

let _sb = null;

function getSupabase() {
    if (!_sb && SUPABASE_URL && SUPABASE_KEY) {
        _sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _sb;
}

// ─── Local JSON fallback ──────────────────────────────────────────────────────

function readLocal() {
    try {
        if (!fs.existsSync(LOCAL_FILE)) return [];
        return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeLocal(records) {
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(records.slice(0, 1000), null, 2), 'utf8');
}

function upsertLocal(record) {
    const all = readLocal();
    const idx = all.findIndex((r) => r.message_id === record.message_id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...record };
    } else {
        all.unshift(record);
    }
    writeLocal(all);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enregistre ou met à jour un email dans la base de suivi.
 *
 * @param {Object} emailData  Email traité avec sa classification
 */
async function saveEmail(emailData) {
    const record = {
        message_id:   emailData.messageId,
        received_at:  emailData.date
            ? new Date(emailData.date).toISOString()
            : new Date().toISOString(),
        from_email:   emailData.from?.address  || '',
        from_name:    emailData.from?.name     || null,
        to_email:     emailData.to?.address    || null,
        subject:      emailData.subject        || '(sans objet)',
        body_preview: (emailData.text || '').slice(0, 500) || null,
        category:     emailData.classification?.category || 'autre',
        label:        emailData.classification?.label    || 'Autre',
        urgent:       emailData.classification?.urgent   || false,
        auto_replied: emailData.autoReplied   || false,
        forwarded_to: emailData.forwardedTo   || null,
        processed:    emailData.processed     || false,
        processed_at: emailData.processed ? new Date().toISOString() : null,
        error:        emailData.error         || null,
    };

    const sb = getSupabase();
    if (sb) {
        try {
            const { error } = await sb
                .from(TABLE)
                .upsert(record, { onConflict: 'message_id' });
            if (!error) return record;
            console.warn(`[TRACKER] Supabase erreur: ${error.message}`);
        } catch (err) {
            console.warn(`[TRACKER] Supabase indisponible: ${err.message}`);
        }
    }

    upsertLocal(record);
    return record;
}

/**
 * Retourne les emails non traités, triés par urgence puis date.
 * Utile pour la commande --report.
 *
 * @returns {Promise<Array>}
 */
async function getUnprocessed() {
    const sb = getSupabase();
    if (sb) {
        try {
            const { data, error } = await sb
                .from(TABLE)
                .select('*')
                .eq('processed', false)
                .order('urgent',      { ascending: false })
                .order('received_at', { ascending: true  })
                .limit(200);
            if (!error) return data || [];
        } catch (err) {
            console.warn(`[TRACKER] Supabase indisponible: ${err.message}`);
        }
    }

    return readLocal().filter((r) => !r.processed);
}

/**
 * Retourne les N derniers emails (toutes catégories).
 *
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
async function getRecent(limit = 50) {
    const sb = getSupabase();
    if (sb) {
        try {
            const { data, error } = await sb
                .from(TABLE)
                .select('*')
                .order('received_at', { ascending: false })
                .limit(limit);
            if (!error) return data || [];
        } catch (err) {
            console.warn(`[TRACKER] Supabase indisponible: ${err.message}`);
        }
    }

    return readLocal().slice(0, limit);
}

/**
 * Marque un email comme traité manuellement.
 *
 * @param {string} messageId
 */
async function markProcessed(messageId) {
    const update = {
        processed:    true,
        processed_at: new Date().toISOString(),
        error:        null,
    };

    const sb = getSupabase();
    if (sb) {
        try {
            await sb.from(TABLE).update(update).eq('message_id', messageId);
        } catch {}
    }

    const all = readLocal();
    const rec = all.find((r) => r.message_id === messageId);
    if (rec) {
        Object.assign(rec, update);
        writeLocal(all);
    }
}

module.exports = { saveEmail, getUnprocessed, getRecent, markProcessed };
