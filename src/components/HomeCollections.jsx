import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToCollections } from '../services/collections.js';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import ProductCardImage from './ProductCardImage.jsx';
import ProductImage from './ProductImage.jsx';

function CollectionRow({ collection, products }) {
  const scrollRef = useRef(null);
  const heroProduct = products.find((p) => p.id === collection.heroProductId);
  const collectionProducts = collection.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  if (collectionProducts.length === 0) return null;

  return (
    <section className="py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10">
      <div className="flex items-center justify-center gap-3 mb-12">
        {heroProduct && (
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary shrink-0">
            <ProductImage
              src={(heroProduct.images && heroProduct.images[0]) || heroProduct.image}
              alt={heroProduct.name || heroProduct.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <h2 className="font-headline-md text-headline-md playfair text-center">{collection.name}</h2>
      </div>

      <div className="relative group/arrows">
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Left"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {collectionProducts.map((product) => (
            <div key={product.id} className="min-w-[250px] sm:min-w-[270px] w-[270px] shrink-0 snap-start">
              <Link
                to={`/product/${product.id}`}
                className="group flex flex-col h-full bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300"
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                  <ProductCardImage
                    images={product.images && product.images.length > 0 ? product.images : [product.image]}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius"
                    alt={product.alt}
                  />
                </div>
                <div className="p-4 flex flex-col gap-2 mt-auto">
                  <h3 className="font-title-sm text-title-sm text-on-surface truncate">{product.name || product.title}</h3>
                  <p className="font-price-display text-price-display text-primary">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Right"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
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
