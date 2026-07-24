export function buildWhatsAppLink(number, message) {
  let clean = (number || '').replace(/\D/g, '');
  if (clean.length === 10) clean = '91' + clean;
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
