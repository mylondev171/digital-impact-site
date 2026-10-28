/* di-form: collects a form's fields and posts them to /api/contact. */
(function () {
  'use strict';
  // reCAPTCHA v3 site key (public). Empty = forms post without a token.
  const RECAPTCHA_KEY = '6LfQXgUuAAAAAF3d6SCNbpdqn3NatZ8NTqf8brpY';
  let recaptcha = null;

  // api.js is heavy, so it loads when a visitor first touches a form field, not with the page.
  function loadRecaptcha() {
    if (!RECAPTCHA_KEY) return Promise.resolve(null);
    if (!recaptcha) {
      recaptcha = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(RECAPTCHA_KEY);
        s.async = true;
        s.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
        s.onerror = () => { recaptcha = null; resolve(null); };
        document.head.appendChild(s);
      });
    }
    return recaptcha;
  }
  document.addEventListener('focusin', (e) => {
    if (e.target.matches && e.target.matches('input[name], textarea[name]')) loadRecaptcha();
  });

  // Tokens expire after two minutes, so one is fetched at submit time.
  function token(form) {
    return loadRecaptcha().then((g) => (g ? g.execute(RECAPTCHA_KEY, { action: 'submit_' + form }) : ''), () => '');
  }

  function fieldsNear(btn) {
    let box = btn.parentElement;
    while (box && !box.querySelector('input[name="email"]')) box = box.parentElement;
    const out = {};
    if (!box) return out;
    box.querySelectorAll('input[name], textarea[name]').forEach((el) => { out[el.name] = el.value.trim(); });
    return out;
  }
  window.diSubmitForm = function (btn, extra) {
    const data = Object.assign(fieldsNear(btn), extra || {}, { page: location.pathname });
    if (!data.first && !data.last) return Promise.reject(new Error('Please enter your name.'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) return Promise.reject(new Error('Please enter a valid email address.'));
    return token(data.form || 'contact').then((t) => fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign(data, { recaptcha: t }))
    })).then((r) => r.json().catch(() => ({})).then((j) => {
      if (!r.ok || !j.ok) throw new Error(j.error || 'Something went wrong. Please call us at 859.396.8606.');
      return j;
    }), () => { throw new Error('Could not reach the server. Please try again or call 859.396.8606.'); });
  };
})();
