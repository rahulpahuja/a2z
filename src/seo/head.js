import { BRAND_NAME, SITE_URL } from './routes.js';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/mustard_kurti_set.jpg`;
const JSON_LD_ID = 'seo-jsonld';

export const escapeAttr = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Keeps </script> inside the JSON from closing the tag early.
const serializeJsonLd = (items) => JSON.stringify(items).replace(/</g, '\\u003c');

// Every tag a page-specific head replaces, so index.html's site-wide defaults
// don't end up duplicated next to the new ones.
const SITE_DEFAULT_HEAD_TAGS = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+(?:name|property)="(?:description|robots|og:[^"]+)"[^>]*>\s*/gi,
  /<link\s+rel="canonical"[^>]*>\s*/gi,
  /<script\s+type="application\/ld\+json"\s+id="seo-jsonld"[\s\S]*?<\/script>\s*/gi,
];

const metaAttr = ({ attr, key, content }) => `<meta ${attr}="${escapeAttr(key)}" content="${escapeAttr(content)}" />`;

export function renderHeadTags(head) {
  const extraMeta = head.extraMeta ?? [];
  const tags = [`<title>${escapeAttr(head.title)}</title>`];
  if (head.canonical) tags.push(`<link rel="canonical" href="${escapeAttr(head.canonical)}" />`);
  tags.push(
    `<meta name="description" content="${escapeAttr(head.description)}" />`,
    `<meta name="robots" content="${escapeAttr(head.robots)}" />`,
    `<meta property="og:type" content="${escapeAttr(head.ogType)}" />`,
    `<meta property="og:site_name" content="${BRAND_NAME}" />`,
    `<meta property="og:title" content="${escapeAttr(head.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(head.description)}" />`,
    `<meta property="og:image" content="${escapeAttr(head.ogImage ?? DEFAULT_OG_IMAGE)}" />`
  );
  if (head.canonical) tags.push(`<meta property="og:url" content="${escapeAttr(head.canonical)}" />`);
  if (head.jsonLd.length > 0) {
    tags.push(`<script type="application/ld+json" id="${JSON_LD_ID}">${serializeJsonLd(head.jsonLd)}</script>`);
  }
  // Admin-set tags replace the page's own tag for the same name/property.
  const isOverridden = (tag) => extraMeta.some(({ attr, key }) => tag.startsWith(`<meta ${attr}="${escapeAttr(key)}"`));
  return [...tags.filter((tag) => !isOverridden(tag)), ...extraMeta.map(metaAttr)].join('\n    ');
}

// Used by the Edge Function: swaps the site-wide head in index.html for the page's
// own, and adds crawlable body copy where the app mounts.
export function injectHeadIntoHtml(html, head) {
  if (!head) return html;
  const customPatterns = (head.extraMeta ?? []).map(
    ({ attr, key }) => new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>\\s*`, 'gi')
  );
  const stripped = [...SITE_DEFAULT_HEAD_TAGS, ...customPatterns].reduce((acc, pattern) => acc.replace(pattern, ''), html);
  const withHead = stripped.replace(/<\/head>/i, `    ${renderHeadTags(head)}\n  </head>`);
  if (!head.noscript) return withHead;
  return withHead.replace(/<div id="root"><\/div>/i, `<noscript>${head.noscript}</noscript>\n    <div id="root"></div>`);
}

const upsertMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
};

const upsertCanonical = (href) => {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    canonical?.remove();
    return;
  }
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
};

const upsertJsonLd = (items) => {
  let script = document.getElementById(JSON_LD_ID);
  if (items.length === 0) {
    script?.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSON_LD_ID;
    document.head.appendChild(script);
  }
  script.textContent = serializeJsonLd(items);
};

// Admin-set tags are marked so the next navigation can undo them: a tag that
// replaced one already in the document (e.g. keywords) gets its content back.
const clearCustomMeta = () => {
  document.head.querySelectorAll('meta[data-custom-meta]').forEach((el) => {
    const original = el.getAttribute('data-original-content');
    if (original === null) {
      el.remove();
      return;
    }
    el.setAttribute('content', original);
    el.removeAttribute('data-original-content');
    el.removeAttribute('data-custom-meta');
  });
};

const applyCustomMeta = ({ attr, key, content }) => {
  const existing = document.head.querySelector(`meta[${attr}="${key}"]`);
  const original = existing?.getAttribute('content');
  const el = upsertMeta(attr, key, content);
  if (original !== undefined) el.setAttribute('data-original-content', original ?? '');
  el.setAttribute('data-custom-meta', '');
};

// Used by the browser so client-side navigation keeps titles and meta in step.
export function applyDocumentHead(head) {
  clearCustomMeta();
  document.title = head.title;
  upsertMeta('name', 'description', head.description);
  upsertMeta('name', 'robots', head.robots);
  upsertMeta('property', 'og:type', head.ogType);
  upsertMeta('property', 'og:title', head.title);
  upsertMeta('property', 'og:description', head.description);
  upsertMeta('property', 'og:image', head.ogImage ?? DEFAULT_OG_IMAGE);
  upsertCanonical(head.canonical);
  if (head.canonical) upsertMeta('property', 'og:url', head.canonical);
  upsertJsonLd(head.jsonLd);
  (head.extraMeta ?? []).forEach(applyCustomMeta);
}
