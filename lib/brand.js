'use strict';

/**
 * Identité visuelle Boxing Center — génération des emails HTML.
 * Adapté pour le mail-bot (standalone, sans dépendance externe).
 */

const CONTACT_EMAIL =
    (process.env.BREVO_REPLY_TO ||
     process.env.BOXING_CENTER_CONTACT_EMAIL ||
     'boxingcenter31@gmail.com').trim();

const SITE_URL =
    (process.env.BOXING_CENTER_SITE_URL || 'https://boxingcenter.fr/').replace(/\/?$/, '/');

function siteHost() {
    try { return new URL(SITE_URL).host; } catch { return 'boxingcenter.fr'; }
}

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Signature HTML Boxing Center */
function signatureHtml() {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
       style="margin-top:28px;border-collapse:collapse;">
  <tr>
    <td style="padding:18px 20px;
               background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);
               border-radius:12px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;
                font-size:17px;font-weight:700;color:#ffffff;">
        🥊 Boxing Center
      </p>
      <p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:13px;">
        <a href="${esc(SITE_URL)}" style="color:#93c5fd;text-decoration:none;">
          ${esc(siteHost())}
        </a>
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;">
        <a href="mailto:${esc(CONTACT_EMAIL)}" style="color:#e2e8f0;text-decoration:none;">
          ${esc(CONTACT_EMAIL)}
        </a>
      </p>
    </td>
  </tr>
</table>`;
}

/**
 * Construit un email HTML complet pour une réponse automatique.
 *
 * @param {{ body: string, subject?: string }} opts
 * @returns {string}  HTML complet
 */
function buildEmailHtml({ body = '', subject = '' }) {
    const lines = (body || '').split('\n').map(
        (line) => `<p style="margin:0 0 9px;font-size:15px;line-height:1.7;color:#334155;">${
            esc(line) || '&nbsp;'
        }</p>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(subject || 'Boxing Center')}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
       style="border-collapse:collapse;background:#f1f5f9;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="max-width:580px;border-collapse:collapse;background:#ffffff;
                    border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <!-- Barre de couleur -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#2563eb,#0f172a);
                     font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Corps -->
        <tr>
          <td style="padding:28px 28px 10px;">
            ${lines || '&nbsp;'}
          </td>
        </tr>
        <!-- Signature -->
        <tr>
          <td style="padding:6px 28px 26px;">
            ${signatureHtml()}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Construit un email HTML de transfert (notification au responsable).
 *
 * @param {{ fromEmail, fromName, originalSubject, originalBody, category, urgent, receivedAt }} opts
 * @returns {string}
 */
function buildForwardHtml({ fromEmail, fromName, originalSubject, originalBody, category, urgent, receivedAt }) {
    const urgentBanner = urgent
        ? `<div style="background:#dc2626;color:#fff;padding:10px 16px;border-radius:8px;
                       font-weight:700;font-size:14px;margin-bottom:14px;letter-spacing:.3px;">
             🚨 EMAIL URGENT — à traiter en priorité
           </div>`
        : '';

    const catBadge = `<span style="background:#1e3a5f;color:#fff;padding:4px 12px;
                                    border-radius:20px;font-size:12px;font-weight:700;">
                        ${esc(category)}
                      </span>`;

    const bodyLines = (originalBody || '').split('\n').map(
        (line) => `<p style="margin:0 0 6px;font-size:14px;color:#334155;line-height:1.6;">${
            esc(line) || '&nbsp;'
        }</p>`
    ).join('');

    const dateStr = receivedAt
        ? new Date(receivedAt).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
        : '—';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Transfert — ${esc(originalSubject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
       style="border-collapse:collapse;background:#f1f5f9;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="max-width:640px;border-collapse:collapse;background:#ffffff;
                    border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#2563eb,#0f172a);
                     font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:26px 28px 14px;">
            <p style="margin:0 0 14px;font-size:12px;color:#94a3b8;font-style:italic;">
              📬 Transfert automatique — Boxing Center Mail Bot
            </p>

            ${urgentBanner}

            <table role="presentation" cellpadding="0" cellspacing="0"
                   style="border-collapse:collapse;margin-bottom:16px;">
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#64748b;white-space:nowrap;
                            padding-right:10px;font-weight:600;">Catégorie :</td>
                <td style="padding:4px 0;">${catBadge}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#64748b;white-space:nowrap;
                            padding-right:10px;font-weight:600;">De :</td>
                <td style="padding:4px 0;font-size:14px;color:#0f172a;">
                  ${esc(fromName || '')}
                  &lt;<a href="mailto:${esc(fromEmail)}" style="color:#2563eb;">${esc(fromEmail)}</a>&gt;
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#64748b;white-space:nowrap;
                            padding-right:10px;font-weight:600;">Objet :</td>
                <td style="padding:4px 0;font-size:14px;color:#0f172a;">${esc(originalSubject)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#64748b;white-space:nowrap;
                            padding-right:10px;font-weight:600;">Reçu le :</td>
                <td style="padding:4px 0;font-size:14px;color:#64748b;">${esc(dateStr)}</td>
              </tr>
            </table>

            <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;">

            <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;font-weight:700;
                       text-transform:uppercase;letter-spacing:.6px;">Message original</p>
            <div style="background:#f8fafc;border-left:3px solid #2563eb;
                        padding:14px 18px;border-radius:0 10px 10px 0;">
              ${bodyLines || '<p style="font-style:italic;color:#94a3b8;font-size:13px;">Corps en HTML uniquement (non affiché)</p>'}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 28px 26px;">
            ${signatureHtml()}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Version texte brut pour les clients qui n'affichent pas le HTML */
function buildPlainText({ body = '' }) {
    return [
        body.trim(),
        '',
        '—',
        'Boxing Center',
        siteHost(),
        CONTACT_EMAIL,
    ].join('\n');
}

module.exports = { buildEmailHtml, buildForwardHtml, buildPlainText };
