// Receives website form submissions, emails them to the team, and keeps a copy in Supabase.
const LIMITS = { first: 100, last: 100, email: 254, phone: 40, company: 200, comments: 5000, page: 200, timeline: 60 };
const FORMS = ['contact', 'quote', 'home'];

function clean(body) {
  const out = {};
  for (const [k, max] of Object.entries(LIMITS)) out[k] = typeof body[k] === 'string' ? body[k].trim().slice(0, max) : '';
  out.form = FORMS.includes(body.form) ? body.form : 'contact';
  out.services = Array.isArray(body.services) ? body.services.filter((s) => typeof s === 'string').slice(0, 10).map((s) => s.slice(0, 60)) : [];
  return out;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendEmail(d) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const name = `${d.first} ${d.last}`.trim();
  const rows = [
    ['Form', d.form], ['Name', name], ['Company', d.company], ['Email', d.email], ['Phone', d.phone],
    ['Services', d.services.join(', ')], ['Timeline', d.timeline], ['Page', d.page]
  ].filter(([, v]) => v);
  const html = `<h2>New ${esc(d.form)} form submission</h2><table cellpadding="6">${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>`
    + (d.comments ? `<p><b>Message</b></p><p style="white-space:pre-wrap">${esc(d.comments)}</p>` : '');
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + (d.comments ? `\n\nMessage:\n${d.comments}` : '');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || 'Digital Impact Website <website@digitalimpactmarketers.com>',
      to: (process.env.CONTACT_TO || 'don@digitalimpactmarketers.com').split(',').map((s) => s.trim()),
      reply_to: d.email,
      subject: `New ${d.form} request from ${name || d.email}`,
      html,
      text
    })
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

// reCAPTCHA v3. Off until RECAPTCHA_SECRET is set. Returns null when the visitor passes,
// 'reject' when the token is missing or invalid, or a note when the score is too low.
async function checkRecaptcha(d, token) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return null;
  if (typeof token !== 'string' || !token) return 'reject';
  let j;
  try {
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token.slice(0, 4000) }).toString()
    });
    j = await r.json();
  } catch (e) {
    console.error('recaptcha verify failed', e);
    return null; // Google unreachable: let the lead through.
  }
  if (!j.success || j.action !== `submit_${d.form}`) return 'reject';
  const min = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
  return j.score < min ? `held by reCAPTCHA (score ${j.score})` : null;
}

async function saveCopy(d, emailError) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/website_submissions`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      form: d.form, first_name: d.first, last_name: d.last, email: d.email, phone: d.phone || null, company: d.company || null,
      comments: d.comments || null, services: d.services, timeline: d.timeline || null, page: d.page || null,
      email_sent: !emailError, email_error: emailError ? emailError.slice(0, 500) : null
    })
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  // Honeypot: real visitors never fill the hidden "website" field.
  if (body.website) return res.status(200).json({ ok: true });
  const d = clean(body);
  if (!d.first && !d.last) return res.status(400).json({ ok: false, error: 'Please enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });

  const bot = await checkRecaptcha(d, body.recaptcha);
  if (bot === 'reject') return res.status(400).json({ ok: false, error: 'Our spam check could not confirm this request. Please refresh the page and try again, or call us at 859.396.8606.' });

  // A low score still lands in the CRM (email_error says why) but sends no email.
  let emailError = bot;
  if (!bot) try { await sendEmail(d); } catch (e) { emailError = e.message; console.error('email failed', e); }
  let saveError = null;
  try { await saveCopy(d, emailError); } catch (e) { saveError = e.message; console.error('save failed', e); }

  if (emailError && saveError) return res.status(500).json({ ok: false, error: 'We could not send your message. Please call us at 859.396.8606.' });
  return res.status(200).json({ ok: true });
};
