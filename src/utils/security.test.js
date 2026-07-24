import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  escapeHtml,
  isValidEmail,
  isValidIndianPhone,
  isValidGstNumber,
  isValidAmount,
  sanitizeShippingForm,
} from './security.js';

describe('sanitizeText', () => {
  it('strips HTML/script tags', () => {
    expect(sanitizeText('<script>alert(1)</script>Hello')).toBe('alert(1)Hello');
    expect(sanitizeText('<b>bold</b> text')).toBe('bold text');
  });

  it('strips control characters and collapses whitespace', () => {
    expect(sanitizeText('a\x00b\x1Fc')).toBe('a b c');
    expect(sanitizeText('too    many   spaces')).toBe('too many spaces');
  });

  it('trims leading/trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('truncates to maxLength', () => {
    expect(sanitizeText('abcdefgh', { maxLength: 4 })).toBe('abcd');
  });

  it('returns an empty string for non-string input', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(42)).toBe('');
    expect(sanitizeText({})).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<div class="x">a & b's</div>`)).toBe(
      '&lt;div class=&quot;x&quot;&gt;a &amp; b&#39;s&lt;/div&gt;'
    );
  });

  it('returns an empty string for non-string input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(5)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('accepts well-formed emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.example.co.in')).toBe(true);
  });

  it('rejects malformed emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it('rejects overly long input', () => {
    expect(isValidEmail(`${'a'.repeat(260)}@example.com`)).toBe(false);
  });
});

describe('isValidIndianPhone', () => {
  it('accepts a 10-digit number starting with 6-9', () => {
    expect(isValidIndianPhone('9876543210')).toBe(true);
    expect(isValidIndianPhone('6000000000')).toBe(true);
  });

  it('rejects wrong length or leading digit', () => {
    expect(isValidIndianPhone('12345')).toBe(false);
    expect(isValidIndianPhone('5876543210')).toBe(false);
    expect(isValidIndianPhone('98765432100')).toBe(false);
    expect(isValidIndianPhone('abcdefghij')).toBe(false);
    expect(isValidIndianPhone(null)).toBe(false);
  });
});

describe('isValidGstNumber', () => {
  it('accepts a well-formed 15-character GSTIN', () => {
    expect(isValidGstNumber('27ABCDE1234F1Z5')).toBe(true);
  });

  it('rejects malformed GSTINs', () => {
    expect(isValidGstNumber('not-a-gst-number')).toBe(false);
    expect(isValidGstNumber('27ABCDE1234F1Z')).toBe(false);
    expect(isValidGstNumber('')).toBe(false);
  });
});

describe('isValidAmount', () => {
  it('accepts finite numbers within range', () => {
    expect(isValidAmount(500)).toBe(true);
    expect(isValidAmount('500')).toBe(true);
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(1_000_000)).toBe(true);
  });

  it('rejects out-of-range, non-numeric, and non-finite values', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-50)).toBe(false);
    expect(isValidAmount(1_000_001)).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
    expect(isValidAmount(Infinity)).toBe(false);
  });

  it('honors custom bounds', () => {
    expect(isValidAmount(50, { min: 100 })).toBe(false);
    expect(isValidAmount(50, { max: 40 })).toBe(false);
  });
});

describe('sanitizeShippingForm', () => {
  it('sanitizes free-text fields and leaves the rest untouched', () => {
    const form = {
      firstName: '<b>Rahul</b>',
      lastName: 'Pahuja  ',
      address: '123 Main St\x00<script>evil()</script>',
      apartment: 'Flat 4B',
      city: 'Mumbai',
      state: 'MH',
      zip: '400001',
      phone: '9876543210',
      gstNumber: '27abcde1234f1z5',
      referredBy: 'Friend',
    };

    const result = sanitizeShippingForm(form);

    expect(result.firstName).toBe('Rahul');
    expect(result.lastName).toBe('Pahuja');
    expect(result.address).toBe('123 Main St evil()');
    expect(result.gstNumber).toBe('27ABCDE1234F1Z5');
    // untouched fields
    expect(result.city).toBe('Mumbai');
    expect(result.state).toBe('MH');
    expect(result.phone).toBe('9876543210');
    expect(result.referredBy).toBe('Friend');
  });

  it('truncates fields that exceed their max length', () => {
    const form = { firstName: 'a'.repeat(100), gstNumber: 'x'.repeat(50) };
    const result = sanitizeShippingForm(form);
    expect(result.firstName.length).toBe(60);
    expect(result.gstNumber.length).toBe(15);
  });
});
