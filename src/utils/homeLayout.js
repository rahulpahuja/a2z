// Customer home screen layout, as edited in Super User > Home Layout.
//
// Stored at `settings/homeLayout`:
//   {
//     version: 1,
//     rev: <int>,                    // bumped by every save; optimistic concurrency
//     updatedAt: <ms>,
//     sections: [{ id, visible, padY, maxWidth, cardWidth }],   // top-to-bottom order
//     products: { top: [id], bottom: [id], hidden: [id] }       // home product feed
//   }
// `padY`/`maxWidth`/`cardWidth` are pixels, or null for "use the built-in size".
//
// Everything read from storage goes through normalizeHomeLayout(): the database
// can hold anything (hand edits, an older/newer client, Firebase dropping empty
// arrays and null values), and the storefront must always render a sane page.

export const HOME_LAYOUT_VERSION = 1;

export const SIZE_LIMITS = {
  padY: { min: 0, max: 160 },
  maxWidth: { min: 320, max: 1920 },
  cardWidth: { min: 120, max: 480 },
};

export const MAX_PINNED_PRODUCTS = 200;
const MAX_ID_LENGTH = 128;

// Quick-pick sizes; a null value means "built-in default".
export const SIZE_PRESETS = {
  padY: [
    { label: 'Compact', value: 16 },
    { label: 'Default', value: null },
    { label: 'Spacious', value: 96 },
  ],
  maxWidth: [
    { label: 'Narrow', value: 960 },
    { label: 'Default', value: null },
    { label: 'Wide', value: 1536 },
    { label: 'Full', value: 1920 },
  ],
  cardWidth: [
    { label: 'Small', value: 180 },
    { label: 'Default', value: null },
    { label: 'Large', value: 340 },
    { label: 'XL', value: 420 },
  ],
};

export const SIZE_FIELD_LABELS = {
  padY: 'Vertical spacing (px)',
  maxWidth: 'Content width (px)',
  cardWidth: 'Product card width (px)',
};

// Default order. `supports` lists the size controls that make sense for the section.
export const SECTION_DEFS = [
  { id: 'hero', label: 'Hero banner', description: 'The full-width banner carousel.', supports: [] },
  { id: 'genderTiles', label: 'Shop by gender', description: 'The two big Women / Men tiles.', supports: ['padY', 'maxWidth'] },
  { id: 'blogs', label: 'From the Journal', description: 'The latest blog articles. Stays out of the way until an article is published.', supports: ['padY', 'maxWidth'] },
  { id: 'categoryBubbles', label: 'Category bubbles', description: 'Circular category shortcuts (also needs the Store Settings toggle).', supports: ['padY', 'maxWidth'] },
  { id: 'trending', label: 'Trending Now', description: 'Most viewed / best sellers, from live shop stats.', supports: ['padY', 'maxWidth', 'cardWidth'] },
  { id: 'collections', label: 'Collections', description: 'Published collections, in the order set on the Collections page.', supports: ['padY', 'maxWidth', 'cardWidth'] },
  { id: 'featured1', label: 'Featured Elegance', description: 'First product row of the home product feed.', supports: ['padY', 'maxWidth', 'cardWidth'] },
  { id: 'featured2', label: 'Heritage Masterpieces', description: 'Second product row of the home product feed.', supports: ['padY', 'maxWidth', 'cardWidth'] },
  { id: 'lookbook', label: 'Stories in Motion', description: 'Lookbook videos (shown only when videos are configured).', supports: ['padY', 'maxWidth'] },
];

export const SECTION_IDS = SECTION_DEFS.map((def) => def.id);
const DEF_BY_ID = new Map(SECTION_DEFS.map((def) => [def.id, def]));

export function getSectionDef(id) {
  return DEF_BY_ID.get(id) ?? null;
}

export function sectionSupports(id, field) {
  return Boolean(getSectionDef(id)?.supports.includes(field));
}

// Number of products shown in the second featured row (the first row's size is the
// `homeProductsPerRow` store setting).
export const FEATURED_ROW2_SIZE = 20;

function defaultSection(id) {
  return { id, visible: true, padY: null, maxWidth: null, cardWidth: null };
}

