import { describe, it, expect } from 'vitest';
import { isValidSlug, slugFromTitle, slugify, uniqueSlug, MAX_SLUG_LENGTH } from './slug.js';
import { canTransition, isDue, isPubliclyVisible, validateScheduleTime, MIN_SCHEDULE_LEAD_MS } from './status.js';
import {
  collectReferences,
  docToPlainText,
  emptyDoc,
  extractHeadings,
  isDocEmpty,
  makeExcerpt,
  parseVideoSource,
  readingMinutes,
  safeImageSrc,
  safeLinkHref,
  sanitizeDoc,
  serializeDoc,
} from './doc.js';

const para = (text, marks) => ({ type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] });
const doc = (...content) => ({ type: 'doc', content });

describe('slugify', () => {
  it('makes readable, accent-free slugs', () => {
    expect(slugify('How to Choose the Right Handbag!')).toBe('how-to-choose-the-right-handbag');
    expect(slugify('Café & Crème — Style Guide')).toBe('cafe-and-creme-style-guide');
    expect(slugify('  --Hello   World--  ')).toBe('hello-world');
  });

  it('caps the length without leaving a trailing hyphen', () => {
    const slug = slugify(`${'word '.repeat(40)}end`);
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns an empty string when nothing Latin is left and falls back to the id', () => {
    expect(slugify('नमस्ते')).toBe('');
    expect(slugFromTitle('नमस्ते', 'blog_abc12345')).toBe('post-abc12345');
    expect(slugFromTitle('', '')).toBe('post');
  });

  it('validates slugs, including reserved words', () => {
    expect(isValidSlug('a-good-slug')).toBe(true);
    for (const bad of ['', 'Upper', 'a--b', '-a', 'a-', 'a b', 'new', 'a/b', 'a.b', null, 5]) expect(isValidSlug(bad)).toBe(false);
  });

  it('adds a numeric suffix until the slug is free', () => {
    const taken = new Set(['gift-guide', 'gift-guide-2']);
    expect(uniqueSlug('gift-guide', (s) => taken.has(s))).toBe('gift-guide-3');
    expect(uniqueSlug('fresh', (s) => taken.has(s))).toBe('fresh');
    expect(uniqueSlug('Not A Slug!', () => false)).toBe('not-a-slug');
  });
});

describe('status transitions', () => {
  it('allows the intended moves only', () => {
    expect(canTransition('draft', 'published')).toBe(true);
    expect(canTransition('draft', 'scheduled')).toBe(true);
    expect(canTransition('scheduled', 'scheduled')).toBe(true);
    expect(canTransition('published', 'draft')).toBe(true);
    expect(canTransition('published', 'scheduled')).toBe(false);
    expect(canTransition('archived', 'scheduled')).toBe(false);
    expect(canTransition('draft', 'nonsense')).toBe(false);
    expect(canTransition(undefined, 'draft')).toBe(false);
  });

  it('only a scheduled post whose time has come is due', () => {
    expect(isDue({ status: 'scheduled', publishAt: 1000 }, 1000)).toBe(true);
    expect(isDue({ status: 'scheduled', publishAt: 1001 }, 1000)).toBe(false);
    expect(isDue({ status: 'draft', publishAt: 1 }, 1000)).toBe(false);
    expect(isDue({ status: 'scheduled' }, 1000)).toBe(false);
  });

  it('requires a future schedule time', () => {
    const now = 1_000_000;
    expect(validateScheduleTime(NaN, now)).toMatch(/Choose/);
    expect(validateScheduleTime(now + 1000, now)).toMatch(/minute/);
    expect(validateScheduleTime(now + MIN_SCHEDULE_LEAD_MS, now)).toBeNull();
  });

  it('only published posts are public', () => {
    expect(isPubliclyVisible({ status: 'published' })).toBe(true);
    for (const status of ['draft', 'scheduled', 'archived', undefined]) expect(isPubliclyVisible({ status })).toBe(false);
  });
});

