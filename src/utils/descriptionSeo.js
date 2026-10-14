// Advisory checklist for a product description. Everything here is a heuristic that
// reports; nothing edits the text. Contradiction checks in particular only ever warn,
// because phrasing such as "also available in red" is legitimate.
import { descriptionToPlain } from './richText.js';
import { findDuplicatePhrases } from './descriptionFormat.js';
import { getAllSizeNames, getColorName } from './productColors.js';

export const META_LENGTH = 160;
export const LENGTH_FAIL_BELOW = 80;
export const LENGTH_WARN_BELOW = 150;
export const LENGTH_WARN_ABOVE = 1200;
const KEYWORD_WINDOW = 100;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'is', 'are', 'it', 'its', 'this', 'that',
  'your', 'you', 'at', 'by', 'as', 'be', 'from', 'has', 'have', 'will', 'can', 'not', 'but', 'any', 'all', 'our',
]);
// Words that appear in titles and categories but are poor SEO keywords on their own.
const GENERIC_KEYWORDS = new Set(['men', 'women', 'mens', 'womens', 'unisex', 'new', 'set', 'wear', 'collection']);

const words = (text) => String(text ?? '').toLowerCase().match(/[a-z0-9ऀ-ॿ]+/g) ?? [];
const stem = (word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word);
const STATUS_RANK = { pass: 0, warn: 1, fail: 2 };
const worst = (...statuses) => statuses.reduce((a, b) => (STATUS_RANK[b] > STATUS_RANK[a] ? b : a), 'pass');

const check = (id, label, status, message, extra = {}) => ({ id, label, status, message, ...extra });

// --- Keywords -------------------------------------------------------------------
export function extractKeywords(product) {
  const hashtags = Array.isArray(product?.hashtags) ? product.hashtags : String(product?.hashtags ?? '').split(/[\s,]+/);
  const sources = [product?.title ?? product?.name, product?.categoryTitle ?? product?.category, product?.subcategoryTitle, ...hashtags];
  const keywords = new Set();
  sources.forEach((source) =>
    words(source).forEach((word) => {
      if (word.length >= 3 && !STOPWORDS.has(word) && !GENERIC_KEYWORDS.has(word)) keywords.add(stem(word));
    }),
  );
  return [...keywords];
}

// --- Colours --------------------------------------------------------------------
const COLOUR_WORDS = [
  'red', 'blue', 'navy', 'black', 'brown', 'white', 'pink', 'green', 'yellow', 'orange', 'purple', 'maroon', 'beige',
  'cream', 'grey', 'gray', 'gold', 'golden', 'silver', 'mustard', 'teal', 'turquoise', 'peach', 'lavender', 'violet',
  'magenta', 'wine', 'olive', 'khaki', 'coral', 'lilac', 'rust', 'ivory', 'burgundy', 'mint', 'tan',
];
const COLOUR_SET = new Set(COLOUR_WORDS);
const COLOUR_ALIASES = { gray: 'grey', golden: 'gold', violet: 'purple' };
const canonicalColour = (word) => COLOUR_ALIASES[word] ?? word;
const AVAILABILITY_LEAD = /(?:also\s+available\s+in|available\s+in|comes\s+in|also\s+comes\s+in|also\s+in|other\s+colou?rs?)\s*(?:[a-z]+\s*[,/&]?\s*(?:and\s+)?){0,3}$/;

// A listed shade also covers the broader colour it belongs to ("Navy Blue" -> blue, "Maroon" -> red).
const COLOUR_FAMILY = {
  navy: ['blue'], teal: ['blue', 'green'], turquoise: ['blue', 'green'], maroon: ['red'], wine: ['red'], burgundy: ['red'],
  olive: ['green'], mint: ['green'], peach: ['orange', 'pink'], coral: ['orange', 'pink'], mustard: ['yellow'],
  lavender: ['purple'], lilac: ['purple'], magenta: ['pink'],
};

function productColourSet(product) {
  const set = new Set();
  (product?.colors ?? []).forEach((color) =>
    words(getColorName(color)).forEach((word) => {
      if (!COLOUR_SET.has(word)) return;
      set.add(canonicalColour(word));
      (COLOUR_FAMILY[word] ?? []).forEach((family) => set.add(family));
    }),
  );
  return set;
}

