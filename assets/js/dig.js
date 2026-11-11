/* DIG page motion: hero print parallax, word-fill statement, sticky chapters that scroll each site
   and blend the background between the nonprofits' colors. Only touches styles and attributes, so the
   dc-lite hydration (which checks structure and text) is unaffected. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var vh = function () { return window.innerHeight; };

  function start() {
    var progEls = [].slice.call(document.querySelectorAll('[data-prog]'));
    var screens = [].slice.call(document.querySelectorAll('[data-screen]'));
    var fills = [].slice.call(document.querySelectorAll('[data-fill]'));
    var wrap = document.getElementById('chapters');
    var rail = document.getElementById('rail');
    var prints = document.getElementById('prints');
    if (!wrap) return;
    var chs = [].slice.call(wrap.querySelectorAll('.chapter'));
    var hex = function (h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
    var cols = chs.map(function (c) { return hex(c.getAttribute('data-bg')); });
    var words = fills.map(function (el) { return [].slice.call(el.querySelectorAll('.fw')); });

    function stickyProgress(el) {
      var r = el.getBoundingClientRect(), span = r.height - vh();
      return span > 0 ? clamp(-r.top / span, 0, 1) : clamp((vh() - r.top) / (vh() + r.height), 0, 1);
    }

    function colors() {
      var mid = vh() * 0.5, idx = 0, t = 0;
      for (var i = 0; i < chs.length; i++) if (chs[i].getBoundingClientRect().top <= mid) idx = i;
      var r0 = chs[idx].getBoundingClientRect();
      if (idx < chs.length - 1) { var fade = r0.height * 0.35; t = clamp((mid - (r0.bottom - fade)) / fade, 0, 1); }
      var a = cols[idx], b = cols[Math.min(idx + 1, cols.length - 1)];
      wrap.style.background = 'rgb(' + a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); }).join(',') + ')';
      var cur = t > 0.5 ? chs[Math.min(idx + 1, chs.length - 1)] : chs[idx];
      if (rail) {
        var wr = wrap.getBoundingClientRect();
        rail.classList.toggle('on', wr.top < mid && wr.bottom > mid);
        rail.style.color = getComputedStyle(cur).getPropertyValue('--fg');
        [].forEach.call(rail.querySelectorAll('a'), function (l) { l.setAttribute('aria-current', l.getAttribute('data-for') === cur.id ? 'true' : 'false'); });
      }
    }

    function frame() {
      progEls.forEach(function (el) { el._p = stickyProgress(el); el.style.setProperty('--p', el._p.toFixed(4)); });
      var still = window.innerWidth <= 900;
      screens.forEach(function (bw) {
        var img = bw.querySelector('img'), view = img.parentNode;
        if (still) { img.style.transform = ''; return; }
        var host = bw.closest('[data-prog]'), p = host ? host._p || 0 : 0;
        var from = parseFloat(bw.getAttribute('data-from') || '0.15'), to = parseFloat(bw.getAttribute('data-to') || '0.9');
        var s = clamp((p - from) / (to - from), 0, 1);
        s = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
        var max = img.offsetHeight - view.offsetHeight;
        if (max > 0) img.style.transform = 'translate3d(0,' + (-max * s).toFixed(1) + 'px,0)';
      });
      fills.forEach(function (el, n) {
        var r = el.getBoundingClientRect();
        var p = clamp((vh() * 0.85 - r.top) / (r.height + vh() * 0.35), 0, 1), lit = p * words[n].length;
        words[n].forEach(function (w, i) { w.style.opacity = (0.18 + 0.82 * clamp(lit - i, 0, 1)).toFixed(3); });
      });
      colors();
    }

    if (reduce) {
      progEls.forEach(function (el) { el.style.setProperty('--p', '1'); });
      window.addEventListener('scroll', colors, { passive: true });
      colors();
      return;
    }
    var ticking = false;
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(); }); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', frame);
    document.addEventListener('load', function (e) { if (e.target.tagName === 'IMG') onScroll(); }, true);
    frame();

    if (prints && window.matchMedia('(hover: hover)').matches) {
      window.addEventListener('mousemove', function (e) {
        var mx = ((e.clientX / innerWidth) - 0.5).toFixed(3), my = ((e.clientY / innerHeight) - 0.5).toFixed(3);
        [].forEach.call(prints.children, function (c) { c.style.setProperty('--mx', mx); c.style.setProperty('--my', my); });
      }, { passive: true });
    }
  }

  // Wait for DOMContentLoaded so dc-lite (a later deferred script) has hydrated the page first.
  if (document.readyState === 'complete') start(); else document.addEventListener('DOMContentLoaded', start);
})();
