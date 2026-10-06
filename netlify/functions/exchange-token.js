// Exchanges a verified MSG91 OTP access token for a Firebase custom token.
// Only admin phones (ADMIN_PHONES, server-side) receive a token, and it carries
// the `admin` claim that database.rules.json checks for every admin write.
import admin from 'firebase-admin';

const MSG91_VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

function isAdminPhone(phoneDigits) {
  const allowList = (process.env.ADMIN_PHONES || '').split(',').map(digitsOnly).filter(Boolean);
  return allowList.some((adminDigits) => phoneDigits.endsWith(adminDigits) || adminDigits.endsWith(phoneDigits));
}

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }
  return admin;
}

async function verifyMsg91AccessToken(accessToken) {
  const response = await fetch(MSG91_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authkey: process.env.MSG91_AUTH_KEY, 'access-token': accessToken }),
  });
  const text = await response.text();
  console.error('MSG91 verifyAccessToken', response.status, text);
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

  let accessToken;
  let phoneNumber;
  try {
    ({ accessToken, phoneNumber } = JSON.parse(event.body || '{}'));
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  if (!accessToken || !phoneNumber) return json(400, { error: 'accessToken and phoneNumber are required' });

  const phoneDigits = digitsOnly(phoneNumber);
  if (!isAdminPhone(phoneDigits)) return json(403, { error: 'Not an admin' });

  const verified = await verifyMsg91AccessToken(accessToken);
  // Fail closed: the verified identifier must be present and must be this phone.
  const verifiedDigits = digitsOnly(verified?.message);
  if (!verified) return json(401, { error: 'OTP verification failed', reason: 'msg91_rejected' });
  if (verifiedDigits !== phoneDigits) return json(401, { error: 'OTP verification failed', reason: 'msg91_phone_mismatch' });

  try {
    const uid = `msg91:${phoneDigits}`;
    const token = await getFirebaseAdmin().auth().createCustomToken(uid, { admin: true });
    return json(200, { token });
  } catch (error) {
    console.error('Firebase createCustomToken failed', error);
    return json(500, { error: 'Token creation failed', reason: 'firebase_error' });
  }
};
