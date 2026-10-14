export function buildWhatsAppLink(number, message) {
  let clean = (number || '').replace(/\D/g, '');
  if (clean.length === 10) clean = '91' + clean;
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Prefilled "I want to order this" message for the per-product Buy on WhatsApp button.
// Price strings arrive preformatted so this stays free of currency/context imports.
export function buildProductOrderMessage({ name, url, color, size, quantity, unitPrice, total }) {
  const qty = Number(quantity) > 0 ? Number(quantity) : 1;
  const priceLine = unitPrice
    ? `Price: ${unitPrice}${qty > 1 && total ? ` each (Total: ${total})` : ''}`
    : '';
  return [
    "Hi, I'd like to order this:",
    '',
    name,
    color ? `Color: ${color}` : '',
    size ? `Size: ${size}` : '',
    `Qty: ${qty}`,
    priceLine,
    url ? `Link: ${url}` : '',
  ]
    .filter((line, i, all) => line !== '' || (i === 1 && all[i + 1] !== ''))
    .join('\n');
}
