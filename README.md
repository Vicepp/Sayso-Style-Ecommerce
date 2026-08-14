# Sayso Style

An Online Store 2.0 Shopify theme for a minimal, editorial clothing brand. Built
in Liquid, vanilla CSS and vanilla JavaScript — no build step, no framework, and
fully editable in the Shopify theme editor.

Original work. Nothing here is derived from a Shopify Theme Store theme.

---

## Why this stack

Shopify's theme editor can only edit Liquid, JSON templates and plain
CSS/JS assets. A React or Node build pipeline would compile to a bundle the
editor cannot introspect, which breaks drag-and-drop sections, colour settings
and the GitHub sync. So:

| Layer | Technology | Editable in Shopify admin |
| --- | --- | --- |
| Markup | Liquid | Yes |
| Page structure | JSON templates + section groups | Yes, drag-and-drop |
| Styling | Plain CSS with custom properties | Yes, through theme settings |
| Behaviour | Vanilla JS custom elements | N/A |
| Data | Shopify Ajax + Section Rendering APIs | N/A |

Everything is progressively enhanced: the store works with JavaScript disabled,
and every animation is switched off under `prefers-reduced-motion`.

---

## Getting started

```bash
# 1. Install the CLI (once per machine)
npm install -g @shopify/cli@latest

# 2. Preview against a real store, with hot reload
shopify theme dev --store your-store.myshopify.com

# 3. Lint before you commit
shopify theme check
```

`theme dev` serves the theme at <http://127.0.0.1:9292>. Add `--port 9293` if
that port is already taken. A Shopify store is required — Liquid, products and
the cart are rendered server-side, so there is no way to preview a Liquid theme
without one. A free development store from
[partners.shopify.com](https://partners.shopify.com) is enough.

---

## Structure

```
assets/          CSS, JS and placeholder photography
config/          Theme settings schema and saved values
layout/          theme.liquid (storefront) and password.liquid
locales/         Customer-facing copy, en.default.json
sections/        Every section, plus header-group and footer-group
snippets/        Reusable partials (cards, price, icons, cart)
templates/       One JSON file per route
scripts/         Utilities (stock image fetcher)
```

### Pages, all built out

| Route | Template | What is on it |
| --- | --- | --- |
| Home | `index.json` | Hero, marquee, new in, categories, story, best sellers, quote, featured piece, testimonials, gallery, journal, FAQ, newsletter |
| Product | `product.json` | Gallery, variants, buy box, collapsibles, recommendations, trust icons |
| Collection | `collection.json` | Banner, filters, sorting, product grid, load more |
| All collections | `list-collections.json` | Collection tiles |
| Cart | `cart.json` | Line items, totals, discount field, cross-sells |
| Search | `search.json` | Results across products, articles and pages |
| Journal index | `blog.json` | Featured post, topic filters, grid |
| Journal post | `article.json` | Article, comments, related posts |
| Page | `page.json` | Generic content page |
| About | `page.about.json` | Hero, story, makers, materials, promises, gallery |
| Contact | `page.contact.json` | Contact form with subjects, plus FAQ |
| FAQ | `page.faq.json` | Four grouped, schema-marked FAQ sections |
| 404 | `404.json` | Search box and product suggestions |
| Password | `password.json` | Coming-soon page with email capture |
| Gift card | `gift_card.liquid` | Printable gift card |
| Customer accounts | `templates/customers/*.json` | Login, register, account, addresses, order, activate, reset |

No route falls back to a blank page.

---

## Animation

Motion lives in `assets/animations.css` and is driven by `assets/theme.js`.
Everything is configurable under **Theme settings → Animations**.

- **Scroll reveals** — fade, fade-and-rise, or curtain wipe, via
  `IntersectionObserver`. Siblings inside `[data-reveal-group]` stagger.
- **Page transitions** — the View Transitions API where supported, with a
  fade-out fallback and a top progress bar.
- **Parallax** — banner images drift against the scroll, throttled to
  `requestAnimationFrame`.
- **Hover** — image zoom, underline wipes, product card quick-add slide-up.
- **Cart drawer** — slide-in panel with staggered contents and a count bump.
- **Marquee** — seamless CSS loop, track cloned in JS, pauses on hover.
- **Accordions** — `grid-template-rows` animation, no hard-coded heights.

Every one of these is neutralised by the `prefers-reduced-motion` block at the
bottom of `animations.css`.

---

## Photography

The theme ships with placeholder photography from
[Unsplash](https://unsplash.com/license), which permits commercial use without
attribution. Re-fetch or refresh it with:

```powershell
pwsh ./scripts/fetch-stock-images.ps1          # skips existing files
pwsh ./scripts/fetch-stock-images.ps1 -Force   # re-downloads everything
```

Images resolve in three tiers, so a page is never empty:

1. an image chosen in the theme editor
2. a placeholder in `assets/` (see `snippets/media-fallback.liquid`)
3. Shopify's built-in placeholder SVG

**Replace these with your own product photography before launch.** Uploading an
image in the theme editor always overrides the placeholder.

---

## Connecting GitHub to Shopify

1. Push this repository to GitHub (see below).
2. In Shopify admin go to **Online Store → Themes → Add theme → Connect from
   GitHub**.
3. Authorise Shopify, then pick this repository and the `main` branch.
4. Shopify adds the theme to your theme library and keeps it in sync.

Once connected:

- Commits pushed to `main` deploy to the connected theme automatically.
- Edits made in the theme editor are **committed back to `main` by Shopify**.
  Always `git pull` before you start local work, or you will collide with the
  editor's commits.
- `config/settings_data.json` and the JSON templates change frequently as a
  result. Expect noisy diffs on those files; that is normal.

A safe workflow: connect a **branch per environment** — `main` to the live
theme, `staging` to an unpublished theme — and merge upward.

---

## Deploying without GitHub

```bash
shopify theme push --unpublished    # upload as a draft
shopify theme push --theme <id>     # overwrite a specific theme
```

---

## Theme settings

Grouped under **Online Store → Themes → Customise → Theme settings**:

Brand · Colors (light, dark and accent schemes) · Typography · Layout ·
Animations · Product cards · Cart · Social media · Search and sharing.

Sections carry their own colour scheme selector, so any section can be light,
dark or accent independently of the page.

---

## Conventions

- Section schemas use plain English labels rather than `t:` translation keys.
  Translation keys are only required for Theme Store submission; plain labels
  are easier to maintain for a single-brand theme. Customer-facing copy *does*
  go through `locales/en.default.json`.
- JavaScript is written as small custom elements (`<cart-drawer>`,
  `<variant-selector>`, `<carousel-element>`) so sections stay declarative.
- No inline event handlers; everything is delegated or bound on connect.
- CSS uses custom properties set from theme settings, so merchant changes take
  effect without recompiling anything.

---

## Checks

```bash
shopify theme check                 # lints Liquid, JSON and accessibility
shopify theme check --fail-level error
```

CI runs the same check on every push and pull request to `main`
(`.github/workflows/theme-check.yml`).

---

## Licence

Theme code © Sayso Style. Placeholder photography is licensed from Unsplash
under the [Unsplash License](https://unsplash.com/license).
