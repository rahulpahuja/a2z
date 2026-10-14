import { describe, it, expect } from 'vitest';
import { getOptionalSpecs } from './productSpecs.js';

describe('getOptionalSpecs', () => {
  it('returns no rows for products without origin or care', () => {
    expect(getOptionalSpecs({ id: 'p1' })).toEqual([]);
    expect(getOptionalSpecs(undefined)).toEqual([]);
    expect(getOptionalSpecs(null)).toEqual([]);
  });

  it('returns only the rows that have a value', () => {
    expect(getOptionalSpecs({ care: 'Dry clean only' })).toEqual([{ label: 'Care', value: 'Dry clean only' }]);
    expect(getOptionalSpecs({ origin: 'Jaipur' })).toEqual([{ label: 'Origin', value: 'Jaipur' }]);
  });

  it('returns both rows in a stable order, trimmed', () => {
    expect(getOptionalSpecs({ origin: ' Jaipur ', care: ' Hand wash cold ' })).toEqual([
      { label: 'Care', value: 'Hand wash cold' },
      { label: 'Origin', value: 'Jaipur' },
    ]);
  });

  it('ignores blank and non-string values', () => {
    expect(getOptionalSpecs({ origin: '   ', care: '' })).toEqual([]);
    expect(getOptionalSpecs({ origin: 5, care: { a: 1 } })).toEqual([]);
  });
});
