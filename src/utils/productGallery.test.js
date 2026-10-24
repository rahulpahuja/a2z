import { describe, it, expect } from 'vitest';
import { aspectToRatio, getGalleryMode, getGridTiles, normalizeGalleryLayout, stepIndex } from './productGallery.js';

const media = (n) => Array.from({ length: n }, (_, i) => ({ type: 'image', src: `img${i}` }));

describe('normalizeGalleryLayout', () => {
  it('keeps known layouts and falls back to the carousel', () => {
    expect(normalizeGalleryLayout('grid')).toBe('grid');
    expect(normalizeGalleryLayout('carousel')).toBe('carousel');
    for (const bad of [undefined, null, '', 'masonry', 3, {}]) expect(normalizeGalleryLayout(bad)).toBe('carousel');
  });
});

describe('getGalleryMode', () => {
  it('only uses the grid when chosen and there are at least two items', () => {
    expect(getGalleryMode('grid', 4)).toBe('grid');
    expect(getGalleryMode('grid', 2)).toBe('grid');
    expect(getGalleryMode('grid', 1)).toBe('carousel');
    expect(getGalleryMode('grid', 0)).toBe('carousel');
    expect(getGalleryMode('carousel', 6)).toBe('carousel');
    expect(getGalleryMode(undefined, 6)).toBe('carousel');
  });
});

describe('getGridTiles', () => {
  it('shows at most four tiles and counts the rest as extra', () => {
    const { tiles, extra } = getGridTiles(media(7));
    expect(tiles.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(extra).toBe(3);
  });

  it('shows everything when there are four or fewer', () => {
    expect(getGridTiles(media(4))).toMatchObject({ extra: 0 });
    const three = getGridTiles(media(3));
    expect(three.tiles).toHaveLength(3);
    expect(three.extra).toBe(0);
  });

  it('moves the lead item to the front without losing or repeating any item', () => {
    const { tiles, extra } = getGridTiles(media(6), 4);
    expect(tiles.map((t) => t.index)).toEqual([4, 0, 1, 2]);
    expect(extra).toBe(2);
    expect(tiles[0].item.src).toBe('img4');
  });

  it('ignores an out-of-range or invalid lead index', () => {
    for (const lead of [-1, 99, 1.5, NaN, undefined, null, '2']) {
      expect(getGridTiles(media(5), lead).tiles.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    }
  });

  it('handles empty and non-array input', () => {
    expect(getGridTiles([])).toEqual({ tiles: [], extra: 0 });
    expect(getGridTiles(undefined)).toEqual({ tiles: [], extra: 0 });
  });
});

describe('stepIndex', () => {
  it('wraps in both directions', () => {
    expect(stepIndex(0, -1, 5)).toBe(4);
    expect(stepIndex(4, 1, 5)).toBe(0);
    expect(stepIndex(2, 1, 5)).toBe(3);
    expect(stepIndex(0, -7, 5)).toBe(3);
  });

  it('is safe for an empty list', () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});

describe('aspectToRatio', () => {
  it('turns "w/h" into a number', () => {
    expect(aspectToRatio('3/4')).toBe(0.75);
    expect(aspectToRatio('1/1')).toBe(1);
    expect(aspectToRatio(' 4 / 3 ')).toBeCloseTo(1.3333, 3);
    expect(aspectToRatio('1.5/1')).toBe(1.5);
  });

  it('falls back to 3/4 for anything else', () => {
    for (const bad of ['', undefined, null, 'auto', '3:4', '0/4', '4/0', '1000/1', 'a/b', 7]) expect(aspectToRatio(bad)).toBe(0.75);
  });
});
