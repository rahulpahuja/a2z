import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../../context/ProductsContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import { getPriceBreakdown } from '../../utils/discount.js';
import { isProductAvailable } from '../../utils/productColors.js';
import { getProductAlt } from '../../utils/productImages.js';
import { subscribeToCollections } from '../../services/collections.js';
import { collectionPath, getCollectionProducts, resolveCollectionCover } from '../../utils/collections.js';
import { useBlogTracker } from './BlogTracker.jsx';
import ProductImage from '../ProductImage.jsx';

const productPhoto = (p) => (p.images && p.images[0]) || p.image || '';

// A product placed in an article. The price and availability always come from the live catalogue, so
// editing a product updates every article that mentions it. A product that no longer exists becomes a
// plain notice with a way back to the shop instead of a broken link.
export function BlogProductCard({ productId, placement = 'inline' }) {
  const { products, loading } = useProducts();
  const tracker = useBlogTracker();
  const product = products.find((p) => String(p.id) === String(productId));
  const missing = !product && !loading;

  useEffect(() => {
    if (missing) tracker.productUnavailable(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, productId]);

  if (!product) {
    return missing ? (
      <aside className="blog-product blog-product--missing" aria-label="Unavailable product">
        <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
        <div>
          <p className="blog-product__name">This product is no longer available.</p>
          <Link className="blog-product__cta" to="/products" onClick={() => tracker.cta('shop_all')}>Browse all products</Link>
        </div>
      </aside>
    ) : (
      <div className="blog-product blog-product--loading" aria-hidden="true" />
    );
  }

  const available = isProductAvailable(product);
  const { originalPrice, discountedPrice, hasDiscount } = getPriceBreakdown(product);
  const name = product.name || product.title;
  return (
    <aside className="blog-product" aria-label={`Product: ${name}`}>
      <Link to={`/products/${product.id}`} className="blog-product__media" onClick={() => tracker.product(product, placement)} tabIndex={-1} aria-hidden="true">
        <ProductImage src={productPhoto(product)} alt={getProductAlt(product)} className={`blog-product__img${available ? '' : ' blog-product__img--dim'}`} />
      </Link>
      <div className="blog-product__body">
        <p className="blog-product__name">{name}</p>
        <p className="blog-product__price">
          {formatCurrency(discountedPrice)}
          {hasDiscount && <s className="blog-product__was">{formatCurrency(originalPrice)}</s>}
        </p>
        <p className={`blog-product__stock${available ? '' : ' blog-product__stock--out'}`}>{available ? 'In stock' : 'Currently unavailable'}</p>
        <Link to={`/products/${product.id}`} className="blog-product__cta" onClick={() => tracker.product(product, placement)}>
          View Product
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
    </aside>
  );
}

// A collection placed in an article. An unpublished or deleted collection renders nothing, because
// its page would not open.
export function BlogCollectionCard({ collectionId }) {
  const { products } = useProducts();
  const tracker = useBlogTracker();
  const [collections, setCollections] = useState(null);
  useEffect(() => subscribeToCollections((rows) => setCollections(rows)), []);

  const collection = (collections ?? []).find((c) => c.id === collectionId && c.published);
  if (!collection) return null;
  const cover = resolveCollectionCover(collection, products);
  const count = getCollectionProducts(collection, products).length;
  return (
    <aside className="blog-collection" aria-label={`Collection: ${collection.name}`}>
      {cover && (
        <Link to={collectionPath(collection)} className="blog-collection__media" onClick={() => tracker.collection(collection)} tabIndex={-1} aria-hidden="true">
          <ProductImage src={cover.src} alt={cover.alt} className="blog-collection__img" />
        </Link>
      )}
      <div className="blog-collection__body">
        <p className="blog-collection__name">{collection.name}</p>
        {count > 0 && <p className="blog-product__stock">{count} {count === 1 ? 'piece' : 'pieces'}</p>}
        <Link to={collectionPath(collection)} className="blog-product__cta" onClick={() => tracker.collection(collection)}>
          Explore Collection
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
    </aside>
  );
}
