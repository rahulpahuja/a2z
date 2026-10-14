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

/**
 * Tidies a description. Pure and idempotent.
 * @param {unknown} raw
 * @returns {string}
 */
export function formatDescription(raw) {
  const rendered = promoteLabelRuns(parseLines(raw)).map(renderLine);
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
