import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';
import EmptySegment from '../components/EmptySegment.jsx';
import { useProducts } from '../context/ProductsContext.jsx';
import { subscribeToCollections } from '../services/collections.js';
import { logPageNotFound, logViewCollection, logViewItemList } from '../services/analytics.js';
import { getCollectionProducts, resolveCollectionCover } from '../utils/collections.js';
import { applyDocumentHead } from '../seo/head.js';
import { notFoundHead } from '../seo/routes.js';
import { buildCollectionHead } from '../seo/collectionHead.js';

function CollectionNotFound() {
  return (
    <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 text-center">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-4">Collection not found</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">This collection may have been removed or the link is incorrect.</p>
      <Link to="/products" className="inline-block bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-lg uppercase tracking-widest">
        Browse All Products
      </Link>
    </main>
  );
}

// A collection's own page: its cover and name, then only the products in it.
export default function CollectionPage() {
  const { collectionId } = useParams();
  const { products, loading } = useProducts();
  const [collections, setCollections] = useState(null);

  useEffect(() => subscribeToCollections((rows) => setCollections(rows)), []);

  // Unpublished collections are hidden from the storefront, so their link reads as not found.
  const collection = useMemo(
    () => collections?.find((c) => c.id === collectionId && c.published) ?? null,
    [collections, collectionId]
  );
  const members = useMemo(() => (collection ? getCollectionProducts(collection, products) : []), [collection, products]);
  const cover = collection ? resolveCollectionCover(collection, products) : null;
  const isLoading = collections === null || loading;

  useEffect(() => {
    if (isLoading) return;
    applyDocumentHead(collection ? buildCollectionHead(collection, { image: cover?.src }) : notFoundHead());
  }, [isLoading, collection, cover?.src]);

  // Once per collection opened, after its products have loaded.
  useEffect(() => {
    if (isLoading) return;
    if (!collection) {
      logPageNotFound(`/collections/${collectionId}`);
      return;
    }
    logViewCollection(collection, members.length);
    if (members.length > 0) logViewItemList(members, `Collection - ${collection.name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, collection?.id, members.length > 0]);

  return (
    <>
      <TopNav />
      {isLoading ? (
        <div className="w-full min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
        </div>
      ) : !collection ? (
        <CollectionNotFound />
      ) : (
        <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-16">
          <header className="relative rounded-xl overflow-hidden bg-surface-variant mt-4 mb-10 min-h-[160px] md:min-h-[260px] flex items-end">
            {cover && <ProductImage src={cover.src} alt={cover.alt} className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative p-5 md:p-8">
              <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg playfair text-white drop-shadow-lg">
                {collection.name}
              </h1>
              <p className="font-body-sm text-body-sm text-white/90 mt-1">
                {members.length} product{members.length === 1 ? '' : 's'}
              </p>
            </div>
          </header>

          {members.length === 0 ? (
            <EmptySegment message="No products in this collection yet — check back soon." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-gutter">
              {members.map((product) => (
                <ProductCard key={product.id} product={product} listName={`Collection - ${collection.name}`} />
              ))}
            </div>
          )}
        </main>
      )}
      <SiteFooter />
    </>
  );
}
