/* IP targeting + CTV page motion: reveal on scroll, stat counters, word-fill headline, the sticky
   how-it-works map, the pinned one-week track, the signal loop, the fine-print scale and the process
   line. It runs after dc-lite has hydrated the page and only touches classes, data attributes, inline
   styles and the text of static counters, so hydration (which checks structure and text) is unaffected. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var vh = function () { return window.innerHeight; };

  function fmt(el, v) {
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var n = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
    return (el.getAttribute('data-pre') || '') + n + (el.getAttribute('data-suf') || '');
  }
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), t0 = null, dur = 1700;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1);
      el.textContent = fmt(el, to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function start() {
    document.documentElement.classList.add('ip-js');
    var hasIO = 'IntersectionObserver' in window;

    // Reveal on scroll, and count numbers up when they come into view.
    var rvEls = $$('[data-rv]');
    if (hasIO) {
      var rv = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px' });
      rvEls.forEach(function (el) { rv.observe(el); });
      if (!reduce) {
        var cn = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { cn.unobserve(e.target); countUp(e.target); } });
        }, { rootMargin: '0px 0px -12% 0px' });
        $$('[data-count]').forEach(function (el) {
          if (el.getBoundingClientRect().top > vh() * 0.9) { el.textContent = fmt(el, 0); cn.observe(el); }
        });
      }
    } else rvEls.forEach(function (el) { el.classList.add('in'); });

    // How it works: the step crossing the middle of the screen drives the map.
    var map = $('#ip-map'), steps = $$('.ip-step');
    if (map && steps.length) {
      var setStep = function (s) {
        map.setAttribute('data-step', s);
        steps.forEach(function (el) { if (el.getAttribute('data-s') === s) el.setAttribute('data-on', ''); else el.removeAttribute('data-on'); });
      };
      setStep('1');
      if (hasIO) {
        var so = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) setStep(e.target.getAttribute('data-s')); });
        }, { rootMargin: '-48% 0px -48% 0px' });
        steps.forEach(function (el) { so.observe(el); });
      } else steps.forEach(function (el) { el.setAttribute('data-on', ''); });
    }

    // One household, one week: pin the track and scroll it sideways on large screens.
    var week = $('#week'), rail = $('#ip-wrail'), track = $('#ip-wtrack'), days = $$('#ip-wprog span');
    var dist = 0, pinned = false;
    var cardDays = [0, 2, 3, 5, 7]; // Mon, Wed, Thu, Sat, Report
    function weekLayout() {
      if (!week || !rail || !track) return;
      track.style.transform = '';
      var want = !reduce && window.innerWidth > 900 && vh() >= 680;
      week.classList.toggle('pinned', want);
      pinned = false;
      rail.style.height = '';
      if (!want) return;
      var cards = track.children, last = cards[cards.length - 1];
      var pad = parseFloat(getComputedStyle(track).paddingRight) || 0;
      dist = Math.max(0, last.getBoundingClientRect().right + pad - track.getBoundingClientRect().left - track.clientWidth);
      if (dist < 40) { week.classList.remove('pinned'); return; }
      pinned = true;
      rail.style.height = (vh() + dist * 1.1) + 'px';
    }
    function weekFrame() {
      if (!pinned) return;
      var r = rail.getBoundingClientRect(), span = rail.offsetHeight - vh();
      var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      track.style.transform = 'translate3d(' + (-dist * p).toFixed(1) + 'px,0,0)';
      var k = p * (cardDays.length - 1), i = Math.min(Math.floor(k), cardDays.length - 2);
      var day = cardDays[i] + (cardDays[i + 1] - cardDays[i]) * (k - i);
      days.forEach(function (d, n) { if (n <= day + 0.001) d.setAttribute('data-hit', ''); else d.removeAttribute('data-hit'); });
    }

    // The signal loop: auto-advances while on screen until someone picks a step.
    var lw = $('#ip-loopwrap');
    if (lw) {
      var nodes = $$('.ip-node', lw), cur = 0, auto = !reduce, vis = false;
      var show = function (i) {
        cur = i;
        lw.setAttribute('data-show', String(i));
        nodes.forEach(function (n, k) { n.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      };
      nodes.forEach(function (n, k) { n.addEventListener('click', function () { auto = false; show(k); }); });
      lw.addEventListener('focusin', function () { auto = false; });
      if (hasIO) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: 0.35 }).observe(lw);
      setInterval(function () { if (auto && vis && !document.hidden) show((cur + 1) % nodes.length); }, 3200);
    }

    // Hero TV: a slight tilt toward the pointer.
    var tvw = $('#ip-tvwrap'), bezel = tvw && $('.ip-bezel', tvw);
    if (bezel && canHover && !reduce) {
      bezel.style.transition = 'transform .35s ease-out';
      window.addEventListener('mousemove', function (e) {
        var r = tvw.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh()) return;
        var mx = clamp((e.clientX - (r.left + r.width / 2)) / r.width, -0.6, 0.6);
        var my = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -0.6, 0.6);
        bezel.style.transform = 'rotateY(' + (mx * 5).toFixed(2) + 'deg) rotateX(' + (-my * 4).toFixed(2) + 'deg)';
      }, { passive: true });
    }

    var fills = $$('[data-fill]'), words = fills.map(function (el) { return $$('.fw', el); });
    var fp = $('.ip-fph'), pw = $('#ip-pwrap'), plis = pw ? $$('li', pw) : [];

    function frame() {
      weekFrame();
      if (!reduce) {
        fills.forEach(function (el, n) {
          var r = el.getBoundingClientRect();
          var p = clamp((vh() * 0.85 - r.top) / (r.height + vh() * 0.3), 0, 1), lit = p * words[n].length;
          words[n].forEach(function (w, i) { w.style.opacity = (0.16 + 0.84 * clamp(lit - i, 0, 1)).toFixed(3); });
        });
        if (fp) {
          var fr = fp.getBoundingClientRect();
          var q = clamp((vh() * 0.95 - fr.top) / (vh() * 0.5), 0, 1);
          fp.style.setProperty('--fp', (1 - Math.pow(1 - q, 2)).toFixed(3));
        }
      }
      if (pw) {
        var pr = pw.getBoundingClientRect(), line = vh() * 0.62;
        pw.style.setProperty('--pp', clamp((line - pr.top) / pr.height, 0, 1).toFixed(4));
        plis.forEach(function (li) { if (li.getBoundingClientRect().top < line) li.setAttribute('data-hit', ''); else li.removeAttribute('data-hit'); });
      }
    }

    var ticking = false;
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(); }); } };
    var onResize = function () { weekLayout(); onScroll(); };
    weekLayout();
    frame();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    document.addEventListener('load', function (e) { if (e.target.tagName === 'IMG') onScroll(); }, true);
  }

  // Wait for DOMContentLoaded so dc-lite (a later deferred script) has hydrated the page first.
  if (document.readyState === 'complete') start(); else document.addEventListener('DOMContentLoaded', start);
})();
