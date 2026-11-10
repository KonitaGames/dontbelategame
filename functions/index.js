const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

const TO_ADDRESS = 'support@dontbelategame.com';
const FROM_ADDRESS = "Don't Be Late! Forms <forms@dontbelategame.com>";
const MAX_FIELDS = 30;
const MAX_LENGTH = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_SUBJECTS = {
  contact: 'New contact message',
  pilot: 'New pilot request',
  quote: 'New quote request',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Keeps string fields only, trimmed and length-capped; drops underscore-prefixed control fields.
function cleanFields(body) {
  const fields = {};
  for (const [key, value] of Object.entries(body).slice(0, MAX_FIELDS)) {
    if (key.startsWith('_') || typeof value !== 'string') continue;
    fields[key.slice(0, 64)] = value.trim().slice(0, MAX_LENGTH);
  }
  return fields;
}

function renderEmail(fields) {
  const rows = Object.entries(fields)
    .filter(([key]) => key !== 'formType')
    .map(([key, value]) =>
      `<tr><td style="padding:6px 12px;font-weight:bold;vertical-align:top">${escapeHtml(key)}</td>` +
      `<td style="padding:6px 12px;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`)
    .join('');
  return `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows}</table>`;
}

exports.submitForm = onRequest(
  {
    region: 'us-central1',
    cors: ['https://www.dontbelategame.com', 'https://dontbelategame.com'],
    secrets: ['RESEND_API_KEY'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Bots fill the hidden _gotcha field; pretend success so they don't retry.
    if (body._gotcha) {
      res.json({ ok: true });
      return;
    }

    const fields = cleanFields(body);
    if (!fields.name || !fields.email || !EMAIL_RE.test(fields.email)) {
      res.status(400).json({ ok: false, error: 'Name and a valid email are required' });
      return;
    }

    const formType = DEFAULT_SUBJECTS[fields.formType] ? fields.formType : 'contact';
    const subject = typeof body._subject === 'string' && body._subject.trim()
      ? body._subject.trim().slice(0, 150)
      : DEFAULT_SUBJECTS[formType];

    try {
      await admin.firestore().collection('formSubmissions').add({
        ...fields,
        formType,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.error('Failed to save form submission', err);
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: TO_ADDRESS,
        replyTo: fields.email,
        subject: `${subject} from ${fields.name}`.slice(0, 200),
        html: renderEmail(fields),
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      logger.error('Failed to send form email', err);
      res.status(502).json({ ok: false, error: 'Could not send message' });
      return;
    }

    res.json({ ok: true });
  }
);
