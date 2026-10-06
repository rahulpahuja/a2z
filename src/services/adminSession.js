// Trades a verified MSG91 OTP for a Firebase custom token so admin writes pass
// database.rules.json. Resolves null for non-admin phones (403) so customers keep
// their local session without a Firebase identity.
export async function fetchAdminFirebaseToken(accessToken, phoneNumber) {
  const response = await fetch('/.netlify/functions/exchange-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, phoneNumber }),
  });
  if (response.status === 403) return null;
  if (!response.ok) {
    const { reason, detail } = await response.json().catch(() => ({}));
    throw new Error(`Admin sign-in failed (${[reason, detail].filter(Boolean).join(': ') || response.status}).`);
  }
  const { token } = await response.json();
  return token;
}