function describedColours(plain) {
  const lower = plain.toLowerCase();
  const found = [];
  for (const match of lower.matchAll(/[a-z]+/g)) {
    if (!COLOUR_SET.has(match[0])) continue;
    const before = lower.slice(Math.max(0, match.index - 40), match.index);
    found.push({
      word: match[0],
      colour: canonicalColour(match[0]),
      availabilityPhrasing: AVAILABILITY_LEAD.test(before),
      singularColourPhrase: /^\s*(?:colou?r|shade|hue|tone)\b/.test(lower.slice(match.index + match[0].length)),
    });
  }
  return found;
}

function colourContradictions(plain, product) {
  const listed = productColourSet(product);
  const names = (product?.colors ?? []).map(getColorName).filter(Boolean);
  if (names.length === 0) return { checked: false, items: [] };
  const mentioned = describedColours(plain);
  const items = [];
  const reported = new Set();

  mentioned.forEach((entry) => {
    if (listed.has(entry.colour) || reported.has(entry.colour)) return;
    reported.add(entry.colour);
    items.push({
      type: 'colour',
      term: entry.word,
      message: entry.availabilityPhrasing
        ? `Mentions "${entry.word}" as an available colour, but the colours listed are ${names.join(', ')}. Ignore this if it points to a colour sold elsewhere.`
        : `Mentions "${entry.word}", which is not among the listed colours (${names.join(', ')}).`,
    });
  });

  // One colour presented as "the colour" while the listing sells several (e.g. "vibrant red colour").
  const distinct = [...new Set(mentioned.map((entry) => entry.colour))];
  const lone = mentioned.find((entry) => entry.singularColourPhrase && !entry.availabilityPhrasing);
  if (lone && distinct.length === 1 && names.length >= 2 && listed.has(lone.colour)) {
    items.push({
      type: 'colour-scope',
      term: lone.word,
      message: `Describes the product as "${lone.word}" while it is listed in ${names.length} colours (${names.join(', ')}). Shoppers who pick another colour may see a mismatch; consider wording that holds for every colour.`,
    });
  }
  return { checked: true, items };
}

// --- Sizes ----------------------------------------------------------------------
const SIZE_SCALE = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL'];
const SIZE_ALIASES = { '2XL': 'XXL', '3XL': 'XXXL' };
const SIZE_TOKEN = '(?:XXS|XS|S|M|L|XL|XXL|XXXL|[2-5]XL)';
const canonicalSize = (token) => {
  const upper = String(token).toUpperCase().replace(/\s+/g, '');
  return SIZE_ALIASES[upper] ?? upper;
};

function describedSizes(text) {
  const found = new Set();
  const add = (token) => found.add(canonicalSize(token));

  // Multi-letter tokens are unambiguous anywhere in the text.
  for (const match of text.matchAll(/\b(XXS|XS|XL|XXL|XXXL|[2-5]XL)\b/g)) add(match[1]);

  // Single letters only count in size lists/ranges or right after the word "size".
  const listPattern = new RegExp(`\\b${SIZE_TOKEN}(?:\\s*(?:,|/|&|and|to|-)\\s*${SIZE_TOKEN})+\\b`, 'g');
  for (const match of text.matchAll(listPattern)) {
    const tokens = match[0].match(new RegExp(`\\b${SIZE_TOKEN}\\b`, 'g')).map(canonicalSize);
    const isRange = tokens.length === 2 && /\bto\b|-/.test(match[0]) && !/[,/&]|\band\b/.test(match[0]);
    if (isRange) {
      const from = SIZE_SCALE.indexOf(tokens[0]);
      const to = SIZE_SCALE.indexOf(tokens[1]);
      if (from !== -1 && to > from) SIZE_SCALE.slice(from, to + 1).forEach((size) => found.add(size));
      else tokens.forEach((token) => found.add(token));
    } else {
      tokens.forEach((token) => found.add(token));
    }
  }
  for (const match of text.matchAll(new RegExp(`\\bsizes?\\s*[:\\-]?\\s*(${SIZE_TOKEN})\\b`, 'gi'))) {
    if (match[1] === match[1].toUpperCase()) add(match[1]);
  }
  return found;
}

