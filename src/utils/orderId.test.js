import { describe, it, expect } from 'vitest';
import { generateOrderId } from './orderId.js';

describe('generateOrderId', () => {
  it('keeps the ORD- prefix and a database-key-safe, uppercase alphanumeric shape', () => {
    expect(generateOrderId()).toMatch(/^ORD-[0-9A-Z]{14,}$/);
  });

  it('starts with the base36 timestamp so ids stay roughly sortable', () => {
    const now = Date.UTC(2026, 0, 1);
    expect(generateOrderId(now).startsWith(`ORD-${now.toString(36).toUpperCase()}`)).toBe(true);
  });

  it('adds 12 random characters after the timestamp', () => {
    const now = Date.UTC(2026, 0, 1);
    const stamp = now.toString(36).toUpperCase();
    expect(generateOrderId(now).slice(`ORD-${stamp}`.length)).toHaveLength(12);
  });

  it('never repeats for the same millisecond', () => {
    const now = Date.now();
    const ids = new Set(Array.from({ length: 2000 }, () => generateOrderId(now)));
    expect(ids.size).toBe(2000);
  });
});
