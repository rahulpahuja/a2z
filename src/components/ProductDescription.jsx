import { parseDescription } from '../utils/richText.js';
import './ProductDescription.css';

// Renders an admin-written description as paragraphs and bullet lists. Everything is
// a React element, so markup typed into a description is shown as text, not parsed.
export default function ProductDescription({ text, variant = 'compact', className = '' }) {
  const blocks = parseDescription(text);
  if (blocks.length === 0) return null;

  const rootClass = ['product-description', `product-description--${variant}`, className].filter(Boolean).join(' ');
  return (
    <div className={rootClass}>
      {blocks.map((block, index) =>
        block.type === 'list' ? (
          <ul key={index} className="product-description__list">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="product-description__item">{item}</li>
            ))}
          </ul>
        ) : (
          <p key={index} className="product-description__paragraph">{block.text}</p>
        ),
      )}
    </div>
  );
}
