import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppLink,
  buildProductOrderMessage,
  renderOrderTemplate,
  findUnknownPlaceholders,
  DEFAULT_ORDER_TEMPLATE,
  ORDER_TEMPLATE_PLACEHOLDERS,
} from './whatsapp.js';

describe('buildWhatsAppLink', () => {
  it('prefixes 91 to 10-digit numbers and strips punctuation', () => {
    expect(buildWhatsAppLink('96444 44661')).toBe('https://wa.me/919644444661');
  });

  it('url-encodes the message', () => {
    expect(buildWhatsAppLink('+919644444661', 'a b\nc')).toBe('https://wa.me/919644444661?text=a%20b%0Ac');
  });
});

describe('buildProductOrderMessage', () => {
  const base = {
    name: 'Silk Kurta',
    url: 'https://example.com/products/p1',
    color: 'Pink',
    size: 'M',
    quantity: 1,
    unitPrice: '₹1,299',
    total: '₹1,299',
  };

  it('includes product, variant, quantity, price and link', () => {
    const msg = buildProductOrderMessage(base);
    expect(msg).toContain('Silk Kurta');
    expect(msg).toContain('Color: Pink');
    expect(msg).toContain('Size: M');
    expect(msg).toContain('Qty: 1');
    expect(msg).toContain('Price: ₹1,299');
    expect(msg).not.toContain('Total');
    expect(msg).toContain('Link: https://example.com/products/p1');
  });

  it('shows the total when quantity is more than one', () => {
    const msg = buildProductOrderMessage({ ...base, quantity: 2, total: '₹2,598' });
    expect(msg).toContain('Qty: 2');
    expect(msg).toContain('Price: ₹1,299 each (Total: ₹2,598)');
  });

  it('omits missing optional fields and falls back to quantity 1', () => {
    const msg = buildProductOrderMessage({ name: 'Silk Kurta', quantity: 0 });
    expect(msg).not.toContain('Color:');
    expect(msg).not.toContain('Size:');
    expect(msg).not.toContain('Price:');
    expect(msg).not.toContain('Link:');
    expect(msg).toContain('Qty: 1');
  });
});

describe('renderOrderTemplate', () => {
  const values = { product: 'Silk Kurta', color: 'Pink', size: 'M', quantity: 2, price: '₹1,299', link: 'https://x/p1' };

  it('fills {placeholders} anywhere in a line', () => {
    expect(renderOrderTemplate('Hi! {product} in {color} ({size}) x{quantity} - {link}', values)).toBe(
      'Hi! Silk Kurta in Pink (M) x2 - https://x/p1',
    );
  });

  it('drops a line whose placeholder has no value, and collapses the gap it leaves', () => {
    const out = renderOrderTemplate('Hello\n\nColor: {color}\n\nSize: {size}\nBye', { ...values, color: '' });
    expect(out).toBe('Hello\n\nSize: M\nBye');
  });

  it('keeps unknown {names} as typed', () => {
    expect(renderOrderTemplate('Order {product} {oops}', values)).toBe('Order Silk Kurta {oops}');
  });

  it('falls back to the default template when the template is empty or not a string', () => {
    const expected = renderOrderTemplate(DEFAULT_ORDER_TEMPLATE, values);
    expect(renderOrderTemplate('', values)).toBe(expected);
    expect(renderOrderTemplate('   \n ', values)).toBe(expected);
    expect(renderOrderTemplate(undefined, values)).toBe(expected);
  });

  it('handles CRLF and trims leading and trailing blank lines', () => {
    expect(renderOrderTemplate('\r\n\r\nHi {product}\r\n\r\n', values)).toBe('Hi Silk Kurta');
  });

  it('does not treat values as templates (no re-expansion)', () => {
    expect(renderOrderTemplate('{product}', { ...values, product: 'A {size} B' })).toBe('A {size} B');
  });
});

describe('findUnknownPlaceholders', () => {
  it('lists unsupported {names} once each', () => {
    expect(findUnknownPlaceholders('{product} {colour} {colour} {oops}')).toEqual(['colour', 'oops']);
  });

  it('accepts every documented placeholder', () => {
    const template = ORDER_TEMPLATE_PLACEHOLDERS.map(({ key }) => `{${key}}`).join(' ');
    expect(findUnknownPlaceholders(template)).toEqual([]);
  });
});

describe('buildProductOrderMessage with a custom template', () => {
  it('uses the admin template and the same price wording', () => {
    const msg = buildProductOrderMessage({
      name: 'Silk Kurta',
      url: 'https://x/p1',
      color: 'Pink',
      size: 'M',
      quantity: 2,
      unitPrice: '₹1,299',
      total: '₹2,598',
      template: 'Namaste! {product} ({size}) {price} {unit_price} {total}',
    });
    expect(msg).toBe('Namaste! Silk Kurta (M) ₹1,299 each (Total: ₹2,598) ₹1,299 ₹2,598');
  });
});
