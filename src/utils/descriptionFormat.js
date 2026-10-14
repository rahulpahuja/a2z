// Rules-based tidy-up for admin product descriptions. Deterministic and idempotent
// (formatDescription(formatDescription(x)) === formatDescription(x)); it never invents
// facts, it only re-flows, re-punctuates and re-spells what the admin already wrote.

// --- Spelling -------------------------------------------------------------------
// Whitelist only. Colour names such as "Gray" are deliberately absent so a description
// keeps matching the product's own colour list.
const SPELLING_FIXES = [
  ['color', 'colour'],
  ['colors', 'colours'],
  ['colored', 'coloured'],
  ['colorful', 'colourful'],
  ['colorfast', 'colourfast'],
  ['jewelry', 'jewellery'],
  ['favorite', 'favourite'],
  ['favorites', 'favourites'],
  ['center', 'centre'],
  ['pajama', 'pyjama'],
  ['pajamas', 'pyjamas'],
];
const SPELLING_PATTERN = new RegExp(`\\b(${SPELLING_FIXES.map(([from]) => from).join('|')})\\b`, 'gi');
const SPELLING_LOOKUP = new Map(SPELLING_FIXES);

const matchCase = (source, replacement) => {
  if (source === source.toUpperCase() && source.length > 1) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
};

export const fixSpelling = (text) =>
  text.replace(SPELLING_PATTERN, (word) => matchCase(word, SPELLING_LOOKUP.get(word.toLowerCase())));

// --- Labelled runs --------------------------------------------------------------
// "Colour & Base Fabric: Navy cotton Design & Pattern: Floral" -> one label per bullet.
const LABEL_PATTERN = /(^|\s)([A-Z][A-Za-z]*(?:\s+(?:&|and|of|for|[A-Z][A-Za-z]*)){0,4}):(?=\s|$)/g;
const LABEL_MAX_LENGTH = 40;
const LABEL_AT_START = /^[A-Z][A-Za-z]*(?:\s+(?:&|and|of|for|[A-Z][A-Za-z]*)){0,4}:(?=\s|$)/;

const startsWithLabel = (text) => {
  const match = LABEL_AT_START.exec(text);
  return Boolean(match) && match[0].length - 1 <= LABEL_MAX_LENGTH;
};

const findLabelStarts = (text) => {
  const starts = [];
  for (const match of text.matchAll(LABEL_PATTERN)) {
    if (match[2].length <= LABEL_MAX_LENGTH) starts.push(match.index + match[1].length);
  }
  return starts;
};

const trimSegment = (segment) => segment.replace(/[\s;,]+$/, '').trim();

// Returns { intro, segments } when the line holds two or more labelled runs, else null.
const splitLabelledRuns = (text) => {
  const starts = findLabelStarts(text);
  if (starts.length < 2) return null;
  return {
    intro: trimSegment(text.slice(0, starts[0])),
    segments: starts.map((start, index) => trimSegment(text.slice(start, starts[index + 1] ?? text.length))),
  };
};

// --- Sentence level -------------------------------------------------------------
const ABBREVIATIONS = new Set(['e.g', 'i.e', 'approx', 'etc', 'vs', 'no', 'cm', 'mm', 'in', 'ft', 'pcs', 'pc', 'rs', 'mr', 'mrs', 'dr', 'st', 'inc', 'co']);

