import Stripe from 'stripe';
import { deriveActivationId, buildActivationUrl } from '../../utils/activation';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const stripeSecretKey = config.stripeSecretKey as string;
  const botUsername = config.botUsername as string;

  if (!stripeSecretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server misconfigured: STRIPE_SECRET_KEY not set',
    });
  }
  if (!botUsername) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server misconfigured: BOT_USERNAME not set',
    });
  }

  const { checkoutsesh } = getQuery(event);
  if (!checkoutsesh || typeof checkoutsesh !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required query param: checkoutsesh',
    });
  }

  const stripe = new Stripe(stripeSecretKey);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutsesh, {
      expand: ['invoice', 'payment_intent', 'subscription'],
    });
  } catch (err: any) {
    const code = err?.statusCode === 404 || err?.code === 'resource_missing' ? 404 : 502;
    throw createError({
      statusCode: code,
      statusMessage:
        code === 404
          ? 'Checkout session not found'
          : `Stripe error: ${err?.message ?? 'unknown'}`,
    });
  }

  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    throw createError({
      statusCode: 402,
      statusMessage: `Payment not completed (status: ${session.payment_status})`,
    });
  }

  const { activationId, source } = deriveActivationId(session);

  return {
    activationUrl: buildActivationUrl(botUsername, activationId),
    activationCode: `STRIPE_${activationId}`,
    botUsername,
    mode: session.mode,
    source,
  };
});
