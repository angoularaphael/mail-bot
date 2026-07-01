'use strict';

/**
 * Réponses types par catégorie — Boxing Center Mail Bot.
 * Chaque template est une fonction qui accepte le prénom du destinataire.
 */

const TEMPLATES = {

    inscription: {
        subject: "Re : Votre demande d'inscription — Boxing Center",
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message et l'intérêt que vous portez à Boxing Center !

Nous serions ravis de vous accueillir au sein de notre club. Voici comment procéder pour finaliser votre inscription :

📋 Documents à prévoir :
• Une pièce d'identité valide (carte nationale ou passeport)
• Une photo d'identité récente
• Un certificat médical de non contre-indication à la pratique de la boxe (de moins de 3 mois)
• Le règlement de la cotisation (CB, espèces ou virement acceptés)

📍 Vous pouvez vous inscrire directement à l'accueil du club aux horaires d'ouverture, ou nous contacter pour prendre rendez-vous.

N'hésitez pas à revenir vers nous si vous avez des questions. Nous vous souhaitons la bienvenue chez Boxing Center !

À très bientôt,`,
    },

    seance_essai: {
        subject: "Re : Votre demande de séance d'essai — Boxing Center",
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message ! Nous sommes ravis de votre intérêt pour Boxing Center.

Bonne nouvelle : nous proposons des séances d'essai gratuites et sans engagement pour vous permettre de découvrir notre club et notre ambiance.

🥊 Ce qu'il faut savoir :
• La séance d'essai est entièrement gratuite
• Durée : environ 1 heure
• Matériel disponible sur place (gants et protège-dents fournis)
• Tenue : vêtements de sport confortables

📅 Pour réserver votre séance, merci de nous préciser :
• Vos disponibilités (jours et horaires préférés)
• Votre niveau actuel (débutant, intermédiaire, confirmé)

Nous vous recontacterons rapidement pour confirmer le rendez-vous.

À très bientôt sur le ring !`,
    },

    tarif: {
        subject: 'Re : Informations tarifs — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message !

Voici un aperçu de nos formules d'abonnement :

💳 NOS FORMULES :
• Cours découverte / séance d'essai → Gratuit
• Abonnement mensuel (sans engagement) → tarif à nous demander
• Abonnement trimestriel → tarif préférentiel
• Abonnement annuel → meilleur rapport qualité-prix
• Tarif étudiant / demandeur d'emploi → réduction sur justificatif
• Tarif famille / couple → offres groupées disponibles

Pour connaître les tarifs exacts et les promotions en cours, n'hésitez pas à :
• Nous contacter directement par téléphone
• Passer à l'accueil du club

Nous serons heureux de vous accueillir et de vous présenter toutes nos offres en détail.

À bientôt !`,
    },

    planning: {
        subject: 'Re : Planning des cours — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message !

Voici les informations sur notre organisation des cours :

🗓️ NOS COURS :
• Boxe anglaise — tous niveaux (débutants, intermédiaires, confirmés)
• Cours fitness boxe / cardio-boxing
• Cours enfants et adolescents
• Entraînements spécifiques compétition
• Cours particuliers sur rendez-vous

📍 Nos cours se déroulent du lundi au samedi. Les créneaux couvrent les matinées, après-midis et soirées pour s'adapter à tous les emplois du temps.

Pour consulter le planning complet et à jour, contactez-nous directement ou rendez-vous à l'accueil du club. Les horaires peuvent être ajustés selon les périodes (vacances scolaires, compétitions…).

Nous restons disponibles pour toute question !

À bientôt,`,
    },

    enfant_ado: {
        subject: 'Re : Cours enfants et adolescents — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message ! Nous sommes ravis de votre intérêt pour nos cours jeunes.

La boxe est un sport excellent pour développer la confiance en soi, la discipline, la coordination et le respect — des valeurs que nous cultivons particulièrement pour nos jeunes adhérents.

👦👧 NOS COURS JEUNES :
• Mini-boxeurs (6–9 ans) : initiation ludique et éducative
• Enfants (10–12 ans) : technique de base, coordination, esprit d'équipe
• Adolescents (13–17 ans) : boxe anglaise, préparation possible à la compétition

🛡️ Encadrement et sécurité :
• Coaches diplômés d'État, expérimentés avec le jeune public
• Matériel adapté et homologué (gants, protège-dents, casques)
• Groupes par tranches d'âge et niveau
• Ambiance bienveillante, zéro tolérance pour l'intimidation

📋 Pour l'inscription d'un mineur :
• Certificat médical de non contre-indication à la boxe
• Autorisation parentale signée
• Pièce d'identité du responsable légal

Notre responsable technique vous recontactera prochainement pour vous présenter les créneaux disponibles.

À très bientôt !`,
    },

    remboursement: {
        subject: 'Re : Votre demande de remboursement — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message. Nous prenons bonne note de votre demande de remboursement et nous allons l'étudier dans les meilleurs délais.

📋 Afin de traiter votre dossier rapidement, merci de nous fournir les informations suivantes (si ce n'est pas déjà fait) :
• Vos nom et prénom complets
• Votre numéro d'adhérent (si vous le connaissez)
• La date et le montant du prélèvement concerné
• L'objet précis de la demande (prélèvement en double, erreur, résiliation antérieure…)
• Vos coordonnées bancaires (IBAN) si un remboursement est validé

⏱️ Délai de traitement : 5 à 10 jours ouvrés.

Notre équipe administrative reviendra vers vous dès que votre dossier aura été étudié. Nous mettons tout en œuvre pour résoudre cette situation rapidement.

Merci pour votre patience.`,
    },

    resiliation: {
        subject: 'Re : Votre demande de résiliation — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message. Nous prenons acte de votre souhait de résiliation et nous en sommes sincèrement désolés.

📋 Procédure de résiliation :

1. La demande doit être formulée par écrit (email ou courrier recommandé avec accusé de réception)
2. Un préavis de 30 jours est à respecter à compter de la date de réception de votre demande écrite
3. Les mensualités déjà prélevées ne sont pas remboursables, sauf situation particulière

📌 Pour finaliser votre dossier, merci de confirmer :
• Vos nom et prénom complets
• Votre numéro d'adhérent
• La date d'effet souhaitée
• Le motif (facultatif — nous aide à améliorer nos services)

Votre demande a bien été transmise à notre équipe administrative, qui vous confirmera la prise en compte sous 48 heures ouvrées.

Nous espérons vous revoir un jour chez Boxing Center. Merci pour votre fidélité.`,
    },

    partenariat: {
        subject: 'Re : Votre proposition de partenariat — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message et l'intérêt que vous portez à Boxing Center !

Nous avons bien reçu votre proposition de partenariat. Votre demande va être transmise à notre direction pour étude approfondie.

📬 Vous recevrez une réponse dans un délai de 5 à 7 jours ouvrés.

Pour accélérer le traitement de votre dossier, n'hésitez pas à joindre à votre réponse :
• Une présentation de votre structure / marque / projet
• La nature et les modalités du partenariat envisagé
• Les bénéfices mutuels attendus
• Vos coordonnées complètes (téléphone, site web)

Nous étudions chaque proposition avec sérieux et ouverture d'esprit.

Merci encore pour votre démarche, et à bientôt !`,
    },

    competition: {
        subject: 'Re : Votre demande compétition — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message ! Nous sommes heureux de votre intérêt pour la compétition.

Boxing Center forme et accompagne des boxeurs vers la compétition à tous les niveaux. Voici comment ça fonctionne :

🏆 PARCOURS COMPÉTITIF :

Prérequis :
• Licence compétition FFBoxe (Fédération Française de Boxe) — nous vous accompagnons dans les démarches
• Visite médicale sportive avec électrocardiogramme
• Niveau technique évalué par nos coaches

Nos compétitions :
• Tournois inter-clubs régionaux
• Championnats départementaux et régionaux Occitanie
• Galas de boxe organisés par le club
• Championnats de France (pour les meilleurs éléments)

📋 Prochaine étape :
Notre responsable technique va vous contacter pour :
• Évaluer votre niveau actuel
• Fixer un objectif compétitif réaliste
• Établir un programme d'entraînement spécifique

À très bientôt sur le ring !`,
    },

    facture: {
        subject: 'Re : Votre demande de justificatif — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message. Nous prenons bonne note de votre demande de justificatif de paiement.

📋 Pour établir votre document dans les meilleurs délais, merci de nous préciser :
• Vos nom et prénom complets
• Votre numéro d'adhérent (si vous le connaissez)
• La période concernée (mois, trimestre ou année)
• Le type de document souhaité :
  - Facture acquittée
  - Reçu de paiement
  - Attestation de cotisation
  - Autre (précisez)
• L'adresse email sur laquelle recevoir le document

⏱️ Délai de traitement : 2 à 3 jours ouvrés.

Notre service administratif vous fera parvenir le document demandé par email.

Merci pour votre patience.`,
    },

    reclamation: {
        subject: 'Re : Votre réclamation — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message.

Nous avons bien pris connaissance de votre réclamation et nous vous prions de nous excuser pour la situation que vous avez vécue.

Votre satisfaction est notre priorité absolue. Chaque retour compte pour nous et nous permet de nous améliorer.

📋 Ce que nous faisons :
Votre dossier a été transmis en priorité à notre responsable, qui vous contactera personnellement dans les 24 à 48 heures ouvrées pour :
• Comprendre précisément la situation
• Vous apporter une réponse claire et personnalisée
• Trouver la solution la plus adaptée

Si votre situation est urgente, n'hésitez pas à nous appeler directement.

Encore toutes nos excuses pour la gêne occasionnée. Nous ferons tout notre possible pour résoudre cette situation rapidement et à votre satisfaction.`,
    },

    autre: {
        subject: 'Re : Votre message — Boxing Center',
        body: (prenom) => `${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}

Merci pour votre message.

Nous l'avons bien reçu et un membre de notre équipe vous répondra personnellement dans les meilleurs délais (généralement sous 24 à 48 heures ouvrées).

Si votre demande est urgente, n'hésitez pas à nous contacter directement par téléphone.

À bientôt,`,
    },
};

/**
 * Renvoie le template pour une catégorie donnée.
 * Retourne le template "autre" si la catégorie est inconnue.
 *
 * @param {string} category  Identifiant de catégorie
 * @param {string} [senderName]  Nom complet de l'expéditeur
 * @returns {{ subject: string, body: string }}
 */
function renderTemplate(category, senderName = '') {
    const tpl   = TEMPLATES[category] || TEMPLATES.autre;
    const parts = (senderName || '').trim().split(/\s+/);
    // On utilise le prénom (premier mot), mais jamais une adresse email
    const prenom = parts[0]?.includes('@') ? '' : (parts[0] || '');

    return {
        subject: tpl.subject,
        body:    tpl.body(prenom),
    };
}

module.exports = { renderTemplate, TEMPLATES };
