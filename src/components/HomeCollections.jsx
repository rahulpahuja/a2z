import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToCollections } from '../services/collections.js';
import { useProducts } from '../context/ProductsContext.jsx';
import ProductImage from './ProductImage.jsx';
import EmptySegment from './EmptySegment.jsx';
import ProductCard from './ProductCard.jsx';
import { logSelectPromotion } from '../services/analytics.js';
import { collectionPath, getCollectionProducts, groupCollectionsForHome, resolveCollectionCover } from '../utils/collections.js';

function CollectionRow({ collection, products }) {
  const scrollRef = useRef(null);
  const cover = resolveCollectionCover(collection, products);
  const collectionProducts = getCollectionProducts(collection, products);

  return (
    <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-8 md:mb-12 px-2">
        {cover && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-primary shrink-0">
            <ProductImage src={cover.src} alt={cover.alt} className="w-full h-full object-cover" />
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
          {collectionProducts.map((product) => (
            <div key={product.id} className="min-w-[220px] sm:min-w-[260px] md:min-w-[270px] w-[220px] sm:w-[260px] md:w-[270px] shrink-0 snap-start">
              <ProductCard product={product} listName={`Home - ${collection.name}`} />
            </div>
          ))}
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

// A collapsed collection: one cover tile with its name over it. Opens the collection's own page.
function CollectionTiles({ collections, products }) {
  return (
    <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10 w-full max-w-full overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-gutter">
        {collections.map((collection) => {
          const cover = resolveCollectionCover(collection, products);
          return (
            <Link
              key={collection.id}
              to={collectionPath(collection)}
              onClick={() => logSelectPromotion(collection.name, collectionPath(collection))}
              className="group relative block aspect-[3/4] rounded-xl overflow-hidden bg-surface-variant border border-tertiary-container/30"
            >
              {cover && (
                <ProductImage
                  src={cover.src}
                  alt={cover.alt}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-transparent" />
              <h2 className="absolute top-0 inset-x-0 p-4 md:p-5 font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md playfair text-white drop-shadow-lg">
                {collection.name}
              </h2>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Renders every admin-published Collection on the home page, in the admin's order. An
// expanded collection is its own product row; collapsed ones show as cover tiles that
// open the collection's page.
export default function HomeCollections() {
  const { products } = useProducts();
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const unsub = subscribeToCollections((rows) => setCollections(rows));
    return unsub;
  }, []);

  const blocks = groupCollectionsForHome(
    collections.filter((c) => c.published),
    products
  );

  return blocks.map((block) =>
    block.type === 'row' ? (
      <CollectionRow key={block.collection.id} collection={block.collection} products={products} />
    ) : (
      <CollectionTiles key={block.collections[0].id} collections={block.collections} products={products} />
    )
  );
}
