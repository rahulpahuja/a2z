import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToTrashedProducts,
  restoreProductFromTrash,
  permanentlyDeleteTrashedProduct,
} from '../../services/adminProducts.js';
import { subscribeToStoreSettings, saveStoreSettings } from '../../services/storeSettings.js';
import { deleteProductImagesFromR2 } from '../../utils/productImages.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import ProductImage from '../../components/ProductImage.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AdminTrashPage() {
  const { showToast } = useToast();
  const [trashedProducts, setTrashedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [settings, setSettings] = useState(null);
  const [retentionInput, setRetentionInput] = useState('');
  const [savingRetention, setSavingRetention] = useState(false);
  const [busyIds, setBusyIds] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToTrashedProducts((rows, error) => {
      setTrashedProducts(rows);
      setLoadError(error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((data) => {
      setSettings(data);
      setRetentionInput(String(data.trashRetentionDays));
    });
    return unsubscribe;
  }, []);

  const retentionDays = settings?.trashRetentionDays ?? 60;

  const daysLeft = (product) => {
    const trashedAtMs = product.trashedAtMs ?? 0;
    const expiresAtMs = trashedAtMs + retentionDays * DAY_MS;
    return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / DAY_MS));
  };

  const permanentlyDelete = async (product) => {
    await deleteProductImagesFromR2(product);
    await permanentlyDeleteTrashedProduct(product.id);
  };

  // Lazy auto-purge: whenever this page loads with trash + the configured
  // retention period both known, sweep anything past its expiry. There's no
  // server-side cron here — this only fires when someone opens this page (or
  // /super/products, which also mounts a lightweight check), so an item
  // technically outlives its retention window until the next such visit.
  useEffect(() => {
    if (loading || !settings || trashedProducts.length === 0) return;
    const expired = trashedProducts.filter((p) => daysLeft(p) === 0);
    if (expired.length === 0) return;
    expired.forEach((product) => {
      permanentlyDelete(product).catch((e) => console.error(`Failed to auto-purge ${product.id}`, e));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, settings, trashedProducts]);

  const handleRestore = async (product) => {
    setBusyIds((ids) => [...ids, product.id]);
    try {
      await restoreProductFromTrash(product);
      showToast(`"${product.title || product.name}" restored.`);
    } catch (err) {
      showToast(err.message || 'Could not restore product.');
    } finally {
      setBusyIds((ids) => ids.filter((id) => id !== product.id));
    }
  };

  const handlePermanentDelete = async (product) => {
    const confirmed = window.confirm(
      `Permanently delete "${product.title || product.name}"? This removes it and its images for good — it cannot be undone.`
    );
    if (!confirmed) return;

    setBusyIds((ids) => [...ids, product.id]);
    try {
      await permanentlyDelete(product);
      showToast('Product permanently deleted.');
    } catch (err) {
      showToast(err.message || 'Could not permanently delete product.');
    } finally {
      setBusyIds((ids) => ids.filter((id) => id !== product.id));
    }
  };

  const handleSaveRetention = async (event) => {
    event.preventDefault();
    const days = Math.max(1, Math.round(Number(retentionInput)));
    if (!Number.isFinite(days) || days < 1) {
      showToast('Enter a valid number of days.');
      return;
    }
    setSavingRetention(true);
    try {
      await saveStoreSettings({ ...settings, trashRetentionDays: days });
      showToast('Trash retention period updated.');
    } catch (err) {
      showToast(err.message || 'Could not save retention period.');
    } finally {
      setSavingRetention(false);
    }
  };

  const sortedTrash = useMemo(
    () => [...trashedProducts].sort((a, b) => (b.trashedAtMs ?? 0) - (a.trashedAtMs ?? 0)),
    [trashedProducts]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Trash</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Deleted products sit here before being removed for good.
          </p>
        </div>
        <Link
          to="/super/products"
          className="font-label-caps text-label-caps text-primary hover:underline"
        >
          Back to Products
        </Link>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Auto-Delete After</h2>
          <form onSubmit={handleSaveRetention} className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={retentionInput}
              onChange={(e) => setRetentionInput(e.target.value)}
              className="w-24 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-2.5 font-body-lg text-body-lg text-on-surface transition-colors"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">days</span>
            <button
              type="submit"
              disabled={savingRetention || !settings}
              className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-2.5 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingRetention ? 'Saving…' : 'Save'}
            </button>
          </form>
        </section>

        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-6 pb-4 border-b border-outline-variant/20">
            Trashed Products ({trashedProducts.length})
          </h2>

          {loading ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
          ) : loadError ? (
            <p className="font-body-sm text-body-sm text-error">
              Couldn't load trash ({loadError.message || 'permission denied'}).
            </p>
          ) : sortedTrash.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Trash is empty.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedTrash.map((product) => {
                const busy = busyIds.includes(product.id);
                const remaining = daysLeft(product);
                return (
                  <div
                    key={product.id}
                    className="border border-outline-variant/30 bg-surface-container-lowest rounded-lg p-4 flex gap-4 items-start"
                  >
                    {product.image && (
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30 opacity-70">
                        <ProductImage src={product.image} className="w-full h-full object-cover" alt={product.title} />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h3 className="font-title-sm text-title-sm text-on-surface">
                            {product.title || product.name}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {product.categoryTitle} · {formatCurrency(product.price)}
                          </p>
                          <p className="font-body-sm text-[11px] text-on-surface-variant/70 font-mono">
                            ID: {product.id}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleRestore(product)}
                            disabled={busy}
                            className="font-label-caps text-label-caps text-primary hover:underline disabled:opacity-50"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(product)}
                            disabled={busy}
                            className="font-label-caps text-label-caps text-error hover:underline disabled:opacity-50"
                          >
                            Delete Permanently
                          </button>
                        </div>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant">
                        Trashed {product.trashedAtMs ? new Date(product.trashedAtMs).toLocaleString('en-IN') : 'recently'} ·{' '}
                        {remaining === 0 ? (
                          <span className="text-error font-semibold">Auto-deleting now</span>
                        ) : (
                          <>Auto-deletes in {remaining} day{remaining === 1 ? '' : 's'}</>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
