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

- `assets/img` holds the logo, the generated images and the video posters.
- `assets/video` holds the overview and history videos.
- `assets/js/dc-lite.js` is the small script that runs each page's interactions (menus, FAQs, the services fan, scroll animations, video play buttons).

## Before going live

- **Forms:** The contact and quote forms show a thank-you message but do not send anywhere yet. Connect them to your form handler or CRM before launch.
- **Fonts:** Raleway, Lato and Merriweather load from Google Fonts.
- **Search engines:** Each page ships with its full content already in the HTML, so crawlers and AI assistants can read it without running JavaScript.

## Editing

Each page's markup lives inside `<template id="dc-tpl">`, and its behavior in the `<script id="dc-logic">` block below it. Text can be edited directly in the template. Values written as `{{name}}` are filled in by that page's script.
