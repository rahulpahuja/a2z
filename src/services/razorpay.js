const API_BASE = import.meta.env.VITE_RAZORPAY_API_URL;
const KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const APP_KEY = import.meta.env.VITE_RAZORPAY_APP_KEY;

// Razorpay key IDs are prefixed `rzp_test_` in test mode and `rzp_live_` in
// live mode — use that to flag test-mode payment IDs when storing orders.
export const isTestMode = (KEY_ID || '').startsWith('rzp_test_');

export async function createRazorpayOrder(amountInRupees, receipt) {
  if (!API_BASE) {
    throw new Error('Razorpay is not configured. Set VITE_RAZORPAY_API_URL in .env.');
  }
  const res = await fetch(`${API_BASE}/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      receipt,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not create Razorpay order.');
  }
  return data;
}

export async function verifyRazorpayPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!API_BASE) {
    throw new Error('Razorpay is not configured. Set VITE_RAZORPAY_API_URL in .env.');
  }
  const res = await fetch(`${API_BASE}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Signature verification failed.' };
  }
  return data;
}

// Razorpay's standard fees (2% + GST) are auto-deducted per transaction —
// there's no separate bill to pay, just what they've taken. `from`/`to` are
// Date objects or ISO strings for the reporting window.
export async function getRazorpayFeesReport(from, to) {
  if (!API_BASE || !APP_KEY) {
    throw new Error('Razorpay fee reporting is not configured. Set VITE_RAZORPAY_API_URL and VITE_RAZORPAY_APP_KEY in .env.');
  }
  const params = new URLSearchParams({
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  });
  const res = await fetch(`${API_BASE}/fees-report?${params}`, {
    headers: { 'x-app-key': APP_KEY },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not load Razorpay fees report.');
  }
  return data; // { currency, count, totalAmount, totalFees, totalTax }
}

// Loaded on demand (only when the payment page is reached) instead of as a
// blocking <script> tag in index.html, which used to delay every page load
// site-wide for a dependency only the checkout flow needs.
let scriptPromise = null;
export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load the Razorpay checkout script.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export function openRazorpayCheckout({ order, name, description, prefill, onSuccess, onFailure, onDismiss }) {
  if (typeof window.Razorpay === 'undefined') {
    throw new Error('Razorpay checkout script failed to load. Check your connection and try again.');
  }
  if (!KEY_ID) {
    throw new Error('Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID in .env.');
  }

  const rzp = new window.Razorpay({
    key: KEY_ID,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name,
    description,
    prefill,
    theme: { color: '#ac2471' },
    modal: {
      ondismiss: () => onDismiss?.(),
    },
    handler: (response) => onSuccess(response),
  });

  rzp.on('payment.failed', (response) => onFailure?.(response.error));
  rzp.open();
}
