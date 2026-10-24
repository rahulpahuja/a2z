// Tiny helpers for writing article bodies as the blog's document format (see src/utils/blog/doc.js).
const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });
export const bold = (value) => text(value, [{ type: 'bold' }]);
export const p = (...parts) => ({ type: 'paragraph', content: parts.map((x) => (typeof x === 'string' ? text(x) : x)) });
export const h2 = (value) => ({ type: 'heading', attrs: { level: 2 }, content: [text(value)] });
export const h3 = (value) => ({ type: 'heading', attrs: { level: 3 }, content: [text(value)] });
export const li = (...parts) => ({ type: 'listItem', content: [p(...parts)] });
export const ul = (...items) => ({ type: 'bulletList', content: items });
export const doc = (...content) => ({ type: 'doc', content });
