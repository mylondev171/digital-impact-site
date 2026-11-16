/* SEO & AEO glossary page: sticky sub-nav (scroll-spy, reading progress, mobile search toggle),
   term search, score filters and the video player. Runs after dc-lite hydration and only touches
   attributes, classes and styles, so hydration (which checks structure and text) is unaffected. */
(function () {
  'use strict';

  function start() {
    var sub = document.getElementById('gl-sub');
    if (!sub) return;
    var pillsBox = document.getElementById('gl-pills');
    var pills = [].slice.call(pillsBox.querySelectorAll('[data-spy-for]'));
    var spies = [].slice.call(document.querySelectorAll('[data-spy]'));
    var prog = document.getElementById('gl-prog');
    var q = document.getElementById('gl-q');
    var clear = document.getElementById('gl-clear');
    var count = document.getElementById('gl-count');
    var empty = document.getElementById('gl-empty');
    var emptyMsg = document.getElementById('gl-emptymsg');
    var stog = document.getElementById('gl-stog');
    var terms = [].slice.call(document.querySelectorAll('[data-term]'));
    var secs = [].slice.call(document.querySelectorAll('.gl-sec'));
    var bandBtns = [].slice.call(document.querySelectorAll('[data-band]'));
    var total = terms.length;
    var root = document.documentElement;

    // Index each term once: name and full text, lower-cased.
    var idx = terms.map(function (el) {
      var name = el.querySelector('[data-term-name]').textContent.toLowerCase();
      return { el: el, name: name, text: el.textContent.toLowerCase(), band: band(+el.getAttribute('data-s')) };
    });
    function band(s) { return s >= 9 ? 5 : s >= 7 ? 4 : s >= 5 ? 3 : s >= 3 ? 2 : 1; }

    // Sticky offset = fixed header (64px) + sub-nav bar height (not the drop-down search panel).
    var bar = sub.querySelector('.gl-subin');
    function measure() { root.style.setProperty('--stick', (64 + bar.offsetHeight) + 'px'); }
    measure();
    window.addEventListener('resize', measure);

    // ----- Scroll-spy, stuck shadow, reading progress -----
    var current = null;
    function setCurrent(id) {
      if (id === current) return;
      current = id;
      pills.forEach(function (p) {
        var on = p.getAttribute('data-spy-for') === id;
        p.setAttribute('aria-current', on ? 'true' : 'false');
        if (on) {
          var l = p.offsetLeft - pillsBox.offsetLeft, w = p.offsetWidth;
          if (l < pillsBox.scrollLeft || l + w > pillsBox.scrollLeft + pillsBox.clientWidth) pillsBox.scrollLeft = l - 16;
        }
      });
    }
    var ticking = false;
    function frame() {
      ticking = false;
      var line = 64 + bar.offsetHeight + 40, id = null;
      for (var i = 0; i < spies.length; i++) {
        if (spies[i].hidden) continue;
        var r = spies[i].getBoundingClientRect();
        if (r.top <= line && r.bottom > line) { id = spies[i].id; break; }
      }
      setCurrent(id);
      sub.classList.toggle('stuck', sub.getBoundingClientRect().top <= 64.5);
      var first = spies[0], last = spies[spies.length - 1];
      var a = first.getBoundingClientRect().top + window.scrollY - line;
      var b = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
      var p = b > a ? (window.scrollY - a) / (b - a) : 0;
      prog.style.setProperty('--prog', Math.max(0, Math.min(1, p)).toFixed(4));
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();

    // Drop the right-edge fade once the pill row is scrolled to its end.
    function edge() { pillsBox.classList.toggle('atend', pillsBox.scrollLeft + pillsBox.clientWidth >= pillsBox.scrollWidth - 4); }
    pillsBox.addEventListener('scroll', edge, { passive: true });
    window.addEventListener('resize', edge);
    edge();

    // Close the mobile search panel when a section pill is used.
    pillsBox.addEventListener('click', function () { setOpen(false); });

    // ----- Mobile search toggle -----
    function setOpen(open) {
      sub.classList.toggle('open', open);
      stog.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    // Close the panel on an outside click (filters stay applied; the Search button stays dark while they are).
    document.addEventListener('click', function (e) {
      if (sub.classList.contains('open') && !sub.contains(e.target) && !(e.target.closest && e.target.closest('[data-find], .gl-band'))) setOpen(false);
    });
    stog.addEventListener('click', function () {
      var open = !sub.classList.contains('open');
      setOpen(open);
      if (open) q.focus();
    });

    // ----- Search + score filters -----
    var bands = {};
    function apply() {
      var term = q.value.trim().toLowerCase();
      var anyBand = Object.keys(bands).some(function (k) { return bands[k]; });
      var shown = 0;
      // Match term names first; only fall back to the full text when no name matches.
      var byName = term && idx.some(function (t) { return t.name.indexOf(term) !== -1; });
      idx.forEach(function (t) {
        var hit = !term || (byName ? t.name.indexOf(term) !== -1 : t.text.indexOf(term) !== -1);
        var ok = (!anyBand || bands[t.band]) && hit;
        t.el.hidden = !ok;
        t.ok = ok;
        if (ok) shown++;
      });
      secs.forEach(function (s) {
        var any = false;
        [].forEach.call(s.querySelectorAll('[data-term]'), function (el) { if (!el.hidden) any = true; });
        s.hidden = !any;
        [].forEach.call(s.querySelectorAll('.gl-rank li'), function (li) {
          var el = document.getElementById(li.getAttribute('data-for'));
          li.hidden = !!(el && el.hidden);
        });
        var pill = pillsBox.querySelector('[data-spy-for="' + s.id + '"]');
        if (pill) pill.classList.toggle('empty', !any);
      });
      var filtered = !!term || anyBand;
      count.textContent = filtered ? shown + ' of ' + total + ' terms' : total + ' terms';
      stog.classList.toggle('on', filtered);
      // While filtering, ranked lists show every matching row (no "Show all" cut-off on phones).
      [].forEach.call(document.querySelectorAll('.gl-rbox'), function (r) { r.classList.toggle('short', filtered); r.classList.toggle('all', filtered || r.hasAttribute('data-open')); });
      clear.hidden = !term;
      empty.hidden = shown > 0;
      if (!shown) emptyMsg.textContent = term ? 'No terms match "' + q.value.trim() + '".' : 'No terms in that score range.';
      bandBtns.forEach(function (b) { b.setAttribute('aria-pressed', bands[b.getAttribute('data-band')] ? 'true' : 'false'); });
      onScroll();
    }
    var timer;
    q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 90); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        apply();
        var hit = null;
        var term = q.value.trim().toLowerCase();
        // Prefer a term whose name matches, then any match.
        idx.some(function (t) { if (t.ok && term && t.name.indexOf(term) !== -1) { hit = t.el; return true; } return false; });
        if (!hit) idx.some(function (t) { if (t.ok) { hit = t.el; return true; } return false; });
        if (hit) { setOpen(false); jumpTo(hit); }
      } else if (e.key === 'Escape') { q.value = ''; apply(); }
    });
    clear.addEventListener('click', function () { q.value = ''; apply(); q.focus(); });
    bandBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-band');
        bands[k] = !bands[k];
        apply();
        // From the legend in "How to read", jump to the first matching term.
        if (b.classList.contains('gl-band') && bands[k]) {
          var first = null;
          idx.some(function (t) { if (t.ok) { first = t.el; return true; } return false; });
          if (first) jumpTo(first.closest('.gl-sec'));
        }
      });
    });
    document.getElementById('gl-reset').addEventListener('click', function () {
      q.value = ''; bands = {}; apply();
      jumpTo(document.getElementById('how-to-read'));
    });
    [].forEach.call(document.querySelectorAll('[data-find]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        setOpen(true);
        jumpTo(document.getElementById('how-to-read'));
        q.focus({ preventScroll: true });
      });
    });

    function flash(el) {
      el.classList.add('flash');
      setTimeout(function () { el.classList.remove('flash'); }, 1600);
    }
    var jumpTimers = [];
    function jumpTo(el) {
      jumpTimers.forEach(clearTimeout);
      var go = function () { el.scrollIntoView({ block: 'start', behavior: 'instant' }); };
      go();
      jumpTimers = [50, 150, 300, 550, 900].map(function (ms) {
        return setTimeout(function () {
          var want = 64 + bar.offsetHeight + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
          if (Math.abs(el.getBoundingClientRect().top - want) > 6) go();
        }, ms);
      });
      if (el.hasAttribute('data-term')) setTimeout(function () { flash(el); }, 300);
    }
    // In-page links (sub-nav, ranked lists, top-priorities chart, #hash on load) all go through jumpTo:
    // off-screen sections use content-visibility, so their heights are estimates until rendered and a
    // plain anchor jump can land short. jumpTo jumps, then re-aims a few times as the layout settles.
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var el = id && document.getElementById(id);
      if (!el || el === document.getElementById('main')) return;
      e.preventDefault();
      if (el.hasAttribute('data-term') && el.hidden) { q.value = ''; bands = {}; apply(); }
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      jumpTo(el);
    });
    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) setTimeout(function () { jumpTo(target); }, 0);
    }

    // "Show all" on the ranked lists (phones only show the top 6).
    [].forEach.call(document.querySelectorAll('.gl-more'), function (b) {
      b.addEventListener('click', function () {
        var r = b.closest('.gl-rbox');
        r.setAttribute('data-open', '');
        r.classList.add('all');
        b.setAttribute('aria-expanded', 'true');
      });
    });

    // ----- Video -----
    var box = document.getElementById('video');
    var vid = box && box.querySelector('video');
    function play(e) {
      if (e) e.preventDefault();
      if (!vid) return;
      if (!vid.getAttribute('src')) vid.setAttribute('src', vid.getAttribute('data-src'));
      vid.controls = true;
      box.classList.add('playing');
      var p = vid.play();
      if (p && p.catch) p.catch(function () {});
      if (e && e.currentTarget && e.currentTarget.tagName === 'A') box.scrollIntoView({ block: 'center' });
    }
    [].forEach.call(document.querySelectorAll('[data-play]'), function (el) { el.addEventListener('click', play); });
  }

  // Wait for DOMContentLoaded so dc-lite (a later deferred script) has hydrated the page first.
  if (document.readyState === 'complete') start(); else document.addEventListener('DOMContentLoaded', start);
})();
