// Crockford-style base32 (no I, L, O, U): 32 symbols, so a random byte can be
// masked to 5 bits with no modulo bias and the id stays easy to read out loud.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SUFFIX_LENGTH = 12; // 12 x 5 bits = 60 bits of entropy

function randomSuffix(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte & 31];
  return out;
}

// An order id doubles as the only credential for reading that order (order
// tracking is public by id, and database.rules.json lets anyone read a single
// order whose id they know), so it must not be guessable. The timestamp keeps
// ids roughly sortable and unique; the CSPRNG suffix is what makes them
// unguessable — Math.random() is neither unpredictable nor wide enough.
export function generateOrderId(now = Date.now()) {
  return `ORD-${now.toString(36).toUpperCase()}${randomSuffix(SUFFIX_LENGTH)}`;
}
