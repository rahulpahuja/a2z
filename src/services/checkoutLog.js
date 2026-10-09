import { push, ref, serverTimestamp, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { logPaymentFailure } from './analytics.js';

const ROOT = 'checkoutFailures';

// A checkout that breaks after Razorpay has captured the payment costs the
// customer real money and leaves nothing behind — no order, no stock
// reservation, no coupon usage — so a message in their browser console is
// worthless to us. Record it where an admin can reconcile it against the
// Razorpay dashboard. Declined cards are not logged here: they're routine,
// nothing was captured, and they'd bury the failures that matter.
//
// Never throws and never rejects. Every caller is already inside a catch
// block handling the real error, and a logger that can fail is one more
// thing to debug at the worst possible moment.
export function logCheckoutFailure({ stage, error, paymentId = null, orderId = null, amount = null }) {
  console.error(`Checkout failed at "${stage}":`, error);
  logPaymentFailure(stage, amount);

  if (!isFirebaseEnabled) return Promise.resolve();

  const entry = {
    stage,
    message: error?.message || String(error ?? 'Unknown error'),
    code: error?.code ?? null,
    paymentId,
    orderId,
    amount,
    url: typeof window === 'undefined' ? null : window.location.href,
    userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  };

  // Keyed by payment id where there is one, so a customer retrying the same
  // captured payment updates their entry instead of leaving a second row to
  // reconcile against the same charge.
  const write = paymentId ? set(ref(db, `${ROOT}/${paymentId}`), entry) : push(ref(db, ROOT), entry);
  return Promise.resolve(write).catch((err) => {
    console.error('Could not record the checkout failure:', err);
  });
}
