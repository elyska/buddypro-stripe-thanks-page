# BuddyPro Stripe Thanks Page

A drop-in branded thank-you page that BuddyPro owners use as their Stripe Checkout success URL. After a buyer completes payment, they land here and get a one-click button to activate their access in Telegram.

It's a single static HTML file — no server, no build step, no dependencies. Drop it on any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3, your own nginx — anywhere).

![Thanks page UI](./images/ui.png)

## How it works

1. In your Stripe payment link, edit it and on the **After payment** tab choose **Don't show confirmation page**, then enter your deployed thanks-page URL:
   ```
   https://buddypro.ai/thanks?session_id={CHECKOUT_SESSION_ID}
   ```
   (Replace the domain with wherever you deploy this. The `{CHECKOUT_SESSION_ID}` placeholder is filled by Stripe automatically — see [Stripe docs on `success_url`](https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-success_url).)

   ![Stripe payment link – After payment configuration](./images/edit-payment-link.png)

2. After payment, the buyer lands on the thanks page.
3. The page reads the `session_id` query param and POSTs it together with your connected Stripe account ID to a small BuddyPro-hosted Lambda (see **Activation API** below). The Lambda uses BuddyPro's platform Stripe key to look up the session and returns a short activation code (`STRIPE_in_…` for invoiced/subscription purchases, `STRIPE_pi_…` for one-offs).
4. The page builds the link `https://t.me/{BOT_USERNAME}?start={activation_code}`
5. The buyer clicks the **Open in Telegram** button and is dropped into your bot with the activation code ready to send. BuddyPro recognizes the code and activates the purchase.

## Activation API

The page calls a single BuddyPro-hosted endpoint that resolves a Stripe checkout session ID into a short activation code. It exists because Telegram's `?start=` payload is capped at 64 chars, while Stripe checkout session IDs alone are ~66 chars — too long. Stripe invoice IDs (`in_…`) and payment intent IDs (`pi_…`) are ~25–27 chars, so the resulting `STRIPE_<id>` activation code fits comfortably under the limit.

**Endpoint:** `POST https://dhnjsn2szoce3hxgen7rnf4usu0epjee.lambda-url.eu-central-1.on.aws/`
**Auth:** none — the only inputs are the Stripe checkout session ID (which Stripe already exposes to the buyer's browser) and the public connected account ID.
**CORS:** open to all origins.

### Request

```bash
curl -X POST https://dhnjsn2szoce3hxgen7rnf4usu0epjee.lambda-url.eu-central-1.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "cs_live_a1b2c3...",
    "accountId":  "acct_1SmGpbLHHwsRli8Q"
  }'
```

| Field        | Type   | Description                                                                                       |
| ------------ | ------ | ------------------------------------------------------------------------------------------------- |
| `session_id` | string | The Stripe checkout session ID (the `cs_live_…` / `cs_test_…` value Stripe puts in `success_url`).|
| `accountId`  | string | Your connected Stripe account ID (`acct_…`) — the account that owns the session.                  |

### Response

`200 OK`:
```json
{
  "activationCode": "STRIPE_in_1Abc..."
}
```

The returned `activationCode` is `STRIPE_in_…` for subscriptions and invoiced one-off charges, or `STRIPE_pi_…` for plain one-off charges.

### Errors

All errors return JSON of the form `{ "error": "<message>" }`:

| Status | Meaning                                                                              |
| ------ | ------------------------------------------------------------------------------------ |
| 400    | `session_id` or `accountId` missing/invalid in the request body.                      |
| 404    | Stripe doesn't recognize the session for this connected account.                      |
| 422    | Session exists but no invoice or payment intent ID is available yet (try again).      |
| 502    | Upstream Stripe error.                                                                |

## Setup

Open `index.html` and edit the constants near the top of the `<script>` block:

```js
const BOT_USERNAME = "your_bot_username";       // Your Telegram bot username, no leading @
const STRIPE_ACCOUNT_ID = "acct_xxxxxxxxxxxx";  // Your connected Stripe account ID
const WELCOME_VIDEO_URL = "";                    // Optional: YouTube/Vimeo/.mp4 URL, or "" to hide
```

That's it. There's nothing else to configure. The activation API URL is hardcoded to BuddyPro's Lambda — every fork shares it.

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