const capitaliseFirst = (text) => text.replace(/^([("'“‘]*)([a-z])/, (_m, lead, ch) => lead + ch.toUpperCase());

const capitaliseSentences = (text) =>
  capitaliseFirst(text).replace(/([.!?])(\s+)([a-z])/g, (match, mark, space, letter, offset, whole) => {
    if (mark === '.') {
      const word = /([A-Za-z.]+)$/.exec(whole.slice(0, offset))?.[1]?.toLowerCase();
      if (word && (word.length === 1 || ABBREVIATIONS.has(word))) return match;
    }
    return mark + space + letter.toUpperCase();
  });

const tidySpacing = (text) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:!?.])/g, '$1')
    .replace(/,(?=[A-Za-z])/g, ', ')
    .replace(/([a-z]{3,})\.(?=[A-Z][a-z])/g, '$1. ')
    .replace(/([!?])\1+/g, '$1')
    .replace(/(^|[^.])\.\.(?!\.)/g, '$1.')
    .trim();

const WORD_COUNT_FOR_PERIOD = 4;
const needsPeriod = (text) => /[A-Za-z0-9)’'"]$/.test(text) && text.split(/\s+/).length >= WORD_COUNT_FOR_PERIOD;

const cleanText = (text) => capitaliseSentences(fixSpelling(tidySpacing(text)));

// --- Line model -----------------------------------------------------------------
const BULLET_MARKER = /^[-•*]\s+/;

const toLines = (raw) => String(raw ?? '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim());

function parseLines(raw) {
  const lines = [];
  for (const line of toLines(raw)) {
    if (!line) {
      lines.push({ kind: 'blank' });
      continue;
    }
    const isBullet = BULLET_MARKER.test(line);
    const text = tidySpacing(isBullet ? line.replace(BULLET_MARKER, '') : line);
    if (!text) continue;
    const split = splitLabelledRuns(text);
    if (split) {
      if (split.intro) lines.push({ kind: isBullet ? 'bullet' : 'paragraph', text: split.intro });
      split.segments.forEach((segment) => lines.push({ kind: 'bullet', text: segment, labelled: true }));
    } else {
      lines.push({ kind: isBullet ? 'bullet' : 'paragraph', text, labelled: startsWithLabel(text) });
    }
  }
  return lines;
}

// A run of adjacent label lines ("Fabric: Silk" / "Colour: Red") reads best as a list.
function promoteLabelRuns(lines) {
  const isLabelled = (line) => line?.labelled === true;
  return lines.map((line, index) =>
    line.kind === 'paragraph' && line.labelled && (isLabelled(lines[index - 1]) || isLabelled(lines[index + 1]))
      ? { ...line, kind: 'bullet' }
      : line,
  );
}

function renderLine(line) {
  if (line.kind === 'blank') return '';
  const text = cleanText(line.text);
  if (line.kind === 'bullet') return `- ${text}`;
  return !line.labelled && needsPeriod(text) ? `${text}.` : text;
}

// --- Paragraph -> intro, feature bullets, occasion bullets ----------------------
// A single plain paragraph ("Designed with a, b, c and d, these pants ... Perfect for x, y,
// and z.") reads better as an intro, a bulleted feature list and a bulleted "Perfect for:"
// list. Only the structure changes: every word the admin wrote is kept, nothing is added
// except the "Perfect for:" / "Designed with:" lead-in that repeats the original phrase.
// Text that already has several lines, bullets or labels is left alone, so the result of
// formatDescription never gets restructured a second time.
const MIN_SENTENCES_TO_STRUCTURE = 3;
const MIN_LIST_ITEMS = 3;
const MAX_LIST_ITEM_WORDS = 6;
const OCCASION_LEAD = /^(perfect|ideal|great|suitable|best)\s+for\s+(.+?)[.!?]*$/i;
const FEATURE_LEAD = /^(designed with|made with|crafted with|equipped with|packed with|comes with|featuring|features|includes)\s+(.+?)[.!?]*$/i;
const LEADING_ARTICLE = /^(a|an|the)\s+/i;
const GERUND_START = /^[a-z]+ing\b/i;
const CLAUSE_START = /^(and|or)\s+/i;

const upperFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const splitSentences = (text) => {
  const sentences = [];
  let start = 0;
  for (const match of text.matchAll(/[.!?]+(\s+)(?=[A-Z0-9"'“(])/g)) {
    const before = text.slice(start, match.index);
    const word = /([A-Za-z.]+)$/.exec(before)?.[1]?.toLowerCase();
    if (match[0].startsWith('.') && word && (word.length === 1 || ABBREVIATIONS.has(word.replace(/\.$/, '')))) continue;
    sentences.push(text.slice(start, match.index + match[0].length - match[1].length));
    start = match.index + match[0].length;
  }
  sentences.push(text.slice(start));
  return sentences.map((sentence) => sentence.trim()).filter(Boolean);
};

const isCleanListItem = (item) =>
  item.length > 0 && item.split(/\s+/).length <= MAX_LIST_ITEM_WORDS && !/\sfor\s/i.test(item) && !GERUND_START.test(item);

// "casual outings, Korean-inspired outfits, and trendy urban looks" -> three items, or
// null when the sentence is not a plain noun list (so it stays an ordinary sentence).
const parseOccasionItems = (body) => {
  const parts = body.split(/\s*,\s*/).map((part) => part.replace(CLAUSE_START, '').trim());
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  const items = [...parts.slice(0, -1), ...last.split(/\s+(?:and|or)\s+/i)].filter(Boolean);
  return items.length >= MIN_LIST_ITEMS && items.every(isCleanListItem) ? items.map(upperFirst) : null;
};

// "a comfortable waistband, adjustable drawstring, and a light feel, these pants combine ..."
// -> the list up to the first "and ..." item, plus whatever clause follows it.
const parseFeatureItems = (body) => {
  const parts = body.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean);
  const endIndex = parts.findIndex((part) => CLAUSE_START.test(part));
  if (endIndex === -1) return null;
  const items = [...parts.slice(0, endIndex), parts[endIndex].replace(CLAUSE_START, '')]
    .map((item) => item.replace(LEADING_ARTICLE, '').trim())
    .filter(Boolean);
  if (items.length < MIN_LIST_ITEMS || !items.every(isCleanListItem)) return null;
  return { items: items.map(upperFirst), trailing: parts.slice(endIndex + 1).join(', ') };
};

function restructureParagraph(raw) {
  const lines = toLines(raw).filter(Boolean);
  if (lines.length !== 1 || BULLET_MARKER.test(lines[0])) return raw;
  const text = tidySpacing(lines[0]);
  if (startsWithLabel(text) || splitLabelledRuns(text)) return raw;

  const sentences = splitSentences(capitaliseSentences(text));
  if (sentences.length < MIN_SENTENCES_TO_STRUCTURE) return raw;

  const [intro, ...rest] = sentences;
  let extracted = false;
  const blocks = rest.map((sentence) => {
    const occasion = OCCASION_LEAD.exec(sentence);
    const items = occasion && parseOccasionItems(occasion[2]);
    if (items) {
      extracted = true;
      return [`${upperFirst(occasion[1])} for:`, ...items.map((item) => `- ${item}`)];
    }
    const feature = FEATURE_LEAD.exec(sentence);
    const parsed = feature && parseFeatureItems(feature[2]);
    if (parsed) {
      extracted = true;
      const lines = [`${upperFirst(feature[1])}:`, ...parsed.items.map((item) => `- ${item}`)];
      return parsed.trailing ? [...lines, '', upperFirst(parsed.trailing)] : lines;
    }
    return [sentence];
  });

  // No list found: fall back to one bullet per remaining sentence.
  const body = extracted ? blocks.flatMap((block) => ['', ...block]) : ['', ...rest.map((sentence) => `- ${sentence}`)];
  return [intro, ...body].join('\n');
}

/**
 * Tidies a description. Pure and idempotent.
 * @param {unknown} raw
 * @returns {string}
 */
export function formatDescription(raw) {
  const rendered = promoteLabelRuns(parseLines(restructureParagraph(raw))).map(renderLine);
  const collapsed = rendered.filter((line, index) => line !== '' || (index > 0 && rendered[index - 1] !== ''));
  return collapsed.join('\n').replace(/^\n+|\n+$/g, '');
}

// --- Duplicate phrases ----------------------------------------------------------
const STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'is', 'are', 'it', 'its', 'this', 'that', 'your', 'you', 'at', 'by', 'as', 'be', 'from']);
const GRAM_SIZE = 4;

const tokenise = (text) => String(text ?? '').toLowerCase().match(/[a-z0-9ऀ-ॿ]+/g) ?? [];

/**
 * Detects phrases (4+ words) that appear more than once. Detection only.
 * @param {unknown} text
 * @returns {Array<{ phrase: string, count: number }>}
 */
export function findDuplicatePhrases(text) {
  const tokens = tokenise(text);
  const grams = new Map();
  for (let index = 0; index + GRAM_SIZE <= tokens.length; index += 1) {
    const gram = tokens.slice(index, index + GRAM_SIZE);
    if (gram.filter((word) => !STOPWORDS.has(word)).length < 2) continue;
    const key = gram.join(' ');
    grams.set(key, [...(grams.get(key) ?? []), index]);
  }

  const covered = Array.from({ length: tokens.length }, () => false);
  for (const positions of grams.values()) {
    if (positions.length < 2) continue;
    positions.forEach((position) => {
      for (let offset = 0; offset < GRAM_SIZE; offset += 1) covered[position + offset] = true;
    });
  }

  const runs = new Map();
  let runStart = -1;
  for (let index = 0; index <= tokens.length; index += 1) {
    if (covered[index]) {
      if (runStart === -1) runStart = index;
    } else if (runStart !== -1) {
      const phrase = tokens.slice(runStart, index).join(' ');
      runs.set(phrase, (runs.get(phrase) ?? 0) + 1);
      runStart = -1;
    }
  }

  return [...runs.entries()]
    .filter(([, count]) => count >= 2)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.phrase.length - a.phrase.length)
    .slice(0, 5);
}

// --- Line diff ------------------------------------------------------------------
/**
 * Line-level diff between the original text and its formatted form, grouped into
 * hunks the admin can accept or reject one by one.
 * @returns {Array<{ type: 'same', lines: string[] } | { type: 'change', id: number, before: string[], after: string[] }>}
 */
export function diffDescription(before, after) {
  const a = toLines(before);
  const b = toLines(after);
  while (a.length > 0 && a[a.length - 1] === '') a.pop();
  while (b.length > 0 && b[b.length - 1] === '') b.pop();

  // Longest common subsequence table; descriptions are a handful of lines.
  const table = Array.from({ length: a.length + 1 }, () => Array.from({ length: b.length + 1 }, () => 0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const segments = [];
  const pushSame = (line) => {
    const last = segments[segments.length - 1];
    if (last?.type === 'same') last.lines.push(line);
    else segments.push({ type: 'same', lines: [line] });
  };
  const currentChange = () => {
    const last = segments[segments.length - 1];
    if (last?.type === 'change') return last;
    const change = { type: 'change', id: segments.filter((s) => s.type === 'change').length, before: [], after: [] };
    segments.push(change);
    return change;
  };

  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      pushSame(a[i]);
      i += 1;
      j += 1;
    } else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) {
      currentChange().after.push(b[j]);
      j += 1;
    } else {
      currentChange().before.push(a[i]);
      i += 1;
    }
  }
  return segments;
}

/**
 * Rebuilds the text from a diff, taking the formatted side only for accepted changes.
 * @param {ReturnType<typeof diffDescription>} segments
 * @param {(id: number) => boolean} isAccepted
 */
export function applyDescriptionChanges(segments, isAccepted) {
  return segments
    .flatMap((segment) => {
      if (segment.type === 'same') return segment.lines;
      return isAccepted(segment.id) ? segment.after : segment.before;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
}
