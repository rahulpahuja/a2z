// Exchanges a verified MSG91 OTP access token for a Firebase custom token.
//
// The phone number is taken ONLY from MSG91's server-side verification result,
// never from the request body. Two kinds of token are minted:
//   - admin phones (ADMIN_PHONES): uid `msg91:<digits>` with the `admin` claim
//     that database.rules.json checks for every admin write (unchanged).
//   - every other verified phone: uid `c_<hmac>` with the `customer` claim. The uid
//     is an HMAC-SHA256 of the normalized phone keyed with CUSTOMER_UID_SECRET, so
//     it is stable across devices but cannot be reversed or enumerated back to a
//     phone number without the secret. Orders store it as `ownerUid`.
// If CUSTOMER_UID_SECRET is not set, customers get no token (503) and the storefront
// carries on exactly as it did before customers had a Firebase identity.
import { createHmac } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const MSG91_VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';
const MAX_BODY_BYTES = 4096;
const MAX_ACCESS_TOKEN_LENGTH = 2048;
// Best-effort throttle per warm function instance (Netlify functions are stateless, so
// this only slows a single instance down; MSG91 remains the real gate on token validity).
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateBuckets = new Map();

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

function isRateLimited(key, now = Date.now()) {
  if (rateBuckets.size > 5000) rateBuckets.clear();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function isAdminPhone(phoneDigits) {
  const allowList = (process.env.ADMIN_PHONES || '').split(',').map(digitsOnly).filter(Boolean);
  return allowList.some((adminDigits) => phoneDigits.endsWith(adminDigits) || adminDigits.endsWith(phoneDigits));
}

// 10-digit national numbers are treated as Indian so "9876543210" and "919876543210"
// map to the same customer.
export function normalizePhoneDigits(phoneDigits) {
  return phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
}

export function deriveCustomerUid(phoneDigits, secret) {
  const mac = createHmac('sha256', secret).update(`a2z-customer-v1:${normalizePhoneDigits(phoneDigits)}`).digest('base64url');
  return `c_${mac.slice(0, 32)}`;
}

function getFirebaseAuth() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getAuth();
}

async function verifyMsg91AccessToken(accessToken) {
  const response = await fetch(MSG91_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authkey: process.env.MSG91_AUTH_KEY, 'access-token': accessToken }),
  });
  const text = await response.text();
  // Status only: the response body contains the customer's phone number.
  console.error('MSG91 verifyAccessToken status', response.status);
  const data = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();
  return response.ok && data?.type === 'success' ? data : null;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const headers = event.headers || {};
  const clientIp = headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || 'unknown';
  if (isRateLimited(String(clientIp).split(',')[0].trim())) return json(429, { error: 'Too many requests' });

  const rawBody = event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return json(413, { error: 'Request too large' });

  let accessToken;
  try {
    // Any client-supplied phoneNumber is deliberately ignored.
    ({ accessToken } = JSON.parse(rawBody || '{}'));
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  if (typeof accessToken !== 'string' || !accessToken || accessToken.length > MAX_ACCESS_TOKEN_LENGTH) {
    return json(400, { error: 'accessToken is required' });
  }

  const verified = await verifyMsg91AccessToken(accessToken);
  if (!verified) return json(401, { error: 'OTP verification failed', reason: 'msg91_rejected' });
  // Fail closed: the verified identifier must be a phone number.
  const identifier = String(verified.message ?? '');
  const phoneDigits = digitsOnly(identifier);
  if (!/^\+?[\d\s-]+$/.test(identifier) || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return json(401, { error: 'OTP verification failed', reason: 'msg91_no_phone' });
  }

  const admin = isAdminPhone(phoneDigits);
  let uid;
  let claims;
  if (admin) {
    uid = `msg91:${phoneDigits}`;
    claims = { admin: true };
  } else {
    const secret = process.env.CUSTOMER_UID_SECRET;
    if (!secret || secret.length < 16) return json(503, { error: 'Customer sign-in is not configured', reason: 'customer_identity_disabled' });
    uid = deriveCustomerUid(phoneDigits, secret);
    claims = { customer: true };
  }

  try {
    const token = await getFirebaseAuth().createCustomToken(uid, claims);
    return json(200, { token, role: admin ? 'admin' : 'customer' });
  } catch (error) {
    console.error('Firebase createCustomToken failed', error);
    return json(500, { error: 'Token creation failed', reason: 'firebase_error', detail: error.message });
  }
};
