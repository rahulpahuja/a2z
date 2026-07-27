import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToAdminProducts } from '../../services/adminProducts.js';
import { subscribeToShots, createShot, updateShot, deleteShot, reorderShots } from '../../services/shots.js';
import { useToast } from '../../context/ToastContext.jsx';
import ProductImage from '../../components/ProductImage.jsx';

export default function AdminShotsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [shots, setShots] = useState([]);
  const [query, setQuery] = useState('');
  const [pickedProductId, setPickedProductId] = useState(null);
  const [pickedVideoUrl, setPickedVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAdminProducts((rows) => setProducts(rows));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToShots((rows) => setShots(rows));
    return unsub;
  }, []);

  const productsById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) => {
      const title = (p.title || p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return title.includes(term) || sku.includes(term);
    });
  }, [products, query]);

  const pickedProduct = pickedProductId ? productsById.get(pickedProductId) : null;
  const pickedProductVideos = pickedProduct?.videos ?? [];

  const startPicking = (product) => {
    setPickedProductId(product.id);
    setPickedVideoUrl(product.videos?.[0] ?? '');
    setQuery('');
  };

  const cancelPicking = () => {
    setPickedProductId(null);
    setPickedVideoUrl('');
  };

  const handleAddShot = async () => {
    if (!pickedProduct || !pickedVideoUrl) return;
    setSaving(true);
    try {
      await createShot({ productId: pickedProduct.id, videoUrl: pickedVideoUrl });
      showToast('Shot added.');
      cancelPicking();
    } catch (err) {
      showToast(err.message || 'Could not add shot.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = (shot) => {
    updateShot(shot.id, { enabled: !shot.enabled }).catch((err) =>
      showToast(err.message || 'Could not update shot.')
    );
  };

  const handleDelete = (shot) => {
    if (!window.confirm('Remove this shot from the feed?')) return;
    deleteShot(shot.id).catch((err) => showToast(err.message || 'Could not delete shot.'));
  };

  const moveShot = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= shots.length) return;
    reorderShots(shots[index], shots[targetIndex]).catch((err) =>
      showToast(err.message || 'Could not reorder shots.')
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Shots</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Curate a shoppable, swipeable video feed for customers using videos already uploaded for your products.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Add a Shot</h2>

          {!pickedProduct ? (
            <>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by product title or SKU…"
                  className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              </div>
              {query.trim() && matches.length === 0 && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">No products match "{query}".</p>
              )}
              {matches.length > 0 && (
                <ul className="mt-4 divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-lg overflow-hidden">
                  {matches.map((product) => {
                    const videoCount = product.videos?.length ?? 0;
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => startPicking(product)}
                          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface-container-high transition-colors text-left"
                        >
                          {product.image && (
                            <div className="w-12 h-14 rounded-md overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30">
                              <ProductImage src={product.image} className="w-full h-full object-cover" alt={product.title} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-body-lg text-body-lg text-on-surface truncate">{product.title || product.name}</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">SKU {product.sku}</p>
                          </div>
                          <span className="font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                            {videoCount} video{videoCount === 1 ? '' : 's'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!query.trim() && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">
                  Start typing to find a product that already has videos uploaded.
                </p>
              )}
            </>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-4">
                  {pickedProduct.image && (
                    <div className="w-14 h-16 rounded-md overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30">
                      <ProductImage src={pickedProduct.image} className="w-full h-full object-cover" alt={pickedProduct.title} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">{pickedProduct.title || pickedProduct.name}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">SKU {pickedProduct.sku}</p>
                  </div>
                </div>
                <button type="button" onClick={cancelPicking} className="font-label-caps text-label-caps text-primary hover:underline">
                  Choose a different product
                </button>
              </div>

              {pickedProductVideos.length === 0 ? (
                <p className="font-body-sm text-body-sm text-error">
                  This product has no videos yet.{' '}
                  <Link to={`/super/product-videos?productId=${pickedProduct.id}`} className="underline">
                    Upload one under Product Videos
                  </Link>{' '}
                  first.
                </p>
              ) : (
                <>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">Pick which video this shot should use:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {pickedProductVideos.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setPickedVideoUrl(url)}
                        className={`aspect-video rounded-md overflow-hidden bg-black border-2 transition-colors ${
                          pickedVideoUrl === url ? 'border-primary' : 'border-outline-variant/40 hover:border-primary/50'
                        }`}
                      >
                        <video src={url} className="w-full h-full object-contain pointer-events-none" muted playsInline />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddShot}
                    disabled={saving || !pickedVideoUrl}
                    className="mt-6 bg-primary text-on-primary font-label-caps text-label-caps px-8 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Adding…' : 'Add Shot'}
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Current Feed ({shots.length})</h2>
          {shots.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">No shots yet. Add one above.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-lg overflow-hidden bg-surface-container-low">
              {shots.map((shot, index) => {
                const product = productsById.get(shot.productId);
                return (
                  <li key={shot.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-12 h-16 rounded-md overflow-hidden bg-black flex-shrink-0 border border-outline-variant/30">
                      <video src={shot.videoUrl} className="w-full h-full object-cover pointer-events-none" muted playsInline />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-lg text-body-lg text-on-surface truncate">
                        {product ? product.title || product.name : 'Product not found'}
                      </p>
                      {product && <p className="font-body-sm text-body-sm text-on-surface-variant">SKU {product.sku}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveShot(index, -1)}
                        disabled={index === 0}
                        className="p-2 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
                        aria-label="Move up"
                      >
                        <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveShot(index, 1)}
                        disabled={index === shots.length - 1}
                        className="p-2 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
                        aria-label="Move down"
                      >
                        <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(shot)}
                        className={`font-label-caps text-[10px] px-3 py-2 rounded-md uppercase tracking-widest transition-colors ${
                          shot.enabled
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {shot.enabled ? 'Live' : 'Hidden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(shot)}
                        className="p-2 text-error hover:opacity-70 transition-opacity"
                        aria-label="Delete shot"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
