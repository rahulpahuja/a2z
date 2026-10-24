import { describe, it, expect } from 'vitest';
import { describeAddress, findSameAddress, nextAddressLabel, sameAddress } from './addresses.js';

const a = { id: '1', label: 'Home', firstName: 'Priya', address: '12 MG Road', apartment: 'Flat 4', city: 'Indore', state: 'MP', zip: '452001', phone: '9876543210' };

describe('sameAddress', () => {
  it('ignores case, punctuation, name and label', () => {
    expect(sameAddress(a, { ...a, id: '2', label: 'Work', firstName: 'Someone', address: '12, mg road.' })).toBe(true);
  });
  it('tells different places or phones apart', () => {
    expect(sameAddress(a, { ...a, zip: '452002' })).toBe(false);
    expect(sameAddress(a, { ...a, apartment: 'Flat 5' })).toBe(false);
    expect(sameAddress(a, { ...a, phone: '9876543211' })).toBe(false);
    expect(sameAddress(a, null)).toBe(false);
  });
  it('finds a match in a list', () => {
    expect(findSameAddress([{ ...a, id: 'x', zip: '1' }, a], { ...a, id: undefined })).toBe(a);
    expect(findSameAddress(undefined, a)).toBeNull();
  });
});

describe('nextAddressLabel', () => {
  it('starts with Home and then numbers, never repeating a label', () => {
    expect(nextAddressLabel([])).toBe('Home');
    expect(nextAddressLabel([{ label: 'Home' }])).toBe('Address 2');
    expect(nextAddressLabel([{ label: 'Home' }, { label: 'address 2' }])).toBe('Address 3');
    expect(nextAddressLabel([{ label: 'Work' }])).toBe('Home');
  });
});

describe('describeAddress', () => {
  it('summarises on two short lines', () => {
    expect(describeAddress(a)).toEqual({ name: 'Priya', line: '12 MG Road, Flat 4, Indore, 452001', phone: '9876543210' });
    expect(describeAddress(undefined)).toEqual({ name: '', line: '', phone: '' });
  });
});
