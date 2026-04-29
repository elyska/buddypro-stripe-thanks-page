import type Stripe from 'stripe';

/**
 * Derive the BuddyPro activation ID from a Stripe checkout session.
 *
 * Mirrors the routing logic in BuddyPro's stripeWebhook.ts:
 *   - When invoicing is enabled (subscription, or one-off with invoice_creation.enabled),
 *     the bot expects the **invoice ID** (in_xxx).
 *   - When the session is a one-off without invoice creation, the bot expects the
 *     **payment intent ID** (pi_xxx).
 *
 * The session must be retrieved with: expand=['invoice','payment_intent','subscription'].
 */
export function deriveActivationId(session: Stripe.Checkout.Session): {
  activationId: string;
  source: 'invoice' | 'payment_intent';
} {
  const usesInvoice =
    session.mode === 'subscription' ||
    !!session.subscription ||
    !!session.invoice ||
    !!session.invoice_creation?.enabled;

  if (usesInvoice) {
    const invoiceId =
      typeof session.invoice === 'string' ? session.invoice : session.invoice?.id;
    if (!invoiceId) {
      throw new Error(
        'Session indicates invoicing is enabled but no invoice ID is present yet. ' +
          'The invoice may not have been finalized — try again in a few seconds.',
      );
    }
    return { activationId: invoiceId, source: 'invoice' };
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) {
    throw new Error('Session has no payment_intent and no invoice — cannot derive activation ID.');
  }
  return { activationId: paymentIntentId, source: 'payment_intent' };
}

export function buildActivationUrl(botUsername: string, activationId: string): string {
  return `https://t.me/${botUsername}?start=STRIPE_${activationId}`;
}
