# BuddyPro Stripe Thanks Page — Project Instructions

You're working on a small open-source web page that BuddyPro owners deploy as the **success URL for their Stripe Checkout**. After a buyer pays, Stripe redirects them here with the checkout session ID in the URL, and the page turns it into a one-click Telegram activation link for the owner's BuddyPro instance.

It's intentionally tiny: **a single static HTML file**, no server, no build step, no dependencies. Anyone can fork, rebrand, translate, and host it on any static host (Vercel, Netlify, GitHub Pages, S3 — anywhere).

## Prerequisites

- A Telegram bot username (no `@` prefix)
- That's it. No Node.js, no npm, no Stripe API key, no env vars.

## What's customizable (do whatever you want)

**Everything visual and editorial.** This page is meant to be made yours.

- All copy in `index.html` — translate to any language, change the tone, rewrite headings.
- Branding — replace the checkmark icon with your logo, swap colors, change fonts (Tailwind via CDN is loaded; restyle freely or rip it out).
- Layout — reorder sections, add hero images, drop a video, embed an upsell.
- The "Don't have Telegram yet?" install guide — translate it, simplify it, replace it with a link to your own docs, or remove it if your audience already has Telegram.
- The "Activate manually" fallback — keep, remove, or redesign.
- Add anything else — testimonials, links to your community, an unsubscribe link, etc.

You can edit `index.html` as plain HTML. No build step, no framework. Tailwind classes work via CDN.

## What you MUST NOT change (or things will break silently)

These are the contract points between Stripe → this page → BuddyPro. Touch them only if you know exactly what you're doing.

### 1. The session ID URL pattern

Stripe must redirect buyers to a URL containing the checkout session ID as the `session_id` query param:

```
https://your-domain/?session_id={CHECKOUT_SESSION_ID}
```

The `{CHECKOUT_SESSION_ID}` placeholder is filled by Stripe automatically — see [Stripe's `success_url` docs](https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-success_url). If you rename the param, change it in **both** the Stripe success URL config and `index.html` (the line `params.get("session_id")`).

### 2. The activation code format

The link format is always `https://t.me/{BOT_USERNAME}?start=STRIPE_{checkout_session_id}`. BuddyPro's Telegram bot recognizes the `STRIPE_cs_…` prefix and looks the session up server-side to activate the purchase. If you change the prefix or the structure, the bot won't recognize the activation.

### 3. Element IDs the script depends on

The script in `index.html` looks up these IDs / classes — keep them if you keep the script:

- `#success`, `#error` — the two top-level state containers
- `#error-message` — text node for error copy
- `#activate-btn` — the link to Telegram (script sets its `href`)
- `#activation-url` — input showing the full link
- `#manual-command` — input showing `/start STRIPE_…`
- `#bot-handle` — span showing `@botusername`
- `#welcome-video-section`, `#welcome-video-container` — optional video embed
- `.copy-btn` with `data-copy-target="<id>"` — generic copy buttons

If you rewrite the page from scratch, you can rewire all of this. The point is: if you keep the existing script, keep the IDs.

## Configuration

Edit two constants at the top of the `<script>` block in `index.html`:

```js
const BOT_USERNAME = "your_bot_username";   // Your Telegram bot username, no leading @
const WELCOME_VIDEO_URL = "";                // Optional: YouTube/Vimeo/.mp4 URL, or "" to hide
```

That's the entire configuration surface.

## How to run locally

```bash
python3 -m http.server 3000
# → http://localhost:3000/?session_id=cs_test_anything
```

Any value for `session_id` will work for local testing — the page doesn't validate against Stripe, it just builds the link. To verify the full flow, paste a real Stripe checkout session ID and click through to your bot in Telegram.

## Deploying

Anything that serves static files works. Pick one:

| Platform           | One-liner                                  |
| ------------------ | ------------------------------------------ |
| Vercel             | `npx vercel --prod`                        |
| Netlify            | `npx netlify deploy --prod --dir .`        |
| Cloudflare Pages   | `npx wrangler pages deploy .`              |
| GitHub Pages       | Push to a repo, enable Pages on `main /`   |
| S3 / nginx / Caddy | Upload `index.html` and `images/` and serve |

No env vars, no build step, no Node.js runtime required.

## Project structure

```
.
├── index.html          # The whole page — CHANGE FREELY (see "MUST NOT change" above)
├── images/             # Screenshots used in README only
├── README.md           # User-facing docs
└── .gitignore
```

## Common tasks

- **Translate the page**: edit text in `index.html`. Nothing else generates user-visible strings.
- **Change branding**: edit `index.html`. Replace the checkmark SVG, swap colors, drop in a logo.
- **Use a different Stripe param name**: rename `session_id` everywhere — Stripe success URL and `index.html`'s `params.get(...)`.
- **Disable the manual fallback**: delete the `<details>` block whose summary says "Activate manually" in `index.html`.
- **Add a welcome video**: set `WELCOME_VIDEO_URL` to a YouTube, Vimeo, or `.mp4` URL.

## Why this exists (background)

BuddyPro owners sell Telegram bot access via Stripe. After payment, the buyer needs an activation link of the form `https://t.me/{bot}?start=STRIPE_{checkout_session_id}` to redeem their purchase inside Telegram. That link is also emailed, but emails sometimes land in spam — so this page acts as a reliable, brandable, copyable backup directly on the Stripe success URL.

The page used to be a Nitro server that called the Stripe API to derive an invoice / payment-intent ID from the session. BuddyPro now accepts the checkout session ID directly, so the server is gone — the page just reads the `session_id` from the URL and builds the link client-side.
