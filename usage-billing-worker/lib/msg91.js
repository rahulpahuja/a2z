// MSG91 doesn't expose a spend/usage-over-time API with a plain authkey — the
// closest signal available is the current wallet balance. type=4 is the
// transactional SMS route; change it if this account uses a different route.
export async function getMsg91Usage(env) {
  if (!env.MSG91_AUTH_KEY) throw new Error('MSG91_AUTH_KEY not set');

  const url = `https://control.msg91.com/api/balance.php?authkey=${encodeURIComponent(env.MSG91_AUTH_KEY)}&type=4`;
  const response = await fetch(url);
  const text = (await response.text()).trim();

  if (!response.ok || /invalid|error|fail/i.test(text)) {
    throw new Error(`MSG91 balance check failed: ${text}`);
  }

  const balance = Number(text);
  return {
    wallet_balance: Number.isFinite(balance) ? balance : text,
    currency: 'INR',
    note: 'This is remaining wallet balance, not spend — MSG91 has no simple usage-over-time API for a plain authkey.',
  };
}
