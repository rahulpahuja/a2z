import { emptyDoc } from './doc.js';

// The eight article formats. `products` says what the editor requires from the product
// picker; `layout` sets which blocks the starter document contains. The super user can
// change everything after choosing.
//   products.mode: 'none' | 'optional' | 'single' | 'multi' | 'collection'
export const BLOG_TYPES = [
  {
    id: 'spotlight',
    label: 'Single Product Spotlight',
    icon: 'star',
    description: 'One product: its features, benefits, use cases and a direct shopping link.',
    products: { mode: 'single', min: 1, max: 1 },
  },
  {
    id: 'multi',
    label: 'Multi-Product Feature',
    icon: 'view_list',
    description: 'Several products in one article, each with its own product card.',
    products: { mode: 'multi', min: 2, max: 12 },
  },
  {
    id: 'collection',
    label: 'Collection Story',
    icon: 'collections_bookmark',
    description: 'An editorial article about one collection, with products from it.',
    products: { mode: 'collection', min: 0, max: 40 },
  },
  {
    id: 'guide',
    label: 'Buying Guide',
    icon: 'menu_book',
    description: 'Helps customers choose between relevant products.',
    products: { mode: 'optional', min: 0, max: 12 },
  },
  {
    id: 'comparison',
    label: 'Product Comparison',
    icon: 'compare',
    description: 'Side-by-side comparison of 2–4 products, using the catalog\'s own details.',
    products: { mode: 'multi', min: 2, max: 4 },
  },
  {
    id: 'style',
    label: 'Style & Inspiration',
    icon: 'checkroom',
    description: 'Outfit ideas, styling tips and seasonal trends.',
    products: { mode: 'optional', min: 0, max: 12 },
  },
  {
    id: 'gift',
    label: 'Gift Guide',
    icon: 'redeem',
    description: 'Recommendations organised by recipient, occasion or budget.',
    products: { mode: 'optional', min: 0, max: 20 },
  },
  {
    id: 'general',
    label: 'General Editorial',
    icon: 'article',
    description: 'An article without any required product links.',
    products: { mode: 'none', min: 0, max: 12 },
  },
];

const TYPE_BY_ID = new Map(BLOG_TYPES.map((t) => [t.id, t]));
export const isBlogType = (id) => TYPE_BY_ID.has(id);
export const getBlogType = (id) => TYPE_BY_ID.get(id) ?? TYPE_BY_ID.get('general');

// Types that show on the landing page's "product guides" shelf.
export const GUIDE_TYPES = new Set(['guide', 'comparison', 'gift', 'spotlight', 'multi']);

// What is wrong with a post's product/collection associations for its type, as messages.
// `requireForPublish` is stricter than saving a draft: an unfinished draft may be incomplete.
export function validateAssociations(type, { productIds = [], collectionIds = [], primaryCollectionId = '' }, { requireForPublish = false } = {}) {
  const def = getBlogType(type);
  const { mode, min, max } = def.products;
  const problems = [];
  const count = productIds.length;
  if (count > max) problems.push(`${def.label} allows at most ${max} product${max === 1 ? '' : 's'} (you have ${count}).`);
  if (requireForPublish) {
    if (count < min) problems.push(`${def.label} needs ${min === max ? `exactly ${min}` : `at least ${min}`} product${min === 1 ? '' : 's'} before it can be published.`);
    if (mode === 'collection' && !primaryCollectionId) problems.push('Choose the collection this story is about before publishing.');
  }
  if (primaryCollectionId && !collectionIds.includes(primaryCollectionId)) problems.push('The primary collection must be one of the selected collections.');
  return problems;
}

// ---- starter documents -------------------------------------------------------

const h = (level, text) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const p = (text) => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' });
const ul = (...items) => ({ type: 'bulletList', content: items.map((text) => ({ type: 'listItem', content: [p(text)] })) });
const card = (productId) => ({ type: 'productCard', attrs: { productId } });
const callout = (tone, text) => ({ type: 'callout', attrs: { tone }, content: [p(text)] });

// A skeleton for the chosen format. Product cards are placed only for the products the author
// already associated, so choosing a type never inserts anything they did not pick.
export function buildStarterDoc(type, { productIds = [], collectionIds = [] } = {}) {
  const cards = (ids) => ids.map(card);
  let content;
  switch (type) {
    case 'spotlight':
      content = [p('Tell the story behind this piece in a sentence or two.'), ...cards(productIds.slice(0, 1)), h(2, 'Why we love it'), p(''), h(2, 'Key features'), ul('Feature one', 'Feature two', 'Feature three'), h(2, 'How to wear it'), p(''), callout('tip', 'Add a styling tip or care note here.')];
      break;
    case 'multi':
      content = [p('Introduce the theme of this selection.'), ...productIds.flatMap((id, i) => [h(2, `Pick ${i + 1}`), p(''), card(id)]), h(2, 'Final thoughts'), p('')];
      break;
    case 'collection':
      content = [p('Introduce the collection and what inspired it.'), ...(collectionIds[0] ? [{ type: 'collectionCard', attrs: { collectionId: collectionIds[0] } }] : []), h(2, 'The story'), p(''), h(2, 'Highlights'), ...cards(productIds.slice(0, 4)), h(2, 'How to choose'), p('')];
      break;
    case 'guide':
      content = [p('Say who this guide is for and what it will help them decide.'), h(2, 'What to look for'), ul('Fit and fabric', 'Occasion', 'Budget'), h(2, 'Our recommendations'), ...cards(productIds), h(2, 'Quick tips'), callout('tip', 'Finish with the one piece of advice you would give a friend.')];
      break;
    case 'comparison':
      content = [p('Explain what is being compared and why.'), { type: 'comparison', attrs: { productIds: productIds.slice(0, 4) } }, h(2, 'Which one should you choose?'), p(''), ...cards(productIds.slice(0, 4))];
      break;
    case 'style':
      content = [p('Set the mood: the occasion, the season, the look.'), h(2, 'The look'), p(''), h(2, 'Shop the look'), ...cards(productIds), h(2, 'Styling tips'), ul('Tip one', 'Tip two', 'Tip three')];
      break;
    case 'gift':
      content = [p('Who are these gifts for, and what is the occasion?'), h(2, 'Gifts by budget'), p(''), h(2, 'Our picks'), ...cards(productIds), callout('note', 'Mention delivery times and gift options here only if they are accurate.')];
      break;
    default:
      return emptyDoc();
  }
  return { type: 'doc', content: content.length ? content : [p('')] };
}
