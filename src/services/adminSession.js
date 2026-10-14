// Trades a verified MSG91 OTP access token for a Firebase custom token. The server
// decides who the caller is from MSG91's own verification result (the phone number is
// never sent): admin phones get the `admin` claim so writes pass database.rules.json,
// every other phone gets a pseudonymous customer uid used as `ownerUid` on orders.
//
// Resolves { token, role } or null when the server has customer sign-in switched off
// (503), so customers keep their local session without a Firebase identity. Any other
// failure throws; callers decide whether that is fatal (admins) or ignorable (customers).
export async function fetchFirebaseSessionToken(accessToken) {
  const response = await fetch('/.netlify/functions/exchange-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  });
  if (response.status === 503) return null;
  if (!response.ok) {
    const { reason, detail } = await response.json().catch(() => ({}));
    throw new Error(`Sign-in exchange failed (${[reason, detail].filter(Boolean).join(': ') || response.status}).`);
  }
  const { token, role } = await response.json();
  return token ? { token, role: role === 'admin' ? 'admin' : 'customer' } : null;
}