function sizeContradictions(text, product) {
  const listed = new Set(
    [...(product?.sizes ?? []), ...getAllSizeNames(product?.colors, product?.sizes)].map((size) => canonicalSize(size)),
  );
  listed.delete('');
  if (listed.size === 0) return { checked: false, items: [] };
  const items = [...describedSizes(text)]
    .filter((size) => !listed.has(size))
    .map((size) => ({
      type: 'size',
      term: size,
      message: `Mentions size ${size}, which is not among the listed sizes (${[...listed].join(', ')}).`,
    }));
  return { checked: true, items };
}

// --- Gender ---------------------------------------------------------------------
const FEMALE_WORDS = new Set(['women', 'woman', 'womens', 'ladies', 'lady', 'girls', 'girl', 'female', 'bride', 'her']);
const MALE_WORDS = new Set(['men', 'man', 'mens', 'gents', 'boys', 'boy', 'male', 'groom', 'him', 'his']);

function genderContradictions(text, product) {
  const gender = String(product?.gender ?? '').toLowerCase();
  if (gender !== 'male' && gender !== 'female') return { checked: false, items: [] };
  const tokens = words(text.replace(/man-made/gi, ' ').replace(/\b(women|men)['’]s\b/gi, '$1'));
  const wrongSet = gender === 'male' ? FEMALE_WORDS : MALE_WORDS;
  const hits = [...new Set(tokens.filter((token) => wrongSet.has(token)))];
  return {
    checked: true,
    items: hits.map((term) => ({
      type: 'gender',
      term,
      message: `Uses "${term}" but the product gender is set to ${product.gender}.`,
    })),
  };
}

export function findContradictions(text, product) {
  const plain = descriptionToPlain(text);
  const results = [colourContradictions(plain, product), sizeContradictions(plain, product), genderContradictions(plain, product)];
  return { checked: results.some((r) => r.checked), items: results.flatMap((r) => r.items) };
}

// --- Checklist ------------------------------------------------------------------
const sentencesOf = (plain) => plain.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];

function checkLength(plain) {
  const length = plain.length;
  if (length === 0) return check('length', 'Length', 'fail', 'The description is empty.');
  if (length < LENGTH_FAIL_BELOW) return check('length', 'Length', 'fail', `${length} characters is too short to describe the product (aim for ${LENGTH_WARN_BELOW}+).`);
  if (length < LENGTH_WARN_BELOW) return check('length', 'Length', 'warn', `${length} characters; ${LENGTH_WARN_BELOW}+ gives search engines a full snippet.`);
  if (length > LENGTH_WARN_ABOVE) return check('length', 'Length', 'warn', `${length} characters is long; consider trimming to under ${LENGTH_WARN_ABOVE}.`);
  return check('length', 'Length', 'pass', `${length} characters.`);
}

function checkMeta(plain) {
  if (!plain) return check('meta', 'Search snippet', 'fail', 'No text to use as a search snippet.');
  const snippet = plain.length > META_LENGTH ? plain.slice(0, META_LENGTH) : plain;
  const problems = [];
  if (/^[A-Z][A-Za-z]*(?:\s+(?:&|and|of|for|[A-Z][A-Za-z]*)){0,4}:\s/.test(plain)) {
    problems.push('it opens with a spec label rather than a sentence');
  }
  if (plain.length > META_LENGTH && !/[.!?]/.test(snippet)) problems.push('the first 160 characters contain no complete sentence');
  if (plain.length < 120) problems.push('it is shorter than a typical 150-160 character snippet');
  return problems.length > 0
    ? check('meta', 'Search snippet', 'warn', `As a snippet, ${problems.join('; ')}.`, { snippet })
    : check('meta', 'Search snippet', 'pass', 'The opening reads as a complete snippet.', { snippet });
}

function checkKeyword(plain, product) {
  const keywords = extractKeywords(product);
  if (keywords.length === 0) return check('keyword', 'Keyword near the start', 'warn', 'Add a title, category or hashtags so a keyword can be checked.');
  const present = (text) => {
    const tokens = new Set(words(text).map(stem));
    return keywords.filter((keyword) => tokens.has(keyword));
  };
  const early = present(plain.slice(0, KEYWORD_WINDOW));
  if (early.length > 0) return check('keyword', 'Keyword near the start', 'pass', `"${early[0]}" appears in the first ${KEYWORD_WINDOW} characters.`);
  if (present(plain).length > 0) return check('keyword', 'Keyword near the start', 'warn', `A keyword appears, but not in the first ${KEYWORD_WINDOW} characters. Try opening with the product type.`);
  return check('keyword', 'Keyword near the start', 'fail', `None of ${keywords.slice(0, 4).join(', ')} appears in the description.`);
}

function checkStuffing(plain) {
  const tokens = words(plain).filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  if (tokens.length < 10) return check('stuffing', 'Keyword repetition', 'pass', 'Too short for repetition to matter.');
  const counts = new Map();
  tokens.forEach((token) => counts.set(stem(token), (counts.get(stem(token)) ?? 0) + 1));
  const [top, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const ratio = count / tokens.length;
  const percent = Math.round(ratio * 100);
  if (count >= 4 && ratio > 0.12) return check('stuffing', 'Keyword repetition', 'fail', `"${top}" makes up ${percent}% of the meaningful words; this reads as keyword stuffing.`);
  if (count >= 3 && ratio > 0.07) return check('stuffing', 'Keyword repetition', 'warn', `"${top}" is repeated ${count} times (${percent}% of the meaningful words).`);
  return check('stuffing', 'Keyword repetition', 'pass', 'No word is overused.');
}

function checkReadability(plain) {
  if (!plain) return check('readability', 'Readability', 'fail', 'Nothing to read.');
  const sentences = sentencesOf(plain);
  const lengths = sentences.map((sentence) => words(sentence).length);
  const average = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);
  const longest = Math.max(...lengths);
  const letters = plain.replace(/[^A-Za-z]/g, '');
  const capsRatio = letters.length > 0 ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0;
  const problems = [];
  let status = 'pass';
  if (average > 28) {
    status = 'fail';
    problems.push(`sentences average ${Math.round(average)} words`);
  } else if (average > 20) {
    status = worst(status, 'warn');
    problems.push(`sentences average ${Math.round(average)} words (aim for under 20)`);
  }
  if (longest > 40) {
    status = worst(status, 'warn');
    problems.push(`one sentence runs ${longest} words`);
  }
  if (capsRatio > 0.3 && letters.length > 20) {
    status = worst(status, 'warn');
    problems.push('a lot of the text is capitals');
  }
  return check('readability', 'Readability', status, problems.length > 0 ? `${problems.join('; ')}.` : `Sentences average ${Math.round(average)} words.`);
}

function checkDuplicates(text) {
  const duplicates = findDuplicatePhrases(descriptionToPlain(text));
  return duplicates.length > 0
    ? check('duplicates', 'Repeated phrases', 'warn', `Repeated: ${duplicates.map((d) => `"${d.phrase}" (x${d.count})`).join(', ')}.`, { duplicates })
    : check('duplicates', 'Repeated phrases', 'pass', 'No repeated phrases.');
}

function checkContradictions(text, product) {
  const result = findContradictions(text, product);
  if (result.items.length > 0) {
    return check('contradictions', 'Matches the listing', 'warn', `${result.items.length} possible mismatch${result.items.length === 1 ? '' : 'es'} with the colours, sizes or gender below. Review only; nothing is changed automatically.`, { items: result.items });
  }
  return check(
    'contradictions',
    'Matches the listing',
    'pass',
    result.checked ? 'No colour, size or gender mismatches found.' : 'Not checked: add colours, sizes or a gender to compare.',
    { items: [], skipped: !result.checked },
  );
}

/**
 * Runs every check. `product` may carry title, categoryTitle, subcategoryTitle,
 * hashtags (array or string), colors ([{ name }] or strings), sizes and gender.
 * @returns {{ checks: Array, contradictions: Array, summary: { pass: number, warn: number, fail: number } }}
 */
export function analyzeDescription(text, product = {}) {
  const plain = descriptionToPlain(text);
  const checks = [
    checkLength(plain),
    checkMeta(plain),
    checkKeyword(plain, product),
    checkStuffing(plain),
    checkReadability(plain),
    checkDuplicates(text),
    checkContradictions(text, product),
  ];
  const summary = { pass: 0, warn: 0, fail: 0 };
  checks.forEach((c) => {
    summary[c.status] += 1;
  });
  return { checks, contradictions: checks.find((c) => c.id === 'contradictions').items, summary };
}
