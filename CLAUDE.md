# BuddyPro Stripe Thanks Page — Project Instructions

You're working on a small open-source web app that BuddyPro owners deploy as the **success URL for their Stripe Checkout**. After a buyer pays, Stripe redirects them here, and this page turns their Stripe session ID into a one-click Telegram activation link for the owner's BuddyPro instance.

It's intentionally small (one Nitro server, one static HTML page) so anyone can fork it, rebrand it, translate it, and self-host it.

## Prerequisites

- **Node.js 20+** and npm
- A Stripe account (any plan) with a secret key
- A Telegram bot username (the `@…` handle, no `@` prefix)

## What's customizable (do whatever you want)

**Everything visual and editorial.** This page is meant to be made yours.

- All copy in `public/index.html` — translate to any language, change the tone, rewrite headings.
- Branding — replace the checkmark icon with your logo, swap colors, change fonts (Tailwind via CDN is loaded; restyle freely or rip it out).
- Layout — reorder sections, add hero images, drop a video, embed an upsell.
- The "Don't have Telegram yet?" install guide — translate it, simplify it, replace it with a link to your own docs, or remove it if your audience already has Telegram.
- The "Activate manually" fallback — keep, remove, or redesign.
- Add anything else — testimonials, links to your community, an order summary pulled from the Stripe session, an unsubscribe link, etc.

You can edit `public/index.html` as plain HTML. No build step, no framework. Tailwind classes work via CDN.

## What you MUST NOT change (or things will break silently)

These are the contract points between Stripe → this page → BuddyPro. Touch them only if you know exactly what you're doing.

### 1. The session ID URL pattern

Stripe must redirect buyers to a URL containing the checkout session ID as the `checkoutsesh` query param:

```
https://your-domain/?checkoutsesh={CHECKOUT_SESSION_ID}
```

The `{CHECKOUT_SESSION_ID}` placeholder is filled by Stripe automatically — see [Stripe's `success_url` docs](https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-success_url). If you rename the param, change it in **both** the Stripe success URL config and `public/index.html` (the line `params.get('checkoutsesh')`).

### 2. The activation code rule (`utils/activation.ts`)

**Do not change it.** It decides whether the Telegram `/start` payload uses the Stripe **invoice ID** (`in_…`) or the **payment intent ID** (`pi_…`):

The link format is always `https://t.me/{BOT_USERNAME}?start=STRIPE_{id}`. If you change the prefix, the bot won't recognize the activation.

### 3. The API contract (`routes/api/activation.get.ts`)

The HTML page calls `GET /api/activation?checkoutsesh=…` and expects this JSON shape:

```json
{
  "activationUrl": "https://t.me/…?start=STRIPE_…",
  "activationCode": "STRIPE_…",
  "botUsername": "…",
  "mode": "subscription" | "payment",
  "source": "invoice" | "payment_intent"
}
```

You can add fields. Don't rename existing ones unless you also update `public/index.html`.

### 4. Element IDs the JS depends on

The script in `public/index.html` looks up these IDs / classes — keep them if you keep the script:

- `#loading`, `#success`, `#error` — the three top-level state containers
- `#error-message` — text node for error copy
- `#activate-btn` — the link to Telegram (script sets its `href`)
- `#activation-url` — input showing the full link
- `#manual-command` — input showing `/start STRIPE_…`
- `#bot-handle` — span showing `@botusername`
- `.copy-btn` with `data-copy-target="<id>"` — generic copy buttons

If you rewrite the page from scratch, you can rewire all of this. The point is: if you keep the existing script, keep the IDs.

## How to run locally

```bash
npm install
cp .env.example .env       # fill in your Stripe key + bot username
npm run dev                # → http://localhost:3000
```

To test, find a real test-mode checkout session ID in your Stripe dashboard and visit:

```
http://localhost:3000/?checkoutsesh=cs_test_…
```

## Environment variables

| Var                        | What it is                                                                        |
| -------------------------- | --------------------------------------------------------------------------------- |
| `NITRO_STRIPE_SECRET_KEY`  | Your Stripe secret key. Server-side only — never exposed to the browser.          |
| `NITRO_BOT_USERNAME`       | Your Telegram bot username, no leading `@`.                                       |

Never commit `.env`. The `.gitignore` already excludes it.

## Deploying

Default preset is `vercel` (in `nitro.config.ts`). To deploy elsewhere, change one line:

| Platform                     | Preset             |
| ---------------------------- | ------------------ |
| Vercel (default)             | `vercel`           |
| Cloudflare Pages / Workers   | `cloudflare-pages` |
| Plain Node.js (nginx/Caddy)  | `node-server`      |
| Bun                          | `bun`              |
| Netlify                      | `netlify`          |
| AWS Lambda                   | `aws-lambda`       |

Full list: [nitro.build/deploy](https://nitro.build/deploy).

When setting env vars on Vercel via CLI, use `printf` (not `echo`) to avoid trailing newlines that silently break the value.

## Project structure

```
.
├── routes/api/activation.get.ts   # Server endpoint — DO NOT change the contract
├── utils/activation.ts             # Activation code rule — DO NOT change the rule
├── public/index.html               # The page — CHANGE FREELY
├── nitro.config.ts                 # Preset + runtime config
├── package.json
├── tsconfig.json
├── .env.example                    # Copy to .env, fill in
└── README.md                       # User-facing docs
```

## Common tasks

- **Translate the page**: edit text in `public/index.html` only. The server returns no user-visible strings.
- **Change branding**: edit `public/index.html`. Replace the checkmark SVG, swap colors, drop in a logo.
- **Add an order summary**: extend `routes/api/activation.get.ts` to return `session.amount_total`, `session.currency`, `session.line_items` (you may need to add those to the `expand` array). Render them client-side from the JSON response.
- **Use a different Stripe param name**: rename `checkoutsesh` everywhere — Stripe success URL, `public/index.html`'s `params.get(...)`, and `routes/api/activation.get.ts`'s `getQuery(event)` destructure.
- **Disable the manual fallback**: delete the `<details>` block whose summary says "Activate manually" in `public/index.html`. The script tolerates missing IDs gracefully.

## Why this exists (background)

BuddyPro owners sell Telegram bot access via Stripe. After payment, the buyer needs an activation link of the form `https://t.me/{bot}?start=STRIPE_{id}` to redeem their purchase inside Telegram. That link is also emailed, but emails sometimes land in spam — so this page acts as a reliable, brandable, copyable backup directly on the success URL.
