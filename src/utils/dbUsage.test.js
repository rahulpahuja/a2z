import { describe, it, expect } from 'vitest';
import { formatMb, toMb, usageLevel, usedPercent } from './dbUsage.js';

describe('dbUsage helpers', () => {
  it('shows decimal megabytes with two places, and never rounds a small node to nothing', () => {
    expect(formatMb(0)).toBe('0 MB');
    expect(formatMb(NaN)).toBe('0 MB');
    expect(formatMb(1_234_567)).toBe('1.23 MB');
    expect(formatMb(1_000_000_000)).toBe('1,000.00 MB');
    expect(formatMb(4_000)).toBe('< 0.01 MB');
    expect(toMb(2_500_000)).toBe(2.5);
  });

  it('caps the percentage and flags 70% and 90%', () => {
    expect(usedPercent(500_000_000, 1_000_000_000)).toBe(50);
    expect(usedPercent(2_000_000_000, 1_000_000_000)).toBe(100);
    expect(usedPercent(5, 0)).toBe(0);
    expect([69.9, 70, 89.9, 90].map(usageLevel)).toEqual(['ok', 'warn', 'warn', 'critical']);
  });
});
