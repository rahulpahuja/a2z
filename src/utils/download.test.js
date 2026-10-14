import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeFilename, downloadBlob, downloadUrl } from './download.js';

describe('sanitizeFilename', () => {
  it('leaves an ordinary name untouched', () => {
    expect(sanitizeFilename('orders-2026-05-01.csv')).toBe('orders-2026-05-01.csv');
  });

  it('replaces path separators and Windows-reserved characters', () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j.png')).toBe('a_b_c_d_e_f_g_h_i_j.png');
  });

  it('neutralises path traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('_.._etc_passwd');
    expect(sanitizeFilename('../secret.txt')).toBe('_secret.txt');
  });

  it('strips control characters and collapses whitespace', () => {
    expect(sanitizeFilename('a\u0000b\nc\t d   e.txt')).toBe('a_b_c_ d e.txt');
  });

  it('drops leading dots and trailing dots/spaces', () => {
    expect(sanitizeFilename('...hidden.txt')).toBe('hidden.txt');
    expect(sanitizeFilename('name. . ')).toBe('name');
  });

  it('falls back when nothing usable is left', () => {
    expect(sanitizeFilename('')).toBe('download');
    expect(sanitizeFilename(null)).toBe('download');
    expect(sanitizeFilename(undefined, 'orders.csv')).toBe('orders.csv');
    expect(sanitizeFilename('...')).toBe('download');
  });

  it('keeps unicode names', () => {
    expect(sanitizeFilename('ऑर्डर-₹500.csv')).toBe('ऑर्डर-₹500.csv');
  });

  it('truncates overlong names but preserves the extension', () => {
    const result = sanitizeFilename(`${'a'.repeat(400)}.csv`);
    expect(result.length).toBeLessThanOrEqual(150);
    expect(result.endsWith('.csv')).toBe(true);
  });
});

describe('downloadBlob', () => {
  let clicked;

  beforeEach(() => {
    vi.useFakeTimers();
    clicked = [];
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clicked.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a sanitised anchor, removes it, and revokes the URL after a delay', () => {
    downloadBlob(new Blob(['x']), 'a/b.csv');
    expect(clicked).toEqual([{ href: 'blob:mock', download: 'a_b.csv', attached: true }]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('still cleans up when the click throws', () => {
    HTMLAnchorElement.prototype.click.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => downloadBlob(new Blob(['x']), 'f.csv')).toThrow('blocked');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});

describe('downloadUrl', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches the blob, appends an extension from its MIME type, and reports success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x'], { type: 'image/webp' }) })));
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      downloads.push(this.download);
    });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await expect(downloadUrl('https://cdn.example.com/p', 'photo')).resolves.toBe(true);
    expect(downloads).toEqual(['photo.webp']);
    expect(open).not.toHaveBeenCalled();
  });

  it('falls back to a new tab and calls onFallback when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onFallback = vi.fn();
    await expect(downloadUrl('https://cdn.example.com/p.png', 'p', { onFallback })).resolves.toBe(false);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://cdn.example.com/p.png', '_blank', 'noopener');
  });

  it('never opens a non-http(s) URL in the fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('bad');
    }));
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await expect(downloadUrl('javascript:alert(1)', 'x')).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