export function createDefaultHomeLayout() {
  return {
    version: HOME_LAYOUT_VERSION,
    rev: 0,
    updatedAt: 0,
    sections: SECTION_IDS.map(defaultSection),
    products: { top: [], bottom: [], hidden: [] },
  };
}

export const DEFAULT_HOME_LAYOUT = Object.freeze(createDefaultHomeLayout());

// Realtime Database hands back sparse/empty arrays as objects keyed by index (or drops
// them entirely), so accept both.
function toList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key]);
  }
  return [];
}

export function clampSize(field, value) {
  if (value === null || value === undefined || value === '') return null;
  const limits = SIZE_LIMITS[field];
  const n = typeof value === 'number' ? value : Number(value);
  if (!limits || !Number.isFinite(n)) return null;
  return Math.min(limits.max, Math.max(limits.min, Math.round(n)));
}

function normalizeSection(entry, def) {
  const section = defaultSection(def.id);
  section.visible = entry?.visible !== false;
  for (const field of def.supports) {
    section[field] = clampSize(field, entry?.[field]);
  }
  return section;
}

function normalizeSections(raw) {
  const seen = new Set();
  const sections = [];
  for (const entry of toList(raw)) {
    const def = DEF_BY_ID.get(entry?.id);
    if (!def || seen.has(def.id)) continue;
    seen.add(def.id);
    sections.push(normalizeSection(entry, def));
  }

  // A section added in a newer release lands at its default position (right after the
  // nearest preceding default section that is present), not dumped at the bottom.
  SECTION_DEFS.forEach((def, defIndex) => {
    if (seen.has(def.id)) return;
    let insertAt = 0;
    for (let i = defIndex - 1; i >= 0; i -= 1) {
      const at = sections.findIndex((s) => s.id === SECTION_DEFS[i].id);
      if (at !== -1) {
        insertAt = at + 1;
        break;
      }
    }
    sections.splice(insertAt, 0, defaultSection(def.id));
    seen.add(def.id);
  });

  // The home page must never be blank: if everything is hidden, bring the hero back.
  if (!sections.some((s) => s.visible)) sections[0].visible = true;
  return sections;
}

function normalizeIdList(raw, taken) {
  const out = [];
  for (const value of toList(raw)) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const id = String(value);
    if (!id || id.length > MAX_ID_LENGTH || taken.has(id)) continue;
    taken.add(id);
    out.push(id);
    if (out.length >= MAX_PINNED_PRODUCTS) break;
  }
  return out;
}

// A product id lives in at most one list. Precedence: hidden > top > bottom.
export function normalizeProductPlacement(raw) {
  const taken = new Set();
  const hidden = normalizeIdList(raw?.hidden, taken);
  const top = normalizeIdList(raw?.top, taken);
  const bottom = normalizeIdList(raw?.bottom, taken);
  return { top, bottom, hidden };
}

export function normalizeHomeLayout(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return createDefaultHomeLayout();
  const rev = Number(raw.rev);
  const updatedAt = Number(raw.updatedAt);
  return {
    version: HOME_LAYOUT_VERSION,
    rev: Number.isInteger(rev) && rev >= 0 ? rev : 0,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : 0,
    sections: normalizeSections(raw.sections),
    products: normalizeProductPlacement(raw.products),
  };
}

// Same layout ignoring bookkeeping fields; used for "has anything been edited?".
export function layoutsEqual(a, b) {
  const strip = ({ sections, products }) => JSON.stringify({ sections, products });
  return strip(normalizeHomeLayout(a)) === strip(normalizeHomeLayout(b));
}

// ---------------------------------------------------------------------------
// Product feed ordering
// ---------------------------------------------------------------------------

// Orders the home product feed: pinned-to-top products first (in pin order), everyone
// else in their natural order, pinned-to-bottom products last (in pin order). Hidden
// products are dropped from the feed only — they stay in the shop. Ids that no longer
// match a live product are ignored.
export function applyHomeProductOrder(products, placement) {
  const list = Array.isArray(products) ? products : [];
  const { top, bottom, hidden } = normalizeProductPlacement(placement);
  if (!top.length && !bottom.length && !hidden.length) return list;

  const hiddenSet = new Set(hidden);
  const byId = new Map();
  for (const product of list) {
    const id = String(product?.id);
    if (!byId.has(id)) byId.set(id, product);
  }
  const pinned = new Set([...top, ...bottom]);

  const head = top.map((id) => byId.get(id)).filter(Boolean);
  const tail = bottom.map((id) => byId.get(id)).filter(Boolean);
  const middle = list.filter((product) => {
    const id = String(product?.id);
    return !hiddenSet.has(id) && !pinned.has(id);
  });
  return [...head, ...middle, ...tail];
}

