import { describe, it, expect } from 'vitest';
import { buildWhatsAppLink, buildProductOrderMessage } from './whatsapp.js';

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
