// Helpers for the checkout address picker: telling two addresses apart, naming a new one, and a one-line summary.

const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// The same delivery spot, ignoring name, label, case and punctuation. Used so choosing "save this address" for
// a place already saved does not create a duplicate.
export function sameAddress(a, b) {
  if (!a || !b) return false;
  return ['address', 'apartment', 'city', 'state', 'zip'].every((key) => norm(a[key]) === norm(b[key])) && String(a.phone ?? '') === String(b.phone ?? '');
}

export function findSameAddress(addresses, candidate) {
  return (addresses ?? []).find((a) => sameAddress(a, candidate)) ?? null;
}

// 'Home' for the first address, then 'Address 2', 'Address 3', skipping any label already taken.
export function nextAddressLabel(addresses) {
  const taken = new Set((addresses ?? []).map((a) => norm(a.label)));
  if (!taken.has('home')) return 'Home';
  for (let n = (addresses ?? []).length + 1; n < 1000; n += 1) {
    if (!taken.has(norm(`Address ${n}`))) return `Address ${n}`;
  }
  return 'Address';
}

export function describeAddress(addr) {
  const name = [addr?.firstName, addr?.lastName].filter(Boolean).join(' ');
  const line = [addr?.address, addr?.apartment, addr?.city, addr?.zip].filter(Boolean).join(', ');
  return { name, line, phone: addr?.phone ?? '' };
}
