# BuddyPro Stripe Thanks Page

A drop-in branded thank-you page that BuddyPro owners use as their Stripe Checkout success URL. After a buyer completes payment, they land here and get a one-click button to activate their access in Telegram.

It's a single static HTML file — no server, no build step, no dependencies. Drop it on any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3, your own nginx — anywhere).

![Thanks page UI](./images/ui.png)

## How it works

1. In your Stripe payment link, edit it and on the **After payment** tab choose **Don't show confirmation page**, then enter your deployed thanks-page URL:
   ```
   https://thanks.buddypro.ai/?session_id={CHECKOUT_SESSION_ID}
   ```
   (Replace the domain with wherever you deploy this. The `{CHECKOUT_SESSION_ID}` placeholder is filled by Stripe automatically — see [Stripe docs on `success_url`](https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-success_url).)

   ![Stripe payment link – After payment configuration](./images/edit-payment-link.png)

2. After payment, the buyer lands on the thanks page.
3. The page reads the `session_id` query param and builds the activation link client-side:
   ```
   https://t.me/{BOT_USERNAME}?start=STRIPE_{checkout_session_id}
   ```
4. The buyer clicks the **Open in Telegram** button and is dropped into your bot with the activation code prefilled. BuddyPro recognizes the session ID and activates the purchase.

## Setup

Open `index.html` and edit the two constants near the top of the `<script>` block:

```js
const BOT_USERNAME = "your_bot_username";   // Your Telegram bot username, no leading @
const WELCOME_VIDEO_URL = "";                // Optional: YouTube/Vimeo/.mp4 URL, or "" to hide
```

That's it. There's nothing else to configure.

To preview locally:

```bash
cd connectors/buddypro-stripe-thanks-page
python3 -m http.server 3000
# → open http://localhost:3000/?session_id=cs_test_anything
```

The page will accept any `session_id` value — it doesn't validate against Stripe — and build the link from it.

## Deploying

Anywhere that serves static files. A few one-liners:

| Platform           | Command                                    |
| ------------------ | ------------------------------------------ |
| Vercel             | `npx vercel --prod`                        |
| Netlify            | `npx netlify deploy --prod --dir .`        |
| Cloudflare Pages   | `npx wrangler pages deploy .`              |
| GitHub Pages       | Push to a repo, enable Pages on `main /`   |
| S3 / nginx / Caddy | Upload `index.html` and `images/` and serve |

No env vars, no build step, no Node.js runtime needed.

## Customizing the page

Edit `index.html` directly — it's intentionally a single self-contained file. Tailwind is loaded via CDN, so all the classes work out of the box. Replace the heading, swap the icon, drop in your own logo, change colors, translate the copy.

The only things the inline script needs to keep working are the element IDs:
- `#success`, `#error`, `#error-message` — top-level state containers
- `#activate-btn`, `#activation-url`, `#manual-command`, `#bot-handle`
- `#welcome-video-section`, `#welcome-video-container`
- `.copy-btn` with `data-copy-target="<id>"`

## Open source

This connector is meant to be forked and self-deployed. Owners who want full control over their checkout flow can:

1. Fork the repo
2. Edit `index.html` to match their brand and set their bot username
3. Deploy to their own domain

No backend, no secrets, no API keys. The Stripe checkout session ID is the only thing that flows through, and Stripe already exposes that to the buyer's browser.

## Security notes

- Nothing secret lives in this page. It's pure static HTML + a tiny client-side script.
- The activation code (`STRIPE_<session_id>`) is single-use on BuddyPro's side: whichever Telegram account redeems it first claims the purchase. If a buyer accidentally shares their thanks-page URL, the activation is still bound to the redeemer.
