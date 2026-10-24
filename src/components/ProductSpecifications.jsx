import { getOptionalSpecs } from '../utils/productSpecs.js';

// The product's specification rows in an expandable panel (closed until opened), sitting under the description.
export default function ProductSpecifications({ product, inStock, className = '' }) {
  const rows = [
    { label: 'Category', value: product.category },
    { label: 'Availability', value: inStock ? 'In Stock' : 'Out of Stock' },
    ...getOptionalSpecs(product),
  ].filter((row) => row.value);

  return (
    <details className={`product-specs group border-t border-b border-outline-variant/30 ${className}`.trim()}>
      <summary className="flex items-center justify-between gap-3 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden font-title-sm text-title-sm text-on-surface uppercase tracking-widest">
        Specifications
        <span className="material-symbols-outlined transition-transform duration-200 group-open:rotate-180" aria-hidden="true">expand_more</span>
      </summary>
      <dl className="grid grid-cols-2 gap-y-4 gap-x-6 pb-4">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="font-label-caps text-label-caps text-outline mb-1 uppercase">{row.label}</dt>
            <dd className="font-body-sm text-body-sm text-on-surface">{row.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
