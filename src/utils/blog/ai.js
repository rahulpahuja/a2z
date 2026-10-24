import { getPriceBreakdown } from '../discount.js';
import { isProductAvailable, normalizeColors, getAllSizeNames } from '../productColors.js';
import { descriptionToPlain } from '../richText.js';
import { getOptionalSpecs } from '../productSpecs.js';
import { emptyDoc, nodeText, sanitizeDoc } from './doc.js';
import { getBlogType } from './types.js';

// Everything the AI assistant is allowed to say comes from here. The prompt carries verified catalogue
// facts and nothing else; the reply is parsed against a strict shape, anything referring to a product
// that was not supplied is dropped, and the result is only ever a draft the author edits.

export const AI_LENGTHS = { short: '300-500 words', medium: '700-900 words', long: '1200-1500 words' };
export const AI_TONES = ['warm and friendly', 'polished and editorial', 'playful and trendy', 'informative and practical'];
export const MAX_AI_PRODUCTS = 12;

const clip = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// What we know about a product, as plain facts. Missing facts are omitted, never guessed.
export function productFacts(product) {
  const { discountedPrice, originalPrice, hasDiscount } = getPriceBreakdown(product);
  const colours = normalizeColors(product.colors, product.sizes).map((c) => c.name).filter(Boolean);
  const specs = Object.fromEntries(getOptionalSpecs(product).map((s) => [s.label.toLowerCase(), s.value]));
  const facts = {
    id: String(product.id),
    name: clip(product.name || product.title, 160),
    category: clip(product.categoryTitle || product.category, 80),
    gender: clip(product.gender, 20),
    price_inr: Math.round(discountedPrice),
    ...(hasDiscount ? { original_price_inr: Math.round(originalPrice) } : {}),
    colours,
    sizes: getAllSizeNames(product.colors, product.sizes),
    in_stock: isProductAvailable(product),
    description: clip(descriptionToPlain(product.description), 700),
    ...specs,
  };
  return Object.fromEntries(Object.entries(facts).filter(([, v]) => v !== '' && !(Array.isArray(v) && v.length === 0)));
}

const SYSTEM = [
  'You write blog article drafts for A2Z Collection, an Indian fashion store. A human editor will review and edit everything you write.',
  'Use ONLY the facts supplied in the product and collection data. Never invent product specifications, materials, fits, sizes, prices, discounts, reviews, ratings, awards, stock levels, delivery promises or claims.',
  'If a fact is not supplied, do not mention it. Do not state a price or discount unless it appears in the data, and write prices in rupees.',
  'Refer to products by their exact names. Do not describe a product as bestselling, trending or popular unless the data says so.',
  'Reply with a single JSON object and nothing else. No markdown fences, no commentary.',
].join('\n');

const SHAPE = `{
  "title": string,
  "excerpt": string (max 300 characters),
  "seoTitle": string (max 60 characters),
  "seoDescription": string (120-160 characters),
  "tags": string[] (3-6 short lower-case tags),
  "sections": [ { "heading": string, "paragraphs": string[], "bullets"?: string[], "productId"?: string (an id from the supplied products) } ]
}`;

// `request`: { type, topic, audience, tone, length, language, instructions, products: facts[], collection?: {name, description},
//              section?: { heading, index } , currentText?: string }
export function buildAiPrompt(request) {
  const type = getBlogType(request.type);
  const length = AI_LENGTHS[request.length] ? request.length : 'medium';
  const lines = [
    `Article format: ${type.label} - ${type.description}`,
    `Topic: ${clip(request.topic, 300) || 'Not specified (choose a sensible angle from the products)'}`,
    `Audience: ${clip(request.audience, 200) || 'General shoppers in India'}`,
    `Tone: ${AI_TONES.includes(request.tone) ? request.tone : AI_TONES[0]}`,
    `Language: ${clip(request.language, 40) || 'English'}`,
    `Target length: ${AI_LENGTHS[length]}`,
  ];
  if (request.instructions) lines.push(`Extra instructions from the editor: ${clip(request.instructions, 1500)}`);
  if (request.collection) lines.push(`Collection: ${JSON.stringify({ name: clip(request.collection.name, 120), description: clip(request.collection.description, 400) })}`);
  lines.push(`Products (verified catalogue data):\n${JSON.stringify(request.products ?? [], null, 1)}`);

  if (request.section) {
    lines.push(
      `Rewrite ONLY the section titled "${clip(request.section.heading, 160)}". Keep the same purpose and avoid repeating the rest of the article.`,
      `For context, the current article text is:\n${clip(request.currentText, 6000)}`,
      'Reply with a JSON object of the shape { "sections": [ one section ] }.'
    );
  } else {
    lines.push(`Write the full article. Reply with a JSON object of this shape:\n${SHAPE}`);
  }
  return { system: SYSTEM, user: lines.join('\n\n') };
}

