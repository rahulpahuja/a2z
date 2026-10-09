// Pure rules for collections, shared by the storefront, the admin editor and the
// service layer so none of them re-derive what a cover, a mode or a product list is.

export const DISPLAY_MODES = { EXPANDED: 'expanded', COLLAPSED: 'collapsed' };

// Collections saved before display modes existed have no field, and keep showing in full.
export const getDisplayMode = (collection) =>
  collection?.displayMode === DISPLAY_MODES.COLLAPSED ? DISPLAY_MODES.COLLAPSED : DISPLAY_MODES.EXPANDED;

export const collectionPath = (collection) => `/collections/${encodeURIComponent(collection.id)}`;

const productPhoto = (product) => (product.images && product.images[0]) || product.image || '';

// Members that still exist in the catalogue, in the order the admin arranged them.
export const getCollectionProducts = (collection, products) =>
  (collection.productIds ?? []).map((id) => products.find((p) => p.id === id)).filter(Boolean);

// Cover precedence: the photo uploaded for the collection, then the chosen thumbnail
// product, then the first product. Null when the collection has nothing to show.
export function resolveCollectionCover(collection, products) {
  if (collection.coverImage) return { src: collection.coverImage, alt: collection.name };
  const members = getCollectionProducts(collection, products);
  const product = members.find((p) => p.id === collection.heroProductId) ?? members[0];
  return product ? { src: productPhoto(product), alt: product.name || product.title || collection.name } : null;
}

// Splits the published collections, in admin order, into homepage blocks: each expanded
// collection is its own product row, and neighbouring collapsed ones share one tile grid.
// A collapsed collection with no products is dropped: its tile would open an empty page.
export function groupCollectionsForHome(collections, products) {
  const blocks = [];
  collections.forEach((collection) => {
    if (getDisplayMode(collection) === DISPLAY_MODES.EXPANDED) {
      blocks.push({ type: 'row', collection });
      return;
    }
    if (getCollectionProducts(collection, products).length === 0) return;
    const last = blocks[blocks.length - 1];
    if (last?.type === 'tiles') last.collections.push(collection);
    else blocks.push({ type: 'tiles', collections: [collection] });
  });
  return blocks;
}
