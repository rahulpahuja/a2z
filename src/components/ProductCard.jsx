import { Link } from 'react-router-dom';
import { formatCurrency } from '../context/CartContext.jsx';
import { getDiscountedPrice } from '../utils/discount.js';
import { isProductAvailable } from '../utils/productColors.js';
import { getProductAlt } from '../utils/productImages.js';
import { logSelectItem } from '../services/analytics.js';
import ProductCardImage from './ProductCardImage.jsx';

// A product tile linking to its detail page. `listName` labels where the click came
// from in analytics.
export default function ProductCard({ product, listName }) {
  const isAvailable = isProductAvailable(product);
  return (
    <Link
      to={`/products/${product.id}`}
      onClick={() => logSelectItem(product, listName)}
      className={`group flex flex-col h-full bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300 ${!isAvailable ? 'opacity-85' : ''}`}
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
        <ProductCardImage
          images={product.images && product.images.length > 0 ? product.images : [product.image]}
          alts={product.imageAlts}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius ${!isAvailable ? 'grayscale opacity-50' : ''}`}
          alt={getProductAlt(product)}
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <span className="bg-error text-on-error font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-wider font-bold shadow-md text-xs">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-3.5 md:p-4 flex flex-col gap-1.5 md:gap-2 mt-auto">
        <h3 className="font-title-sm text-sm md:text-title-sm text-on-surface truncate">{product.name || product.title}</h3>
        <p className="font-price-display text-base md:text-price-display text-primary">{formatCurrency(getDiscountedPrice(product))}</p>
      </div>
    </Link>
  );
}
