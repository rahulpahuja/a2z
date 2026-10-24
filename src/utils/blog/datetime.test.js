import { describe, it, expect } from 'vitest';
import { fromLocalInput, toLocalInput } from './datetime.js';

describe('datetime-local helpers', () => {
  it('round-trips a local time to the minute', () => {
    const ms = new Date(2026, 9, 24, 15, 30).getTime();
    expect(toLocalInput(ms)).toBe('2026-10-24T15:30');
    expect(fromLocalInput('2026-10-24T15:30')).toBe(ms);
  });
  it('treats empty and malformed values as no date', () => {
    for (const bad of ['', null, undefined, 'tomorrow', '2026-10-24', '2026-13-45T99:99']) expect(fromLocalInput(bad)).toBeNull();
    for (const bad of [0, -1, NaN, null, undefined]) expect(toLocalInput(bad)).toBe('');
  });
});
