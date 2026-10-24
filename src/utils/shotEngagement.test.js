import { describe, it, expect } from 'vitest';
import { formatCount } from './formatCount.js';
import { buildShotUrl, isValidShotId, parseShotParam, shareLink, shotProductId } from './shotShare.js';

describe('formatCount', () => {
  it.each([
    [0, '0'], [-5, '0'], [NaN, '0'], [undefined, '0'], [7, '7'], [999, '999'],
    [1000, '1K'], [1250, '1.2K'], [9999, '9.9K'], [15300, '15K'], [999999, '999K'],
    [1_000_000, '1M'], [2_400_000, '2.4M'], [12_345_678, '12M'],
  ])('%s -> %s', (input, output) => expect(formatCount(input)).toBe(output));
});

describe('shot links', () => {
  it('builds and parses a share URL', () => {
    const url = buildShotUrl('prod_123_abc_0', 'https://www.thea2zcollection.com/');
    expect(url).toBe('https://www.thea2zcollection.com/shots?v=prod_123_abc_0');
    expect(parseShotParam(`?v=prod_123_abc_0&utm_source=x`)).toBe('prod_123_abc_0');
  });

  it('rejects ids that are missing or could not be a shot', () => {
    for (const bad of ['', '?v=', '?v=../etc', '?v=a b', `?v=${'x'.repeat(200)}`, '?other=1']) expect(parseShotParam(bad)).toBeNull();
    expect(isValidShotId(5)).toBe(false);
  });

  it('finds the product a shot belongs to', () => {
    expect(shotProductId('prod_1791_abc_2')).toBe('prod_1791_abc');
    expect(shotProductId('12_0')).toBe('12');
    expect(shotProductId('noindex')).toBeNull();
    expect(shotProductId(null)).toBeNull();
  });
});

describe('shareLink', () => {
  const payload = { title: 'T', text: 'x', url: 'https://x.test/shots?v=a_0' };

  it('uses the native share sheet when available', async () => {
    const nav = { share: async () => {} };
    expect(await shareLink(payload, nav)).toBe('shared');
  });

  it('reports a dismissed share sheet as cancelled, without copying', async () => {
    let copied = false;
    const nav = {
      share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); },
      clipboard: { writeText: async () => { copied = true; } },
    };
    expect(await shareLink(payload, nav)).toBe('cancelled');
    expect(copied).toBe(false);
  });

  it('falls back to copying when sharing is unsupported or fails', async () => {
    let copied = '';
    const clipboard = { writeText: async (t) => { copied = t; } };
    expect(await shareLink(payload, { clipboard })).toBe('copied');
    expect(copied).toBe(payload.url);
    expect(await shareLink(payload, { share: async () => { throw new Error('NotAllowed'); }, clipboard })).toBe('copied');
  });

  it('fails cleanly when nothing is available', async () => {
    expect(await shareLink(payload, {})).toBe('failed');
    expect(await shareLink(payload, { clipboard: { writeText: async () => { throw new Error('no'); } } })).toBe('failed');
  });
});
