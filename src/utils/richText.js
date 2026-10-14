// Admin descriptions are plain text with a light convention: blank lines separate
// paragraphs and lines starting with "- " or "• " are bullets. The output is data
// (never HTML), so callers render it as React elements and any markup typed into a
// description stays inert text.

const BULLET_PATTERN = /^[-•]\s+(.*)$/;

const cleanLine = (line) => line.replace(/\s+/g, ' ').trim();

/**
 * Splits a description into renderable blocks.
 * @param {unknown} text
 * @returns {Array<{ type: 'paragraph', text: string } | { type: 'list', items: string[] }>}
 */
export function parseDescription(text) {
  if (typeof text !== 'string') return [];
  const normalised = text.replace(/\r\n?/g, '\n');
  const blocks = [];

  for (const chunk of normalised.split(/\n[^\S\n]*\n/)) {
    let paragraphLines = [];
    let listItems = [];

    const flushParagraph = () => {
      if (paragraphLines.length > 0) blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') });
      paragraphLines = [];
    };
    const flushList = () => {
      if (listItems.length > 0) blocks.push({ type: 'list', items: listItems });
      listItems = [];
    };

    for (const rawLine of chunk.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const bullet = BULLET_PATTERN.exec(line);
      if (bullet) {
        const item = cleanLine(bullet[1]);
        if (!item) continue;
        flushParagraph();
        listItems.push(item);
      } else {
        flushList();
        paragraphLines.push(cleanLine(line));
      }
    }
    flushParagraph();
    flushList();
  }

  return blocks;
}

const TERMINATOR = /[.!?:;]$/;

/**
 * Single-line plain text for meta descriptions, JSON-LD, llms.txt and search.
 * A single-paragraph description comes back unchanged apart from whitespace;
 * separate paragraphs and bullets are joined with sentence breaks so they don't
 * run together.
 * @param {unknown} text
 * @returns {string}
 */
export function descriptionToPlain(text) {
  const pieces = parseDescription(text).flatMap((block) =>
    block.type === 'list' ? block.items : [block.text.replace(/\n/g, ' ')],
  );
  return pieces
    .map((piece, index) => (index < pieces.length - 1 && !TERMINATOR.test(piece) ? `${piece}.` : piece))
    .join(' ');
}
