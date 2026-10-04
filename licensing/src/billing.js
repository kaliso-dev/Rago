// Stripe Checkout and webhooks.
import Stripe from 'stripe';
import { fulfillCheckoutSession, revokeByPaymentIntent } from './licensing.js';

export function createStripe(cfg) {
  return cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null;
}

export async function createCheckout(stripe, cfg, user) {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: cfg.stripePriceId, quantity: 1 }],
    success_url: `${cfg.publicUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cfg.cancelUrl,
    customer_email: user?.email,
    client_reference_id: user?.id,
    customer_creation: 'always',
    allow_promotion_codes: true,
    metadata: { product: 'rago-hub-premium' },
    payment_intent_data: { metadata: { product: 'rago-hub-premium' } },
    custom_text: {
      submit: { message: 'Rago Hub Premium works on one Windows PC per license. You create your account right after paying.' },
    },
  });
}

/**
 * Handles a verified Stripe event. Returns a short label for logs.
 * `onLicense(license, claimToken)` runs when a new license was created (to send the email).
 */
export async function handleStripeEvent(db, event, { onLicense } = {}) {
  const seen = db.prepare('SELECT 1 FROM stripe_events WHERE id = ?').get(event.id);
  if (seen) return 'duplicate';
  let label = 'ignored';
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const out = fulfillCheckoutSession(db, obj);
      if (out.created && onLicense) await onLicense(out.license, out.claimToken);
      label = out.created ? 'license_created' : out.license ? 'license_exists' : 'unpaid';
      break;
    }
    case 'charge.refunded': {
      // Full refunds only; a partial refund (e.g. a goodwill discount) keeps the license.
      if (obj.refunded && obj.payment_intent) {
        label = `revoked:${revokeByPaymentIntent(db, String(obj.payment_intent), 'refunded')}`;
      }
      break;
    }
    case 'charge.dispute.created': {
      if (obj.payment_intent) label = `revoked:${revokeByPaymentIntent(db, String(obj.payment_intent), 'disputed')}`;
      break;
    }
  }
  // Recorded after handling: if handling throws, Stripe retries and we try again.
  db.prepare('INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)').run(event.id, event.type, Date.now());
  return label;
}
