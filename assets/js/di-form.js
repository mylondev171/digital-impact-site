/* di-form: collects a form's fields and posts them to /api/contact. */
(function () {
  'use strict';
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
    return fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then((r) => r.json().catch(() => ({})).then((j) => {
      if (!r.ok || !j.ok) throw new Error(j.error || 'Something went wrong. Please call us at 859.396.8606.');
      return j;
    }), () => { throw new Error('Could not reach the server. Please try again or call 859.396.8606.'); });
  };
})();
