import { describe, it, expect } from 'vitest';
import { getDownloadFetchUrl, getKeysToDelete, productImageCountError } from './productImages.js';

const API = 'https://uploader.example.workers.dev';
const R2_URL = 'https://pub-abc.r2.dev/prod_123_image_1.webp';

describe('getDownloadFetchUrl', () => {
  it('routes a stored r2.dev image through the upload worker by key', () => {
    expect(getDownloadFetchUrl(R2_URL, API)).toBe(`${API}/prod_123_image_1.webp`);
  });

  it('ignores trailing slashes on the worker url and keeps the key encoded exactly once', () => {
    expect(getDownloadFetchUrl('https://pub-abc.r2.dev/a b.webp', `${API}//`)).toBe(`${API}/a%20b.webp`);
  });

  it('leaves the url alone when no worker is configured', () => {
    expect(getDownloadFetchUrl(R2_URL, undefined)).toBe(R2_URL);
    expect(getDownloadFetchUrl(R2_URL, '')).toBe(R2_URL);
  });

  it('leaves local previews alone', () => {
    expect(getDownloadFetchUrl('blob:https://site/1234-uuid', API)).toBe('blob:https://site/1234-uuid');
    expect(getDownloadFetchUrl('data:image/png;base64,AAAA', API)).toBe('data:image/png;base64,AAAA');
  });

  it('leaves unparseable or empty urls alone', () => {
    expect(getDownloadFetchUrl('not a url', API)).toBe('not a url');
    expect(getDownloadFetchUrl('', API)).toBe('');
  });
});

describe('getKeysToDelete', () => {
  it('drops a replaced key the saved product still points at', () => {
    expect(getKeysToDelete(['prod_1_image_1.webp'], ['prod_1_image_1.webp', 'prod_1_image_2.webp'])).toEqual([]);
  });

  it('keeps genuinely removed keys and de-duplicates them', () => {
    expect(getKeysToDelete(['old.webp', 'old.webp', 'gone.webp'], ['new.webp'])).toEqual(['old.webp', 'gone.webp']);
  });
});

describe('productImageCountError', () => {
  it('accepts one to five images, including a single image', () => {
    for (const count of [1, 2, 3, 5]) expect(productImageCountError(count)).toBe('');
  });

  it('asks for at least one image, and refuses more than five', () => {
    expect(productImageCountError(0)).toMatch(/at least 1 image/);
    expect(productImageCountError(6)).toMatch(/at most 5/);
  });
});
