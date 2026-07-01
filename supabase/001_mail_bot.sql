-- ─────────────────────────────────────────────────────────────
-- Boxing Center — Mail Bot
-- Migration 001 : table de suivi des emails entrants
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mail_inbox (
    id           BIGSERIAL    PRIMARY KEY,
    message_id   TEXT         UNIQUE NOT NULL,   -- En-tête Message-ID (déduplication)
    received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    from_email   TEXT         NOT NULL,
    from_name    TEXT,
    to_email     TEXT,
    subject      TEXT,
    body_preview TEXT,                           -- 500 premiers caractères du corps
    category     TEXT         NOT NULL DEFAULT 'autre',
    label        TEXT,                           -- Libellé lisible de la catégorie
    urgent       BOOLEAN      NOT NULL DEFAULT FALSE,
    auto_replied BOOLEAN      NOT NULL DEFAULT FALSE,
    forwarded_to TEXT,                           -- Email du responsable destinataire
    processed    BOOLEAN      NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error        TEXT,                           -- Message d'erreur si traitement partiel
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_mail_inbox_category
    ON mail_inbox(category);

CREATE INDEX IF NOT EXISTS idx_mail_inbox_urgent
    ON mail_inbox(urgent)
    WHERE urgent = TRUE;

CREATE INDEX IF NOT EXISTS idx_mail_inbox_unprocessed
    ON mail_inbox(processed, received_at)
    WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_mail_inbox_received
    ON mail_inbox(received_at DESC);

-- Documentation des colonnes
COMMENT ON TABLE  mail_inbox               IS 'Historique emails entrants — Boxing Center Mail Bot';
COMMENT ON COLUMN mail_inbox.message_id    IS 'En-tête Message-ID de l''email (clé de déduplication)';
COMMENT ON COLUMN mail_inbox.category      IS 'inscription | seance_essai | tarif | planning | enfant_ado | remboursement | resiliation | partenariat | competition | facture | reclamation | autre';
COMMENT ON COLUMN mail_inbox.urgent        IS 'TRUE si des mots-clés d''urgence sont détectés';
COMMENT ON COLUMN mail_inbox.auto_replied  IS 'TRUE si une réponse automatique a bien été envoyée';
COMMENT ON COLUMN mail_inbox.forwarded_to  IS 'Adresse email à qui l''email a été transmis';
COMMENT ON COLUMN mail_inbox.processed     IS 'TRUE si le traitement complet s''est déroulé sans erreur';
