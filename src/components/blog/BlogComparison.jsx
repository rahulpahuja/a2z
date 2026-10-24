import { Link } from 'react-router-dom';
import { useProducts } from '../../context/ProductsContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import { getPriceBreakdown } from '../../utils/discount.js';
import { getAllSizeNames, isProductAvailable, normalizeColors } from '../../utils/productColors.js';
import { getOptionalSpecs } from '../../utils/productSpecs.js';
import { useBlogTracker } from './BlogTracker.jsx';

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// The rows of a comparison, built only from what the catalogue actually holds: a row appears when at least
// one product has a value for it, and a product without a value shows an em dash rather than a guess.
export function buildComparisonRows(products) {
  const rows = [
    { label: 'Price', values: products.map((p) => formatCurrency(getPriceBreakdown(p).discountedPrice)) },
    { label: 'Category', values: products.map((p) => text(p.categoryTitle) || text(p.category)) },
    { label: 'For', values: products.map((p) => text(p.gender)) },
    { label: 'Colours', values: products.map((p) => normalizeColors(p.colors, p.sizes).map((c) => c.name).filter(Boolean).join(', ')) },
    { label: 'Sizes', values: products.map((p) => getAllSizeNames(p.colors, p.sizes).join(', ')) },
  ];
  ['Care', 'Origin'].forEach((label) => {
    rows.push({ label, values: products.map((p) => getOptionalSpecs(p).find((s) => s.label === label)?.value ?? '') });
  });
  rows.push({ label: 'Availability', values: products.map((p) => (isProductAvailable(p) ? 'In stock' : 'Currently unavailable')) });
  return rows.filter((row) => row.label === 'Price' || row.label === 'Availability' || row.values.some(Boolean));
}

export default function BlogComparison({ productIds }) {
  const { products: catalogue, loading } = useProducts();
  const tracker = useBlogTracker();
  const products = productIds.map((id) => catalogue.find((p) => String(p.id) === String(id))).filter(Boolean);

  if (products.length < 2) {
    return loading ? null : (
      <p className="blog-note" role="note">This comparison needs at least two products that are still available.</p>
    );
  }
  const rows = buildComparisonRows(products);
  return (
    <div className="blog-table-wrap" role="region" aria-label="Product comparison" tabIndex={0}>
      <table className="blog-compare">
        <thead>
          <tr>
            <td />
            {products.map((p) => (
              <th key={p.id} scope="col">
                <Link to={`/products/${p.id}`} onClick={() => tracker.product(p, 'comparison')}>{p.name || p.title}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.values.map((value, i) => (
                <td key={products[i].id}>{value || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
