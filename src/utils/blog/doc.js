// Article bodies are stored as a ProseMirror/Tiptap JSON document in a string field, never
// as HTML. Everything that reaches a visitor (and everything saved) first goes through
// sanitizeDoc(): a strict allow-list of node and mark types and attributes, with every URL
// checked. Anything unknown is dropped, so a hand-edited database entry cannot inject markup.

export const MAX_DOC_BYTES = 250000;
const MAX_NODES = 4000;
const MAX_DEPTH = 12;
const MAX_TEXT_LENGTH = 20000;
const MAX_ALT = 300;
const MAX_GALLERY_IMAGES = 12;
const MAX_COMPARE_PRODUCTS = 4;

export const CALLOUT_TONES = ['info', 'tip', 'warning', 'note'];
const ID_PATTERN = /^[\w-]{1,128}$/;

export const emptyDoc = () => ({ type: 'doc', content: [{ type: 'paragraph' }] });

// ---- URLs ------------------------------------------------------------------

function parseAbsolute(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const hasControlChars = (value) => Array.from(value).some((ch) => ch.charCodeAt(0) <= 32 || ch.charCodeAt(0) === 127);

// Links: http(s), mailto, tel, same-site paths and in-page anchors. Never javascript:, data:,
// vbscript:, or protocol-relative URLs.
export function safeLinkHref(value) {
  const href = String(value ?? '').trim();
  if (!href || href.length > 2000 || hasControlChars(href)) return null;
  if (href.startsWith('#')) return href;
  if (href.startsWith('/')) return href.startsWith('//') || href.includes('\\') ? null : href;
  const url = parseAbsolute(href);
  if (!url) return null;
  return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? href : null;
}

// Images: https, or a same-site path. No data: or http: URLs (mixed content).
export function safeImageSrc(value) {
  const src = String(value ?? '').trim();
  if (!src || src.length > 2000 || hasControlChars(src)) return null;
  if (src.startsWith('/')) return src.startsWith('//') || src.includes('\\') ? null : src;
  const url = parseAbsolute(src);
  return url && url.protocol === 'https:' ? src : null;
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VIDEO_FILE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

// What a video URL is, so the renderer can build the embed itself from an id (never from
// the raw URL): { kind: 'youtube'|'vimeo', id } or { kind: 'file', src }.
export function parseVideoSource(value) {
  const src = String(value ?? '').trim();
  if (!src || src.length > 2000 || hasControlChars(src)) return null;
  const url = parseAbsolute(src);
  if (!url || url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    const id = url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : url.searchParams.get('v');
    return id && /^[\w-]{11}$/.test(id) ? { kind: 'youtube', id } : null;
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return /^[\w-]{11}$/.test(id) ? { kind: 'youtube', id } : null;
  }
  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).find((part) => /^\d{5,12}$/.test(part));
    return id ? { kind: 'vimeo', id } : null;
  }
  return VIDEO_FILE.test(url.pathname) ? { kind: 'file', src } : null;
}

// ---- sanitizing -----------------------------------------------------------

const clampText = (value, max) => String(value ?? '').slice(0, max);
const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const cleanId = (value) => (ID_PATTERN.test(String(value ?? '')) ? String(value) : null);

function cleanMarks(marks) {
  if (!Array.isArray(marks)) return undefined;
  const out = [];
  const seen = new Set();
  for (const mark of marks) {
    const type = mark?.type;
    if (seen.has(type)) continue;
    if (['bold', 'italic', 'underline', 'strike', 'code'].includes(type)) {
      out.push({ type });
      seen.add(type);
    } else if (type === 'link') {
      const href = safeLinkHref(mark.attrs?.href);
      if (href) {
        out.push({ type, attrs: { href } });
        seen.add(type);
      }
    }
  }
  return out.length ? out : undefined;
}