const PLACEMENT_KEYS = ['top', 'bottom', 'hidden'];

function withoutId(placement, id) {
  const next = {};
  for (const key of PLACEMENT_KEYS) next[key] = (placement[key] ?? []).filter((x) => x !== id);
  return next;
}

// Where a product currently sits in the placement: 'top' | 'bottom' | 'hidden' | null.
export function getPlacement(placement, productId) {
  const id = String(productId);
  return PLACEMENT_KEYS.find((key) => (placement?.[key] ?? []).includes(id)) ?? null;
}

// Moves a product into `target` ('top' | 'bottom' | 'hidden'), or clears it (null).
// A new top pin goes to the very top; bottom pins and hidden products are appended.
// Returns the same object when nothing would change, or when the pin cap is reached.
export function placeProduct(placement, productId, target) {
  const id = String(productId);
  if (!id || id.length > MAX_ID_LENGTH) return placement;
  if (getPlacement(placement, id) === target) return placement;
  const next = withoutId(placement, id);
  if (target === 'top') next.top = [id, ...next.top];
  else if (target === 'bottom') next.bottom = [...next.bottom, id];
  else if (target === 'hidden') next.hidden = [...next.hidden, id];
  if (target && next[target].length > MAX_PINNED_PRODUCTS) return placement;
  return next;
}

// Moves an already-pinned product one step within its list.
export function nudgePinned(placement, productId, delta) {
  const id = String(productId);
  const key = getPlacement(placement, id);
  if (key !== 'top' && key !== 'bottom') return placement;
  const list = placement[key];
  const from = list.indexOf(id);
  const to = from + delta;
  if (to < 0 || to >= list.length) return placement;
  return { ...placement, [key]: moveItem(list, from, to) };
}

// Drops pins/hides that point at products which no longer exist.
export function pruneMissingProducts(placement, products) {
  const live = new Set((products ?? []).map((p) => String(p?.id)));
  const next = {};
  for (const key of PLACEMENT_KEYS) next[key] = (placement[key] ?? []).filter((id) => live.has(id));
  return next;
}

// ---------------------------------------------------------------------------
// Generic list/section helpers
// ---------------------------------------------------------------------------

export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function countVisibleSections(sections) {
  return sections.filter((s) => s.visible).length;
}

// Applies an edit to one section; refuses to hide the last visible one.
export function updateSection(layout, id, patch) {
  const sections = layout.sections.map((section) => {
    if (section.id !== id) return section;
    const next = { ...section };
    if ('visible' in patch) next.visible = Boolean(patch.visible);
    for (const field of ['padY', 'maxWidth', 'cardWidth']) {
      if (field in patch && sectionSupports(id, field)) next[field] = clampSize(field, patch[field]);
    }
    return next;
  });
  if (countVisibleSections(sections) === 0) return layout;
  return { ...layout, sections };
}

export function moveSection(layout, from, to) {
  const sections = moveItem(layout.sections, from, to);
  return sections === layout.sections ? layout : { ...layout, sections };
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

// CSS custom properties + data attributes for a section wrapper; see HomePage.css.
// Returns empty objects for an all-default section so the page renders exactly as before.
export function getSectionStyle(section) {
  const style = {};
  const attrs = {};
  if (Number.isFinite(section?.padY)) {
    style['--hl-pad-y'] = `${section.padY}px`;
    attrs['data-hl-pad'] = '';
  }
  if (Number.isFinite(section?.maxWidth)) {
    style['--hl-max-w'] = `${section.maxWidth}px`;
    attrs['data-hl-width'] = '';
  }
  if (Number.isFinite(section?.cardWidth)) {
    style['--hl-card-w'] = `${section.cardWidth}px`;
    attrs['data-hl-card'] = '';
  }
  return { style, attrs };
}

// Sections that are visible, in order, for the storefront.
export function getVisibleSections(layout) {
  return normalizeHomeLayout(layout).sections.filter((s) => s.visible);
}
