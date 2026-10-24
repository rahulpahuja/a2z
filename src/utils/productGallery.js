// Product page gallery layouts, chosen by the super user in Layout Configurator >
// Product Detail Page:
//   'carousel' - one large image with arrows and a thumbnail strip (the original layout)
//   'grid'     - up to four equal tiles, two across and two down, like the Windows logo

export const GALLERY_LAYOUTS = ['carousel', 'grid'];
export const GRID_TILE_COUNT = 4;

export function normalizeGalleryLayout(value) {
  return GALLERY_LAYOUTS.includes(value) ? value : 'carousel';
}

// A grid needs at least two items to be a grid; a single image stays the large image.
export function getGalleryMode(layout, mediaCount) {
  return normalizeGalleryLayout(layout) === 'grid' && mediaCount >= 2 ? 'grid' : 'carousel';
}

// Picks the tiles for the grid. The media item at `leadIndex` (e.g. the image that matches
// the selected colour) goes first, followed by the rest in their original order. Every tile
// keeps its real index so the lightbox opens on the right item. `extra` is how many items
// do not fit and are reachable from the lightbox.
export function getGridTiles(media, leadIndex = 0, max = GRID_TILE_COUNT) {
  const list = Array.isArray(media) ? media : [];
  if (list.length === 0) return { tiles: [], extra: 0 };
  const lead = Number.isInteger(leadIndex) && leadIndex >= 0 && leadIndex < list.length ? leadIndex : 0;
  const order = [lead, ...list.map((_, i) => i).filter((i) => i !== lead)];
  const tiles = order.slice(0, max).map((index) => ({ item: list[index], index }));
  return { tiles, extra: Math.max(0, list.length - tiles.length) };
}

// '3/4' -> 0.75 (width / height). Anything that is not a plain "w/h" ratio falls back to 3/4.
export function aspectToRatio(aspect) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(String(aspect ?? ''));
  if (!match) return 0.75;
  const ratio = Number(match[1]) / Number(match[2]);
  return Number.isFinite(ratio) && ratio > 0.2 && ratio < 5 ? ratio : 0.75;
}

// Wraps around, so previous/next in the lightbox never runs off either end.
export function stepIndex(current, delta, count) {
  if (!count) return 0;
  return (((current + delta) % count) + count) % count;
}
