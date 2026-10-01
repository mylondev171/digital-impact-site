# Digital Impact website (Option B2)

Static website export of the Option B2 design: the home page plus 17 content pages.

## View it on your computer

Double-click `index.html` to open it in your browser. Every page, link, image and video works from the folder.

If your browser blocks anything when opening files directly, run a tiny local server from this folder instead:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Publish it

Upload the whole folder, as is, to any static web host (for example Netlify, Vercel, Cloudflare Pages or your own server). `index.html` is the home page.

## Pages

| File | Page |
| --- | --- |
| index.html | Home |
| services.html | All services |
| ai-services.html | AI services |
| ai-consulting.html | AI consulting |
| ai-transition-services.html | AI transition services |
| ai-app-development.html | AI app development |
| aio-aeo-geo.html | AIO / AEO / GEO |
| ppc-management-lexington-ky.html | PPC management |
| seo-lexington-ky.html | SEO Lexington |
| seo-louisville-ky.html | SEO Louisville |
| aio-lexington-ky.html | AIO Lexington |
| aio-louisville-ky.html | AIO Louisville |
| ai-digital-marketing-lexington-ky.html | AI digital marketing |
| about.html | About (with the overview video) |
| history-of-web-design.html | History of web design (with the history video) |
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