function cleanNode(node, ctx, depth) {
  if (!node || typeof node !== 'object' || depth > MAX_DEPTH || ctx.count >= MAX_NODES) return null;
  ctx.count += 1;
  const { type } = node;

  switch (type) {
    case 'text': {
      const text = clampText(node.text, MAX_TEXT_LENGTH);
      if (!text) return null;
      const marks = cleanMarks(node.marks);
      return marks ? { type, text, marks } : { type, text };
    }
    case 'hardBreak':
    case 'horizontalRule':
      return { type };
    case 'paragraph':
    case 'codeBlock':
    case 'heading': {
      const content = cleanChildren(node.content, ctx, depth, ['text', 'hardBreak']);
      const out = { type };
      if (type === 'heading') out.attrs = { level: clampInt(node.attrs?.level, 2, 4, 2) };
      if (content.length) out.content = type === 'codeBlock' ? content.filter((c) => c.type === 'text').map(({ text }) => ({ type: 'text', text })) : content;
      return out;
    }
    case 'blockquote':
    case 'bulletList':
    case 'orderedList':
    case 'listItem':
    case 'table':
    case 'tableRow': {
      const allowed = { bulletList: ['listItem'], orderedList: ['listItem'], table: ['tableRow'], tableRow: ['tableCell', 'tableHeader'] }[type] ?? null;
      const content = cleanChildren(node.content, ctx, depth, allowed);
      if (!content.length) return null;
      const out = { type, content };
      if (type === 'orderedList') out.attrs = { start: clampInt(node.attrs?.start, 1, 9999, 1) };
      return out;
    }
    case 'tableCell':
    case 'tableHeader': {
      const content = cleanChildren(node.content, ctx, depth, null);
      return {
        type,
        attrs: { colspan: clampInt(node.attrs?.colspan, 1, 12, 1), rowspan: clampInt(node.attrs?.rowspan, 1, 12, 1) },
        content: content.length ? content : [{ type: 'paragraph' }],
      };
    }
    case 'callout': {
      const content = cleanChildren(node.content, ctx, depth, null);
      return {
        type,
        attrs: { tone: CALLOUT_TONES.includes(node.attrs?.tone) ? node.attrs.tone : 'info' },
        content: content.length ? content : [{ type: 'paragraph' }],
      };
    }
    case 'image': {
      const src = safeImageSrc(node.attrs?.src);
      if (!src) return null;
      const attrs = { src, alt: clampText(node.attrs?.alt, MAX_ALT) };
      const caption = clampText(node.attrs?.caption, MAX_ALT);
      if (caption) attrs.caption = caption;
      return { type, attrs };
    }
    case 'gallery': {
      const images = (Array.isArray(node.attrs?.images) ? node.attrs.images : [])
        .slice(0, MAX_GALLERY_IMAGES)
        .map((img) => ({ src: safeImageSrc(img?.src), alt: clampText(img?.alt, MAX_ALT) }))
        .filter((img) => img.src);
      return images.length ? { type, attrs: { images } } : null;
    }
    case 'video': {
      const source = parseVideoSource(node.attrs?.src);
      if (!source) return null;
      return { type, attrs: { src: String(node.attrs.src).trim(), title: clampText(node.attrs?.title, MAX_ALT) } };
    }
    case 'productCard': {
      const productId = cleanId(node.attrs?.productId);
      return productId ? { type, attrs: { productId } } : null;
    }
    case 'collectionCard': {
      const collectionId = cleanId(node.attrs?.collectionId);
      return collectionId ? { type, attrs: { collectionId } } : null;
    }
    case 'comparison': {
      const ids = (Array.isArray(node.attrs?.productIds) ? node.attrs.productIds : []).map(cleanId).filter(Boolean);
      return { type, attrs: { productIds: [...new Set(ids)].slice(0, MAX_COMPARE_PRODUCTS) } };
    }
    default:
      return null;
  }
}

function cleanChildren(children, ctx, depth, allowedTypes) {
  if (!Array.isArray(children)) return [];
  const out = [];
  for (const child of children) {
    if (allowedTypes && !allowedTypes.includes(child?.type)) continue;
    const cleaned = cleanNode(child, ctx, depth + 1);
    if (cleaned) out.push(cleaned);
  }
  return out;
}

// Accepts a JSON string or an already-parsed object. Always returns a valid document.
export function parseBody(body) {
  if (typeof body === 'string') {
    if (!body.trim() || body.length > MAX_DOC_BYTES) return null;
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

export function sanitizeDoc(input) {
  const doc = parseBody(input);
  if (!doc || doc.type !== 'doc') return emptyDoc();
  const content = cleanChildren(doc.content, { count: 0 }, 0, null);
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

export const serializeDoc = (doc) => JSON.stringify(sanitizeDoc(doc));

// ---- reading a document ------------------------------------------------------

function walk(node, visit) {
  if (!node) return;
  visit(node);
  if (Array.isArray(node.content)) node.content.forEach((child) => walk(child, visit));
}

export function nodeText(node) {
  const parts = [];
  walk(node, (n) => {
    if (n.type === 'text') parts.push(n.text);
    else if (n.type === 'hardBreak') parts.push(' ');
  });
  return parts.join('');
}

export function docToPlainText(input) {
  const doc = sanitizeDoc(input);
  const blocks = [];
  walk(doc, (n) => {
    if (['paragraph', 'heading', 'codeBlock'].includes(n.type)) blocks.push(nodeText(n));
    if (n.type === 'image' && n.attrs.caption) blocks.push(n.attrs.caption);
  });
  return blocks.join(' ').replace(/\s+/g, ' ').trim();
}

export function isDocEmpty(input) {
  const doc = sanitizeDoc(input);
  let meaningful = false;
  walk(doc, (n) => {
    if (n.type === 'text' && n.text.trim()) meaningful = true;
    if (['image', 'gallery', 'video', 'productCard', 'collectionCard', 'comparison', 'horizontalRule'].includes(n.type)) meaningful = true;
  });
  return !meaningful;
}

export function readingMinutes(plain) {
  const words = String(plain ?? '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function makeExcerpt(plain, max = 160) {
  const clean = String(plain ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// Headings for the table of contents. The same ids are used by the renderer, so anchors work.
export function extractHeadings(input) {
  const doc = sanitizeDoc(input);
  const seen = new Map();
  const headings = [];
  walk(doc, (n) => {
    if (n.type !== 'heading') return;
    const text = nodeText(n).trim();
    if (!text) return;
    const base = text.toLowerCase().normalize('NFKD').replace(/\p{M}+/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    headings.push({ id: count === 1 ? base : `${base}-${count}`, text, level: n.attrs.level });
  });
  return headings;
}

// Which products/collections the body places inline.
export function collectReferences(input) {
  const doc = sanitizeDoc(input);
  const productIds = [];
  const collectionIds = [];
  walk(doc, (n) => {
    if (n.type === 'productCard') productIds.push(n.attrs.productId);
    if (n.type === 'collectionCard') collectionIds.push(n.attrs.collectionId);
    if (n.type === 'comparison') productIds.push(...n.attrs.productIds);
  });
  return { productIds: [...new Set(productIds)], collectionIds: [...new Set(collectionIds)] };
}

export function firstImage(input) {
  const doc = sanitizeDoc(input);
  let found = null;
  walk(doc, (n) => {
    if (found) return;
    if (n.type === 'image') found = { src: n.attrs.src, alt: n.attrs.alt };
    else if (n.type === 'gallery') found = n.attrs.images[0];
  });
  return found;
}
