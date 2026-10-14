export function buildWhatsAppLink(number, message) {
  let clean = (number || '').replace(/\D/g, '');
  if (clean.length === 10) clean = '91' + clean;
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// The message the per-product Buy on WhatsApp button prefills. Admins can edit it in
// Settings (store setting `whatsappOrderTemplate`); {placeholders} are filled per product.
export const DEFAULT_ORDER_TEMPLATE = `Hi, I'd like to order this:

{product}
Color: {color}
Size: {size}
Qty: {quantity}
Price: {price}
Link: {link}`;

export const MAX_ORDER_TEMPLATE_LENGTH = 1000;

export const ORDER_TEMPLATE_PLACEHOLDERS = [
  { key: 'product', description: 'Product name' },
  { key: 'color', description: 'Selected colour' },
  { key: 'size', description: 'Selected size' },
  { key: 'quantity', description: 'Quantity' },
  { key: 'price', description: 'Unit price, with the total added when quantity is more than 1' },
  { key: 'unit_price', description: 'Unit price only' },
  { key: 'total', description: 'Unit price x quantity' },
  { key: 'link', description: 'Product page link' },
];

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;
const KNOWN_PLACEHOLDERS = new Set(ORDER_TEMPLATE_PLACEHOLDERS.map(({ key }) => key));

// {names} in a template that are not one of the supported placeholders (likely typos).
export function findUnknownPlaceholders(template) {
  const found = new Set();
  for (const [, key] of String(template ?? '').matchAll(PLACEHOLDER_PATTERN)) {
    if (!KNOWN_PLACEHOLDERS.has(key)) found.add(key);
  }
  return [...found];
}

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

/**
 * Fills a template's {placeholders}. A line whose placeholder has no value (say, no colour
 * was selected) is dropped, so the message never shows "Color: ". Unknown {names} are kept
 * as typed. An empty template falls back to the default.
 * @param {unknown} template
 * @param {Record<string, unknown>} values
 */
export function renderOrderTemplate(template, values) {
  const source = typeof template === 'string' && template.trim() ? template : DEFAULT_ORDER_TEMPLATE;
  const lines = [];
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    let missing = false;
    const text = line.replace(PLACEHOLDER_PATTERN, (match, key) => {
      if (!KNOWN_PLACEHOLDERS.has(key)) return match;
      if (isBlank(values[key])) {
        missing = true;
        return '';
      }
      return String(values[key]);
    });
    if (!missing) lines.push(text.trimEnd());
  }
  return lines
    .filter((line, index) => line !== '' || (index > 0 && lines[index - 1] !== ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

// Prefilled "I want to order this" message for the per-product Buy on WhatsApp button.
// Price strings arrive preformatted so this stays free of currency/context imports.
export function buildProductOrderMessage({ name, url, color, size, quantity, unitPrice, total, template }) {
  const qty = Number(quantity) > 0 ? Number(quantity) : 1;
  const price = unitPrice ? `${unitPrice}${qty > 1 && total ? ` each (Total: ${total})` : ''}` : '';
  return renderOrderTemplate(template, {
    product: name,
    color,
    size,
    quantity: qty,
    price,
    unit_price: unitPrice,
    total,
    link: url,
  });
}
