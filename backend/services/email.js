// Email service con triple fallback:
//   1) Resend (si RESEND_API_KEY) — recomendado, free 100 mails/dia
//   2) SMTP (si SMTP_HOST + SMTP_USER + SMTP_PASS) — Gmail, Brevo, etc.
//   3) console.log (modo dev) — solo loggea el mail, no manda nada
//
// Uso: const { sendEmail } = require('./services/email');
//      await sendEmail({ to, subject, html, text });

const FROM = process.env.EMAIL_FROM || 'Campus Norma <noreply@campusnorma.com>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || null;

let mode = 'console';
let resendClient = null;
let nodemailerTransport = null;

if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
    mode = 'resend';
  } catch (e) {
    console.warn('⚠️  RESEND_API_KEY definido pero `resend` no instalado. npm i resend');
  }
} else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    const nodemailer = require('nodemailer');
    nodemailerTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    mode = 'smtp';
  } catch (e) {
    console.warn('⚠️  SMTP definido pero `nodemailer` no instalado. npm i nodemailer');
  }
}

console.log(`📧 Email service: ${mode === 'console' ? 'console (modo dev, no envia mails reales)' : mode}`);

async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject || (!html && !text)) {
    throw new Error('to, subject y (html|text) son requeridos');
  }

  const payload = {
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
  };

  if (mode === 'resend' && resendClient) {
    try {
      const { data, error } = await resendClient.emails.send(payload);
      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, id: data?.id, mode: 'resend' };
    } catch (err) {
      console.error('Resend exception:', err);
      return { success: false, error: err.message };
    }
  }

  if (mode === 'smtp' && nodemailerTransport) {
    try {
      const info = await nodemailerTransport.sendMail(payload);
      return { success: true, id: info.messageId, mode: 'smtp' };
    } catch (err) {
      console.error('SMTP error:', err);
      return { success: false, error: err.message };
    }
  }

  // Modo dev: solo loggea
  console.log('\n📧 ─── EMAIL (modo console, no se envia) ───');
  console.log(`   To:      ${payload.to.join(', ')}`);
  console.log(`   From:    ${payload.from}`);
  console.log(`   Subject: ${payload.subject}`);
  if (text) console.log(`   Text:    ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`);
  console.log('───────────────────────────────────────────\n');
  return { success: true, mode: 'console' };
}

// Helpers de templates
function emailLayout(title, body) {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, system-ui, Segoe UI, Roboto, Arial, sans-serif; background: #f3f4f6; padding: 24px; margin: 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <tr><td style="background: #2563eb; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">🎓 Campus Norma</h1>
    </td></tr>
    <tr><td style="padding: 32px 24px; color: #374151; line-height: 1.6;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #111827;">${title}</h2>
      ${body}
    </td></tr>
    <tr><td style="background: #f9fafb; padding: 16px 24px; text-align: center; color: #6b7280; font-size: 12px;">
      Campus Norma · Si no esperabas este email, podés ignorarlo.
    </td></tr>
  </table>
</body></html>`;
}

async function sendPasswordResetEmail({ to, name, resetLink }) {
  const html = emailLayout(
    'Recuperar tu contraseña',
    `<p>Hola ${name || ''},</p>
     <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta. Click en el botón para crear una nueva:</p>
     <p style="text-align: center; margin: 28px 0;">
       <a href="${resetLink}" style="background: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Crear nueva contraseña</a>
     </p>
     <p style="font-size: 13px; color: #6b7280;">El link expira en 1 hora. Si vos no solicitaste el cambio, podés ignorar este email.</p>
     <p style="font-size: 13px; color: #6b7280;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br><span style="word-break: break-all; color: #2563eb;">${resetLink}</span></p>`
  );
  const text = `Recuperar contraseña\n\nHola ${name || ''},\n\nLink para crear nueva contraseña: ${resetLink}\n\nExpira en 1 hora.`;
  return sendEmail({ to, subject: 'Recuperar contraseña — Campus Norma', html, text });
}

async function sendEnrollmentEmail({ to, name, courseName, courseUrl }) {
  const html = emailLayout(
    `¡Te inscribiste a "${courseName}"!`,
    `<p>Hola ${name || ''},</p>
     <p>Confirmamos tu inscripción al curso <strong>${courseName}</strong>. Ya podés acceder a todo el contenido:</p>
     <p style="text-align: center; margin: 28px 0;">
       <a href="${courseUrl}" style="background: #16a34a; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Ir al curso</a>
     </p>
     <p>Cualquier duda con el material, escribile al profesor desde dentro del curso.</p>`
  );
  const text = `Te inscribiste a "${courseName}".\n\nIr al curso: ${courseUrl}`;
  return sendEmail({ to, subject: `Te inscribiste a ${courseName}`, html, text });
}

async function sendLiveClassEmail({ to, name, courseName, classTitle, scheduledAt, meetingUrl }) {
  const dateStr = new Date(scheduledAt).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
  const html = emailLayout(
    '🔴 Nueva clase en vivo programada',
    `<p>Hola ${name || ''},</p>
     <p>Tu profesor programó una clase en vivo en <strong>${courseName}</strong>:</p>
     <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 6px;">
       <p style="margin: 0; font-weight: 600; color: #991b1b;">${classTitle}</p>
       <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 14px;">${dateStr}</p>
     </div>
     <p style="text-align: center; margin: 28px 0;">
       <a href="${meetingUrl}" style="background: #ef4444; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Entrar a la sala</a>
     </p>
     <p style="font-size: 13px; color: #6b7280;">Sin instalación. Funciona desde el navegador.</p>`
  );
  const text = `Clase en vivo: ${classTitle}\n${dateStr}\n\nEntrar: ${meetingUrl}`;
  return sendEmail({
    to,
    subject: `🔴 Clase en vivo: ${classTitle}`,
    html,
    text,
  });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendEnrollmentEmail,
  sendLiveClassEmail,
  mode: () => mode,
};
