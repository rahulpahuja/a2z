import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  reorderCollections,
} from '../../services/collections.js';
import { useProducts } from '../../context/ProductsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ProductImage from '../../components/ProductImage.jsx';

const EMPTY_FORM = { name: '', productIds: [], heroProductId: '', published: true };

function CollectionEditorModal({ initial, products, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || p.title || '').toLowerCase().includes(q));
  }, [products, search]);

  const selectedProducts = useMemo(
    () => form.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean),
    [form.productIds, products]
  );

  const toggleProduct = (id) => {
    setForm((prev) => {
      const isSelected = prev.productIds.includes(id);
      const productIds = isSelected ? prev.productIds.filter((pid) => pid !== id) : [...prev.productIds, id];
      // Hero product must always be one of the selected products — if it was
      // just removed, or nothing was chosen as hero yet, fall back to the
      // first remaining selection.
      const heroProductId = productIds.includes(prev.heroProductId) ? prev.heroProductId : productIds[0] || '';
      return { ...prev, productIds, heroProductId };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.productIds.length === 0) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-outline-variant rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container shrink-0">
          <h3 className="font-title-sm text-[16px] text-on-surface font-bold">
            {initial.id ? 'Edit Collection' : 'New Collection'}
          </h3>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor="collection-name">
              Collection Name
            </label>
            <input
              id="collection-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Festive Favourites"
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor="collection-hero">
              Thumbnail / Hero Product
            </label>
            <select
              id="collection-hero"
              value={form.heroProductId}
              onChange={(e) => setForm((prev) => ({ ...prev, heroProductId: e.target.value }))}
              disabled={selectedProducts.length === 0}
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors disabled:opacity-50"
            >
              {selectedProducts.length === 0 && <option value="">Select products below first…</option>}
              {selectedProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.title}</option>
              ))}
            </select>
            <p className="text-[10px] text-on-surface-variant/60">
              Must be one of the products picked for this collection — used as its thumbnail on the homepage.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-label-caps text-[10px] text-on-surface-variant">
                Products in this Collection ({form.productIds.length} selected)
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-1.5 text-[11px] text-on-surface transition-colors w-48"
              />
            </div>
            <div className="border border-outline-variant/30 rounded-xl max-h-72 overflow-y-auto divide-y divide-outline-variant/10">
              {filteredProducts.length === 0 && (
                <p className="p-4 text-[12px] text-on-surface-variant/70 text-center">No products match your search.</p>
              )}
              {filteredProducts.map((p) => {
                const checked = form.productIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-surface-container-low'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(p.id)}
                      className="accent-primary shrink-0"
                    />
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-container shrink-0">
                      <ProductImage
                        src={(p.images && p.images[0]) || p.image}
                        alt={p.name || p.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-on-surface truncate">{p.name || p.title}</p>
                      <p className="text-[10px] text-on-surface-variant/70 truncate">{p.category || p.categoryTitle}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-on-surface cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
              className="accent-primary"
            />
            Publish on Home Page
          </label>
        </div>

        <div className="p-5 border-t border-outline-variant/30 flex justify-end gap-3 bg-surface-container shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="border border-outline text-on-surface font-label-caps text-[11px] px-5 py-2.5 rounded-lg uppercase tracking-widest hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim() || form.productIds.length === 0}
            className="bg-primary text-on-primary font-label-caps text-[11px] px-6 py-2.5 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Collection'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminCollectionsPage() {
  const { showToast } = useToast();
  const { products } = useProducts();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, EMPTY_FORM = creating, {...} = editing

  useEffect(() => {
    const unsub = subscribeToCollections((rows) => {
      setCollections(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async (form) => {
    try {
      if (editing?.id) {
        await updateCollection(editing.id, form);
        showToast('Collection updated.');
      } else {
        await createCollection(form);
        showToast('Collection created.');
      }
      setEditing(null);
    } catch (err) {
      showToast(err.message || 'Could not save collection.');
    }
  };

  const handleDelete = async (collection) => {
    if (!window.confirm(`Delete the "${collection.name}" collection? This cannot be undone.`)) return;
    try {
      await deleteCollection(collection.id);
      showToast('Collection deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete collection.');
    }
  };

  const handleTogglePublished = async (collection) => {
    try {
      await updateCollection(collection.id, { ...collection, published: !collection.published });
    } catch (err) {
      showToast(err.message || 'Could not update collection.');
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= collections.length) return;
    await reorderCollections(collections[index], collections[targetIndex]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="animate-spin inline-block w-8 h-8 border-4 border-t-transparent border-primary rounded-full"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Collections</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Curate named groups of existing products, each with a hero thumbnail, and publish them on the home page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(EMPTY_FORM)}
          className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity shrink-0 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Collection
        </button>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10">
        {collections.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-12 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40">collections_bookmark</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No collections yet. Create one to feature a curated set of products on the home page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection, idx) => {
              const heroProduct = products.find((p) => p.id === collection.heroProductId);
              const validProductCount = collection.productIds.filter((id) => products.some((p) => p.id === id)).length;
              return (
                <div
                  key={collection.id}
                  className="bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col overflow-hidden shadow-sm hover:shadow transition-shadow"
                >
                  <div className="aspect-video bg-surface-container relative">
                    {heroProduct ? (
                      <ProductImage
                        src={(heroProduct.images && heroProduct.images[0]) || heroProduct.image}
                        alt={heroProduct.name || heroProduct.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                        <span className="material-symbols-outlined text-[32px]">image</span>
                      </div>
                    )}
                    <span
                      className={`absolute top-3 right-3 font-label-caps text-[10px] uppercase px-2.5 py-1 rounded-full backdrop-blur ${
                        collection.published ? 'bg-secondary-container/90 text-on-secondary-container' : 'bg-surface/90 text-on-surface-variant'
                      }`}
                    >
                      {collection.published ? 'Published' : 'Hidden'}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <h3 className="font-title-sm text-[15px] text-on-surface font-bold truncate">{collection.name}</h3>
                      <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                        {validProductCount} product{validProductCount === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-outline-variant/20">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="w-8 h-8 rounded-lg border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === collections.length - 1}
                        aria-label="Move down"
                        className="w-8 h-8 rounded-lg border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePublished(collection)}
                        className="flex-1 text-center border border-outline-variant/40 rounded-lg py-1.5 text-[10px] font-label-caps uppercase text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                      >
                        {collection.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(collection)}
                        aria-label="Edit"
                        className="w-8 h-8 rounded-lg border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(collection)}
                        aria-label="Delete"
                        className="w-8 h-8 rounded-lg border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-error hover:border-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {editing && (
        <CollectionEditorModal
          initial={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
