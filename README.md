# Digital Impact website (Option B2)

Static website export of the Option B2 design: the home page plus 17 content pages.

## View it on your computer

Pages link to each other with clean, root-based URLs (`/about`, `/seolexingtonky`), matching the live site's addresses, so opening `index.html` directly from the folder won't follow links. Run a local server that supports clean URLs from this folder instead:

```
npx serve .
```

Then visit http://localhost:3000.

## Publish it

The site is deployed on Vercel. `vercel.json` turns on clean URLs (so `about.html` is served at `/about`) and redirects the older `.html` page names. Any other host needs the same clean-URL setting (Netlify and Cloudflare Pages do this by default). `index.html` is the home page.

## Pages

| File (URL) | Page |
| --- | --- |
| index.html | Home |
| services.html | All services |
| aiservices.html | AI services |
| aiconsulting.html | AI consulting |
| aitransitionservices.html | AI transition services |
| aiappdevelopment.html | AI app development |
| aioaeogeo.html | AIO / AEO / GEO |
| ppcmanagementlexingtonky.html | PPC management |
| seolexingtonky.html | SEO Lexington |
| seolouisvilleky.html | SEO Louisville |
| aiolexingtonky.html | AIO Lexington |
| aiolouisvilleky.html | AIO Louisville |
| aidigitalmarketinglexingtonky.html | AI digital marketing |
| about.html | About (with the overview video) |
| ahistoryofwebdesign.html | History of web design (with the history video) |
| contact.html | Contact |
| get-a-quote.html | Get a quote |
| privacy-policy.html | Privacy policy |

## Folder layout

- `src/pages` holds the page sources. **Edit these, not the root `.html` files**, then run the build.
- `tools/build.js` builds the site (see below); `tools/site.json` holds the site URL, organization details for schema, and page names for breadcrumbs and `llms.txt`.
- `assets/js/dc-lite.js` is the small runtime that runs each page's interactions (menus, FAQs, the services fan, scroll animations, video play buttons). It hydrates the pre-rendered HTML instead of rebuilding the page.
- `assets/js/pages/<page>.js` is generated: each page's template and logic, loaded after the HTML.
- `assets/img` holds the logo, the generated images, the video posters and the 1200x630 share image (`og-1200x630.jpg`).
- `assets/video` holds the overview and history videos.

## Building

```
cd tools
npm install
npm run build
```

For every `src/pages/<page>.html` the build pre-renders the page (so crawlers and AI assistants get the full content, including every FAQ answer, without running JavaScript), writes `<page>.html` at the root with canonical, Open Graph/Twitter tags and JSON-LD (organization, breadcrumbs, FAQ), writes `assets/js/pages/<page>.js`, and regenerates `sitemap.xml` and `llms.txt`. Commit the generated files; Vercel serves them as-is (`src/` and `tools/` are excluded by `.vercelignore`).

## Editing

Each source page's markup lives inside `<template id="dc-tpl">`, and its behavior in the `<script id="dc-logic">` block below it. Text can be edited directly in the template. Values written as `{{name}}` are filled in by that page's script. Rebuild after editing.

## SEO notes

- Canonicals point at `https://www.digitalimpactmarketers.com` (set in `tools/site.json`). The `digital-impact-site.vercel.app` host sends `X-Robots-Tag: noindex` (see `vercel.json`) so it never competes with the live domain.
- `robots.txt` welcomes AI crawlers and points at the sitemap. `404.html` is the branded not-found page (noindex).
- Add `streetAddress` and `postalCode` to `org.address` in `tools/site.json` once an address is published; they must match the Google Business Profile exactly.
- Vercel Web Analytics is tagged on every page; it starts collecting once Analytics is enabled on the Vercel project.
