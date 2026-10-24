import { describe, it, expect } from 'vitest';
import { MAX_FOOTER_TEXT_LENGTH, sanitizeFooterText, isFooterNotePath } from './footerText.js';

describe('sanitizeFooterText', () => {
  it('returns an empty string for non-strings and blank input', () => {
    expect(sanitizeFooterText(undefined)).toBe('');
    expect(sanitizeFooterText(null)).toBe('');
    expect(sanitizeFooterText(42)).toBe('');
    expect(sanitizeFooterText({ a: 1 })).toBe('');
    expect(sanitizeFooterText('   \n\t  ')).toBe('');
  });

  it('keeps markup as literal text rather than stripping or interpreting it', () => {
    expect(sanitizeFooterText('<b>Sale</b> & <script>x</script>')).toBe('<b>Sale</b> & <script>x</script>');
  });

  it('normalizes line endings, trailing spaces and runs of blank lines', () => {
    expect(sanitizeFooterText('a  \r\nb\r\n\r\n\r\n\r\nc')).toBe('a\nb\n\nc');
  });

  it('removes control, zero-width and bidi-override characters but keeps emoji and ₹', () => {
    expect(sanitizeFooterText('a\u0000b​c‮d\u0007e')).toBe('abcde');
    expect(sanitizeFooterText('Sale ₹999 🎉')).toBe('Sale ₹999 🎉');
  });

  it('caps the length and does not leave trailing whitespace at the cut', () => {
    const long = 'x'.repeat(MAX_FOOTER_TEXT_LENGTH - 1) + ' ' + 'y'.repeat(50);
    const out = sanitizeFooterText(long);
    expect(out.length).toBeLessThanOrEqual(MAX_FOOTER_TEXT_LENGTH);
    expect(out).toBe(out.trim());
  });
});

describe('isFooterNotePath', () => {
  it('shows on customer pages, including unknown routes', () => {
    ['/', '/products', '/products/abc', '/cart', '/checkout/payment', '/nope', ''].forEach((p) =>
      expect(isFooterNotePath(p)).toBe(true)
    );
  });

  it('hides on super-user and dashboard pages only', () => {
    ['/super', '/super/settings', '/dashboard'].forEach((p) => expect(isFooterNotePath(p)).toBe(false));
    expect(isFooterNotePath('/superb')).toBe(true);
  });
});
