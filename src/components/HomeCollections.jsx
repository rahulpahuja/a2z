import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToCollections } from '../services/collections.js';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import ProductCardImage from './ProductCardImage.jsx';
import ProductImage from './ProductImage.jsx';
import EmptySegment from './EmptySegment.jsx';

function CollectionRow({ collection, products }) {
  const scrollRef = useRef(null);
  const heroProduct = products.find((p) => p.id === collection.heroProductId);
  const collectionProducts = collection.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-8 md:mb-12 px-2">
        {heroProduct && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-primary shrink-0">
            <ProductImage
              src={(heroProduct.images && heroProduct.images[0]) || heroProduct.image}
              alt={heroProduct.name || heroProduct.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <h2 className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md playfair text-center truncate">
          {collection.name}
        </h2>
      </div>

      {collectionProducts.length === 0 ? (
        <EmptySegment message="No products in this collection yet — check back soon." />
      ) : (
      <div className="relative group/arrows w-full max-w-full min-w-0">
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Left"
        >
          <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth w-full max-w-full min-w-0"
        >
          {collectionProducts.map((product) => {
            const isAvailable = !product.outOfStock && (product.sizes?.some((s) => s.stock > 0) ?? product.inStock);
            return (
            <div key={product.id} className="min-w-[220px] sm:min-w-[260px] md:min-w-[270px] w-[220px] sm:w-[260px] md:w-[270px] shrink-0 snap-start">
              <Link
                to={`/products/${product.id}`}
                className={`group flex flex-col h-full bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300 ${!isAvailable ? 'opacity-85' : ''}`}
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                  <ProductCardImage
                    images={product.images && product.images.length > 0 ? product.images : [product.image]}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                    alt={product.alt}
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
                  <p className="font-price-display text-base md:text-price-display text-primary">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Right"
        >
          <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
        </button>
      </div>
      )}
    </section>
  );
}

// Renders every admin-published Collection as its own homepage section — a
// hero-product thumbnail + collection name heading, followed by a horizontal
// scroll row of that collection's products. Built only from the existing
// product catalog, so nothing here can reference a deleted/unknown product.
export default function HomeCollections() {
  const { products } = useProducts();
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const unsub = subscribeToCollections((rows) => setCollections(rows));
    return unsub;
  }, []);

  const published = collections.filter((c) => c.published);

  if (published.length === 0) return null;

  return (
    <>
      {published.map((collection) => (
        <CollectionRow key={collection.id} collection={collection} products={products} />
      ))}
    </>
  );
}
