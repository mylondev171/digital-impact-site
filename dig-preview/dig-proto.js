/* DIG prototype helpers (throwaway spike). */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var vh = function () { return window.innerHeight; };

  // Progress of a tall element through the viewport: 0 when its top hits the top, 1 when its bottom hits the bottom.
  function stickyProgress(el) {
    var r = el.getBoundingClientRect();
    var span = r.height - vh();
    return span > 0 ? clamp(-r.top / span, 0, 1) : clamp((vh() - r.top) / (vh() + r.height), 0, 1);
  }
  // Progress of any element passing through the viewport: 0 when its top enters at the bottom, 1 when its bottom leaves the top.
  function passProgress(el) {
    var r = el.getBoundingClientRect();
    return clamp((vh() - r.top) / (vh() + r.height), 0, 1);
  }

  var progEls = [].slice.call(document.querySelectorAll('[data-prog]'));
  var screens = [].slice.call(document.querySelectorAll('[data-screen]'));
  var fills = [].slice.call(document.querySelectorAll('[data-fill]'));
  var hooks = window.DIG_HOOKS || [];

  // Split word-fill paragraphs into spans.
  fills.forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="fw">' + w + '</span>'; }).join(' ');
    el._w = [].slice.call(el.querySelectorAll('.fw'));
  });

  function frame() {
    progEls.forEach(function (el) {
      var p = el.getAttribute('data-prog') === 'pass' ? passProgress(el) : stickyProgress(el);
      el.style.setProperty('--p', p.toFixed(4));
      el._p = p;
    });
    screens.forEach(function (bw) {
      var host = bw.closest('[data-prog]');
      var p = host ? host._p || 0 : passProgress(bw);
      var from = parseFloat(bw.getAttribute('data-from') || '0.15');
      var to = parseFloat(bw.getAttribute('data-to') || '0.9');
      var s = clamp((p - from) / (to - from), 0, 1);
      s = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2; // ease in-out
      var img = bw.querySelector('img');
      var view = img.parentNode;
      var max = img.offsetHeight - view.offsetHeight;
      if (max > 0) img.style.transform = 'translate3d(0,' + (-max * s).toFixed(1) + 'px,0)';
    });
    fills.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = clamp((vh() * 0.85 - r.top) / (r.height + vh() * 0.35), 0, 1);
      var n = el._w.length, lit = p * n;
      el._w.forEach(function (w, i) { w.style.opacity = (0.18 + 0.82 * clamp(lit - i, 0, 1)).toFixed(3); });
    });
    hooks.forEach(function (fn) { fn(); });
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(); }); } }
  if (!reduce) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', frame);
    frame();
  } else {
    document.documentElement.classList.add('rm');
    progEls.forEach(function (el) { el.style.setProperty('--p', '1'); el._p = 1; });
    fills.forEach(function (el) { el._w.forEach(function (w) { w.style.opacity = 1; }); });
  }

  // Mobile menu (simplified for the prototype).
  var burger = document.querySelector('.e-burger');
  if (burger) {
    var menu = document.createElement('nav');
    menu.className = 'e-mmenu'; menu.hidden = true; menu.setAttribute('aria-label', 'Mobile');
    menu.innerHTML = '<div class="e-mgroup"><a class="e-mlink" href="/services">Services</a><a class="e-mlink" href="/aiservices">AI services</a><a class="e-mlink" href="/about">About</a><a class="e-mlink" href="/contact">Contact</a><a class="e-mlink" href="/get-a-quote">Get a quote</a></div>';
    document.body.appendChild(menu);
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', open); menu.hidden = !open;
    });
  }

  // Prototype form: never submits.
  [].forEach.call(document.querySelectorAll('form[data-proto]'), function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = f.querySelector('.proto-note');
      if (note) { note.hidden = false; note.textContent = 'Prototype only: this form is not connected yet.'; }
    });
  });
  // Chip toggles.
  [].forEach.call(document.querySelectorAll('.need'), function (b) {
    b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
  });
})();