describe('URL safety', () => {
  it('accepts safe links and rejects script-capable ones', () => {
    for (const ok of ['https://example.com/a?b=1', 'http://example.com', 'mailto:hi@example.com', 'tel:+911234567890', '/products/abc', '#section'])
      expect(safeLinkHref(ok)).toBe(ok);
    for (const bad of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'vbscript:x', '//evil.com', '/\\evil.com', 'java\tscript:alert(1)', '', null, 'ftp://x.com'])
      expect(safeLinkHref(bad)).toBeNull();
  });

  it('accepts https and same-site images only', () => {
    expect(safeImageSrc('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(safeImageSrc('/images/a.jpg')).toBe('/images/a.jpg');
    for (const bad of ['http://x.com/a.jpg', 'data:image/svg+xml;base64,AAAA', 'javascript:alert(1)', '//x.com/a.jpg', '']) expect(safeImageSrc(bad)).toBeNull();
  });

  it('turns video URLs into ids, never raw embeds', () => {
    expect(parseVideoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseVideoSource('https://youtu.be/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseVideoSource('https://vimeo.com/123456789')).toEqual({ kind: 'vimeo', id: '123456789' });
    expect(parseVideoSource('https://cdn.example.com/clip.mp4')).toEqual({ kind: 'file', src: 'https://cdn.example.com/clip.mp4' });
    for (const bad of ['https://evil.com/embed', 'http://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/watch?v=<script>', 'javascript:alert(1)', '']) expect(parseVideoSource(bad)).toBeNull();
  });
});

describe('sanitizeDoc', () => {
  it('returns an empty document for anything that is not a document', () => {
    for (const bad of [null, undefined, '', 'not json', '{"type":"paragraph"}', 5, [], '{"type":"doc"}']) {
      expect(sanitizeDoc(bad)).toEqual(emptyDoc());
    }
  });

  it('keeps ordinary content and parses JSON strings', () => {
    const input = doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hi' }] }, para('Body', [{ type: 'bold' }]));
    expect(sanitizeDoc(JSON.stringify(input))).toEqual(input);
  });

  it('drops unknown nodes, unknown marks and stray attributes', () => {
    const out = sanitizeDoc(
      doc(
        { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
        { type: 'paragraph', attrs: { onclick: 'x()', class: 'evil' }, content: [{ type: 'text', text: 'safe', marks: [{ type: 'highlight' }, { type: 'bold', attrs: { onmouseover: 'x' } }] }] }
      )
    );
    expect(out.content).toHaveLength(1);
    expect(out.content[0]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'safe', marks: [{ type: 'bold' }] }] });
  });

  it('removes javascript: links but keeps the text, and rejects unsafe images', () => {
    const out = sanitizeDoc(
      doc(
        para('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
        { type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'x' } },
        { type: 'image', attrs: { src: 'https://cdn.example.com/a.jpg', alt: 'ok', onerror: 'x()' } }
      )
    );
    expect(out.content[0].content[0].marks).toBeUndefined();
    expect(out.content).toHaveLength(2);
    expect(out.content[1]).toEqual({ type: 'image', attrs: { src: 'https://cdn.example.com/a.jpg', alt: 'ok' } });
  });

  it('clamps heading levels, rejects bad ids and limits galleries and comparisons', () => {
    const out = sanitizeDoc(
      doc(
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'productCard', attrs: { productId: '<img onerror=x>' } },
        { type: 'productCard', attrs: { productId: 'prod_123-abc' } },
        { type: 'gallery', attrs: { images: Array.from({ length: 30 }, (_, i) => ({ src: `https://x.com/${i}.jpg`, alt: '' })) } },
        { type: 'comparison', attrs: { productIds: ['a', 'b', 'c', 'd', 'e', 'a'] } }
      )
    );
    expect(out.content[0].attrs.level).toBe(2);
    expect(out.content.filter((n) => n.type === 'productCard')).toEqual([{ type: 'productCard', attrs: { productId: 'prod_123-abc' } }]);
    expect(out.content.find((n) => n.type === 'gallery').attrs.images).toHaveLength(12);
    expect(out.content.find((n) => n.type === 'comparison').attrs.productIds).toEqual(['a', 'b', 'c', 'd']);
  });

  it('bounds depth and node count so a hostile document cannot hang the renderer', () => {
    let deep = para('leaf');
    for (let i = 0; i < 60; i += 1) deep = { type: 'blockquote', content: [deep] };
    const out = sanitizeDoc(doc(deep));
    let depth = 0;
    for (let node = out.content[0]; node?.content; node = node.content[0]) depth += 1;
    expect(depth).toBeLessThanOrEqual(14);

    const many = doc(...Array.from({ length: 10000 }, () => para('x')));
    expect(sanitizeDoc(many).content.length).toBeLessThanOrEqual(4000);
  });

  it('treats script-looking text as plain text', () => {
    const out = sanitizeDoc(doc(para('<script>alert(1)</script>')));
    expect(out.content[0].content[0].text).toBe('<script>alert(1)</script>');
  });

  it('is idempotent', () => {
    const messy = doc(
      { type: 'callout', attrs: { tone: 'bogus' }, content: [para('note')] },
      { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 99 }, content: [para('c')] }] }] },
      { type: 'video', attrs: { src: 'https://youtu.be/dQw4w9WgXcQ' } }
    );
    const once = sanitizeDoc(messy);
    expect(sanitizeDoc(once)).toEqual(once);
    expect(once.content[0].attrs.tone).toBe('info');
    expect(once.content[1].content[0].content[0].attrs.colspan).toBe(12);
  });

  it('serializes to a JSON string', () => {
    expect(JSON.parse(serializeDoc(doc(para('x'))))).toEqual(doc(para('x')));
  });
});

describe('reading a document', () => {
  const sample = doc(
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Why we love it' }] },
    para('First paragraph here.'),
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Why we love it' }] },
    { type: 'productCard', attrs: { productId: 'p1' } },
    { type: 'comparison', attrs: { productIds: ['p1', 'p2'] } },
    { type: 'collectionCard', attrs: { collectionId: 'c1' } }
  );

  it('builds unique heading anchors', () => {
    expect(extractHeadings(sample)).toEqual([
      { id: 'why-we-love-it', text: 'Why we love it', level: 2 },
      { id: 'why-we-love-it-2', text: 'Why we love it', level: 3 },
    ]);
  });

  it('collects the products and collections placed inline, without duplicates', () => {
    expect(collectReferences(sample)).toEqual({ productIds: ['p1', 'p2'], collectionIds: ['c1'] });
  });

  it('produces plain text, reading time, excerpts and emptiness', () => {
    expect(docToPlainText(sample)).toBe('Why we love it First paragraph here. Why we love it');
    expect(readingMinutes('word '.repeat(600))).toBe(3);
    expect(readingMinutes('')).toBe(1);
    expect(makeExcerpt('a '.repeat(200), 50).length).toBeLessThanOrEqual(50);
    expect(isDocEmpty(emptyDoc())).toBe(true);
    expect(isDocEmpty(doc(para('   ')))).toBe(true);
    expect(isDocEmpty(doc({ type: 'productCard', attrs: { productId: 'p1' } }))).toBe(false);
  });
});
