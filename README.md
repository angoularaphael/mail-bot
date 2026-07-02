# 📬 Boxing Center — Mail Bot

Bot de gestion automatique de la boîte mail Boxing Center.

## Fonctionnalités

- **Lecture** des emails entrants via IMAP (Gmail)
- **Classification** automatique en 12 catégories
- **Détection des urgences** par mots-clés
- **Réponses types** personnalisées par catégorie
- **Transmission** au bon responsable selon la catégorie
- **Suivi** des emails non traités (Supabase + JSON local)

## Catégories détectées

| ID | Libellé | Transmis à |
|---|---|---|
| `inscription` | Demande d'inscription | Réception |
| `seance_essai` | Demande séance d'essai | Réception |
| `tarif` | Demande tarif | _(réponse auto uniquement)_ |
| `planning` | Demande planning | _(réponse auto uniquement)_ |
| `enfant_ado` | Demande enfant / ado | Coach |
| `remboursement` | Demande remboursement | Comptabilité |
| `resiliation` | Demande résiliation | Responsable |
| `partenariat` | Demande partenariat | Direction |
| `competition` | Demande compétition | Coach |
| `facture` | Demande facture | Comptabilité |
| `reclamation` | Réclamation | Responsable |
| `autre` | Autre | Réception |

## Installation

```bash
cd mail-bot
npm install
cp .env.example .env
# Remplir les valeurs dans .env
```

## Configuration `.env`

### Gmail IMAP
1. Ouvrir Gmail → **Paramètres** → **Transfert et POP/IMAP** → Activer IMAP
2. Si la validation en 2 étapes est activée : **Compte Google** → **Sécurité** → **Mots de passe des applications** → générer un mot de passe 16 caractères
3. Renseigner dans `.env` :
   ```
   IMAP_USER=angoularaphael05@gmail.com
   IMAP_PASS=xxxx xxxx xxxx xxxx   # mot de passe d'application
   ```

### Brevo SMTP
Les clés SMTP Brevo sont déjà dans `BOXPLUS/.env` — copier les valeurs `BREVO_SMTP_*`.

### Routing
Renseigner les adresses email des responsables :
```
MAIL_RECEPTION=boxingcenter31@gmail.com
MAIL_MANAGER=manager@boxingcenter.fr
MAIL_COMPTA=compta@boxingcenter.fr
MAIL_DIRECTION=direction@boxingcenter.fr
MAIL_COACH=coach@boxingcenter.fr
```
La même adresse peut être utilisée pour plusieurs rôles.

## Utilisation

```bash
# Vérifier la configuration (IMAP + SMTP + routing)
npm run verify
# ou : node index.js --verify

# Traitement unique (one-shot)
npm start
# ou : node index.js

# Surveillance continue (polling toutes les 5 min)
npm run watch
# ou : node index.js --watch

# Simuler sans envoyer (test)
npm run dry-run
# ou : node index.js --dry-run

# Rapport des emails non traités
npm run report
# ou : node index.js --report
```

## Migration Supabase

Exécuter dans l'interface SQL Supabase :

```sql
-- Contenu de supabase/001_mail_bot.sql
```

## Architecture

```
mail-bot/
├── index.js              # Entrée principale + scheduler
├── lib/
│   ├── imap.js           # Connexion IMAP + fetch emails
│   ├── classifier.js     # Classification 12 catégories + urgence
│   ├── templates.js      # Réponses types par catégorie
│   ├── brand.js          # Génération HTML emails Boxing Center
│   ├── mailer.js         # Envoi via Brevo SMTP
│   ├── forwarder.js      # Transmission au responsable
│   └── tracker.js        # Sauvegarde Supabase + JSON local
├── config/
│   └── routing.js        # Routing catégorie → responsable
├── supabase/
│   └── 001_mail_bot.sql  # Migration base de données
├── data/                 # (créé automatiquement) — JSON fallback local
├── .env.example
└── package.json
```

## Flux de traitement

```
Email entrant (INBOX)
        │
        ▼
  Parse (mailparser)
        │
        ▼
  Classify + Urgency
        │
        ├─── Réponse auto → expéditeur (Brevo SMTP)
        │
        ├─── Transmission → responsable (selon catégorie)
        │
        ├─── Sauvegarde → Supabase / JSON local
        │
        └─── Marquer comme lu (IMAP)
```