// ---- reading the reply ------------------------------------------------------------

function extractJson(text) {
  const raw = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

const strings = (value, max, limit) => (Array.isArray(value) ? value : []).map((v) => clip(v, max)).filter(Boolean).slice(0, limit);

// Returns a clean draft, or null if the reply is unusable. `allowedProductIds` are the ids we sent.
export function parseAiResponse(text, allowedProductIds = []) {
  const data = extractJson(text);
  if (!data || typeof data !== 'object') return null;
  const allowed = new Set(allowedProductIds.map(String));
  const sections = (Array.isArray(data.sections) ? data.sections : [])
    .slice(0, 14)
    .map((s) => ({
      heading: clip(s?.heading, 160),
      paragraphs: strings(s?.paragraphs, 2000, 8),
      bullets: strings(s?.bullets, 300, 10),
      productId: allowed.has(String(s?.productId)) ? String(s.productId) : '',
    }))
    .filter((s) => s.heading || s.paragraphs.length || s.bullets.length);
  if (!sections.length) return null;
  return {
    title: clip(data.title, 160),
    excerpt: clip(data.excerpt, 300),
    seoTitle: clip(data.seoTitle, 70),
    seoDescription: clip(data.seoDescription, 170),
    tags: strings(data.tags, 40, 6).map((t) => t.toLowerCase()),
    sections,
  };
}

// ---- turning a draft into editor content --------------------------------------------

const text = (value) => ({ type: 'text', text: value });
const para = (value) => ({ type: 'paragraph', content: [text(value)] });

export function sectionToNodes(section) {
  const nodes = [];
  if (section.heading) nodes.push({ type: 'heading', attrs: { level: 2 }, content: [text(section.heading)] });
  section.paragraphs.forEach((p) => nodes.push(para(p)));
  if (section.bullets?.length) nodes.push({ type: 'bulletList', content: section.bullets.map((b) => ({ type: 'listItem', content: [para(b)] })) });
  if (section.productId) nodes.push({ type: 'productCard', attrs: { productId: section.productId } });
  return nodes;
}

export function draftToDoc(draft) {
  const content = draft.sections.flatMap(sectionToNodes);
  return sanitizeDoc({ type: 'doc', content: content.length ? content : emptyDoc().content });
}

// Replaces the n-th level-2 section (its heading and everything up to the next level-2 heading) with new nodes,
// leaving the rest of the article untouched. Returns the original document if there is no such section.
export function replaceSection(input, index, newNodes) {
  const doc = sanitizeDoc(input);
  const starts = doc.content.map((n, i) => (n.type === 'heading' && n.attrs.level === 2 ? i : -1)).filter((i) => i !== -1);
  if (index < 0 || index >= starts.length) return doc;
  const from = starts[index];
  const to = starts[index + 1] ?? doc.content.length;
  return sanitizeDoc({ type: 'doc', content: [...doc.content.slice(0, from), ...newNodes, ...doc.content.slice(to)] });
}

// The level-2 sections of a document: their headings, for the "regenerate this section" picker.
export function listSections(input) {
  return sanitizeDoc(input).content.filter((n) => n.type === 'heading' && n.attrs.level === 2).map((n, index) => ({ index, heading: nodeText(n) }));
}
