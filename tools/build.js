/* Builds the deployable site from src/pages.
   For each src/pages/<page>.html it:
   - moves the page's template and logic into assets/js/pages/<page>.js (cached, no eval at runtime),
   - pre-renders the page with dc-lite in jsdom so the full content ships in the HTML,
   - adds canonical, Open Graph / Twitter tags and JSON-LD (organization, breadcrumbs, FAQ),
   and writes <page>.html at the site root. It also writes sitemap.xml and llms.txt.
   Run: cd tools && npm install && npm run build */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');
const site = require('./site.json');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'pages');
const PAGE_JS = path.join(ROOT, 'assets', 'js', 'pages');
const BASE = site.baseUrl.replace(/\/$/, '');

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => new JSDOM('<!doctype html><p>' + s + '</p>').window.document.querySelector('p').textContent;
const urlFor = (slug) => (slug === 'index' ? BASE + '/' : BASE + '/' + slug);
const ld = (obj) => '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';

const dcLite = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'dc-lite.js'), 'utf8');
const dcLiteV = hash(dcLite);
fs.mkdirSync(PAGE_JS, { recursive: true });

function orgSchema() {
  const o = site.org;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': BASE + '/#org',
    name: o.name,
    url: BASE + '/',
    logo: BASE + o.logo,
    image: BASE + site.ogImage,
    telephone: o.telephone,
    priceRange: o.priceRange,
    description: o.description,
    foundingDate: o.foundingDate,
    founder: { '@type': 'Person', '@id': BASE + '/about#don-johnson', name: o.founder.name, jobTitle: o.founder.jobTitle },
    address: Object.assign({ '@type': 'PostalAddress' }, o.address),
    areaServed: o.areaServed,
    knowsAbout: o.knowsAbout,
    sameAs: o.sameAs
  };
}

function pageSchemas(slug, meta, faq) {
  const out = [orgSchema()];
  const url = urlFor(slug);
  const page = site.pages[slug] || {};
  if (slug === 'index') {
    out.push({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': BASE + '/#website', url: BASE + '/', name: site.org.name, publisher: { '@id': BASE + '/#org' } });
  } else {
    const crumbs = [{ name: 'Home', url: BASE + '/' }];
    if (page.parent) crumbs.push({ name: site.pages[page.parent].name, url: urlFor(page.parent) });
    crumbs.push({ name: page.name || meta.title, url: url });
    out.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url }))
    });
  }
  if (faq.length) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': url + '#faq',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }
  return out;
}

function headTags(slug, meta) {
  const url = urlFor(slug);
  return [
    '<link rel="canonical" href="' + esc(url) + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + esc(site.org.name) + '">',
    '<meta property="og:locale" content="en_US">',
    '<meta property="og:title" content="' + esc(meta.title) + '">',
    '<meta property="og:description" content="' + esc(meta.description) + '">',
    '<meta property="og:url" content="' + esc(url) + '">',
    '<meta property="og:image" content="' + esc(BASE + site.ogImage) + '">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="' + esc(site.ogImageAlt) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + esc(meta.title) + '">',
    '<meta name="twitter:description" content="' + esc(meta.description) + '">',
    '<meta name="twitter:image" content="' + esc(BASE + site.ogImage) + '">'
  ].join('\n');
}

function normFaq(list) {
  return (list || []).map((f) => (Array.isArray(f) ? { q: f[0], a: f[1] } : { q: f.q, a: f.a })).filter((f) => f.q && f.a);
}

const built = [];
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.html')).sort()) {
  const slug = file.replace(/\.html$/, '');
  const src = fs.readFileSync(path.join(SRC, file), 'utf8');
  const doc = new JSDOM(src).window.document;
  const tplHTML = doc.getElementById('dc-tpl').innerHTML;
  const logic = doc.getElementById('dc-logic').textContent;
  const meta = {
    title: doc.title.trim(),
    description: (doc.querySelector('meta[name="description"]') || { getAttribute: () => '' }).getAttribute('content').trim()
  };

  const pageJs = '/* Generated from src/pages/' + file + ' by tools/build.js. Edit the source, not this file. */\n' +
    '(function (DCLogic) {\n' + logic.trim() + '\nwindow.DCMount(Component, ' + JSON.stringify(tplHTML) + ');\n})(window.DCLogic);\n';
  fs.writeFileSync(path.join(PAGE_JS, slug + '.js'), pageJs);

  // Pre-render with the same runtime the browser uses.
  const pre = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: urlFor(slug) });
  pre.window.__DC_PRERENDER = true;
  pre.window.eval(dcLite);
  pre.window.eval(pageJs);
  const markup = pre.window.document.getElementById('app').innerHTML;
  const faq = normFaq(pre.window.__dc && pre.window.__dc.FAQ);

  // Other scripts the page loads (e.g. the form handler), kept in source order.
  const bodySrc = src.slice(src.indexOf('<body'));
  const extra = [];
  bodySrc.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (m, s) => { if (!/dc-lite\.js/.test(s)) extra.push(s.replace(/^(?!\/|https?:)/, '/')); return m; });

  const head = src.slice(0, src.indexOf('</head>')).trimEnd();
  const scripts = extra.map((s) => '<script src="' + s + '" defer></script>')
    .concat([
      '<script src="/assets/js/dc-lite.js?v=' + dcLiteV + '" defer></script>',
      '<script src="/assets/js/pages/' + slug + '.js?v=' + hash(pageJs) + '" defer></script>'
    ]);
  const html = head + '\n' + headTags(slug, meta) + '\n' + pageSchemas(slug, meta, faq).map(ld).join('\n') +
    '\n</head>\n<body>\n<div id="app">' + markup + '</div>\n' + scripts.join('\n') + '\n</body>\n</html>\n';
  fs.writeFileSync(path.join(ROOT, file), html);
  built.push({ slug, meta, faq: faq.length, bytes: Buffer.byteLength(html) });
}

// sitemap.xml (every page except the 404 page)
const today = new Date().toISOString().slice(0, 10);
const listed = built.filter((b) => !(site.pages[b.slug] || {}).noSitemap);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  listed.map((b) => '  <url><loc>' + urlFor(b.slug) + '</loc><lastmod>' + today + '</lastmod></url>').join('\n') +
  '\n</urlset>\n');

// llms.txt: a curated map of the site for AI tools
const sections = {};
for (const b of listed) {
  const p = site.pages[b.slug] || {};
  if (!p.llms) continue;
  (sections[p.llms] = sections[p.llms] || []).push('- [' + p.name + '](' + urlFor(b.slug) + '): ' + decode(p.summary || b.meta.description));
}
fs.writeFileSync(path.join(ROOT, 'llms.txt'),
  '# ' + site.org.name + '\n\n> ' + site.llmsIntro.join('\n> ') + '\n\n' +
  site.llmsOrder.filter((s) => sections[s]).map((s) => '## ' + s + '\n\n' + sections[s].join('\n')).join('\n\n') + '\n');

for (const b of built) console.log(b.slug.padEnd(32), String(b.bytes).padStart(7), 'bytes', b.faq ? b.faq + ' FAQs' : '');
