import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../../context/ProductsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { getDiscountedPrice } from '../../utils/discount.js';
import { isProductAvailable } from '../../utils/productColors.js';
import { subscribeToStoreSettings, DEFAULT_STORE_SETTINGS } from '../../services/storeSettings.js';
import {
  HomeLayoutConflictError,
  getCachedHomeLayout,
  saveHomeLayout,
  subscribeToHomeLayout,
} from '../../services/homeLayout.js';
import {
  FEATURED_ROW2_SIZE,
  MAX_PINNED_PRODUCTS,
  SIZE_FIELD_LABELS,
  SIZE_LIMITS,
  SIZE_PRESETS,
  applyHomeProductOrder,
  clampSize,
  countVisibleSections,
  createDefaultHomeLayout,
  getPlacement,
  getSectionDef,
  layoutsEqual,
  moveSection,
  nudgePinned,
  placeProduct,
  pruneMissingProducts,
  updateSection,
} from '../../utils/homeLayout.js';
import './AdminHomeLayoutPage.css';

const PRODUCT_PAGE_SIZE = 50;

// A number box that only commits on blur/Enter, so typing "300" is not clamped to the
// minimum at the "3". Empty means "use the built-in default".
function SizeInput({ id, field, value, onCommit }) {
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);
  const { min, max } = SIZE_LIMITS[field];

  const commit = () => {
    const next = clampSize(field, text);
    setText(next ?? '');
    if (next !== value) onCommit(next);
  };

  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      className="form-input hl-size-input"
      min={min}
      max={max}
      step="1"
      placeholder="Default"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

function SectionSizeControls({ section, def, onChange }) {
  if (def.supports.length === 0) {
    return <p className="hl-hint">This section has no size options; it can be moved or hidden.</p>;
  }
  return (
    <div className="hl-size-grid">
      {def.supports.map((field) => {
        const inputId = `hl-${section.id}-${field}`;
        return (
          <div key={field} className="form-group">
            <label className="form-label" htmlFor={inputId}>
              {SIZE_FIELD_LABELS[field]}
            </label>
            <SizeInput id={inputId} field={field} value={section[field]} onCommit={(v) => onChange({ [field]: v })} />
            <div className="hl-presets" role="group" aria-label={`${SIZE_FIELD_LABELS[field]} presets`}>
              {SIZE_PRESETS[field].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`hl-chip${section[field] === preset.value ? ' hl-chip--active' : ''}`}
                  aria-pressed={section[field] === preset.value}
                  onClick={() => onChange({ [field]: preset.value })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="hl-hint">
              {SIZE_LIMITS[field].min}–{SIZE_LIMITS[field].max}px; empty = built-in size.
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SectionRow({
  section,
  index,
  total,
  isLastVisible,
  notes,
  dragOver,
  onMove,
  onChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const def = getSectionDef(section.id);
  return (
    <li
      className={`hl-section${section.visible ? '' : ' hl-section--hidden'}${dragOver ? ' hl-section--dragover' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <div className="hl-section__main">
        <span className="material-symbols-outlined hl-handle" aria-hidden="true" title="Drag to reorder">
          drag_indicator
        </span>
        <span className="hl-section__index" aria-hidden="true">
          {index + 1}
        </span>
        <div className="hl-section__text">
          <p className="hl-section__title">{def.label}</p>
          <p className="hl-hint">{def.description}</p>
          {notes.map((note) => (
            <p key={note} className="hl-note">
              <span className="material-symbols-outlined" aria-hidden="true">
                info
              </span>
              {note}
            </p>
          ))}
        </div>
        <div className="hl-section__actions">
          <button
            type="button"
            className="hl-icon-btn"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move ${def.label} up`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_upward
            </span>
          </button>
          <button
            type="button"
            className="hl-icon-btn"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            aria-label={`Move ${def.label} down`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_downward
            </span>
          </button>
          <label
            className="hl-switch"
            title={section.visible && isLastVisible ? 'At least one section must stay visible' : undefined}
          >
            <input
              type="checkbox"
              role="switch"
              checked={section.visible}
              disabled={section.visible && isLastVisible}
              onChange={(e) => onChange({ visible: e.target.checked })}
              aria-label={`Show ${def.label} on the home screen`}
            />
            <span className="hl-switch__label">{section.visible ? 'Shown' : 'Hidden'}</span>
          </label>
        </div>
      </div>
      <details className="hl-section__size">
        <summary>Size &amp; spacing</summary>
        <SectionSizeControls section={section} def={def} onChange={onChange} />
      </details>
    </li>
  );
}

// A schematic of the page: block heights/widths follow the draft, so the effect of a
// change is visible without saving. (Real content comes from the storefront.)
function LayoutPreview({ sections }) {
  const visible = sections.filter((s) => s.visible);
  return (
    <div className="hl-preview" aria-label="Schematic preview of the home screen order">
      {visible.map((section) => {
        const def = getSectionDef(section.id);
        const width = Math.round(((section.maxWidth ?? 1280) / 1920) * 100);
        const gap = Math.round(((section.padY ?? 48) / 160) * 14) + 2;
        const cards = def.supports.includes('cardWidth');
        const cardPct = Math.round(((section.cardWidth ?? 270) / 480) * 22) + 8;
        return (
          <div key={section.id} className="hl-preview__row" style={{ paddingBlock: `${gap}px` }}>
            <div
              className={`hl-preview__block${section.id === 'hero' ? ' hl-preview__block--hero' : ''}`}
              style={{ width: section.id === 'hero' ? '100%' : `${Math.min(100, width)}%` }}
            >
              <span>{def.label}</span>
              {cards && (
                <div className="hl-preview__cards">
                  {[0, 1, 2, 3].map((n) => (
                    <i key={n} style={{ width: `${cardPct}%` }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductRow({ product, position, placement, pinnedIndex, pinnedCount, onPlace, onNudge }) {
  const available = isProductAvailable(product);
  const name = product.name || product.title || String(product.id);
  const isPinned = placement === 'top' || placement === 'bottom';
  return (
    <li className="hl-product">
      <span className="hl-product__pos" aria-hidden="true">
        {position ?? '–'}
      </span>
      <div className="hl-product__thumb">
        <ProductImage src={product.image || product.images?.[0]} alt="" className="hl-product__img" />
      </div>
      <div className="hl-product__info">
        <p className="hl-product__name">{name}</p>
        <p className="hl-hint">
          {formatCurrency(getDiscountedPrice(product))} · {product.categoryTitle || product.category || 'Uncategorised'}
          {!available && <span className="hl-badge hl-badge--warn">Out of stock</span>}
          {placement === 'top' && <span className="hl-badge">Pinned to top</span>}
          {placement === 'bottom' && <span className="hl-badge">Pinned to bottom</span>}
          {placement === 'hidden' && <span className="hl-badge hl-badge--muted">Hidden from home</span>}
        </p>
      </div>
      <div className="hl-product__actions">
        {isPinned && (
          <>
            <button
              type="button"
              className="hl-icon-btn"
              disabled={pinnedIndex === 0}
              onClick={() => onNudge(product.id, -1)}
              aria-label={`Move ${name} earlier among ${placement} pins`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_upward
              </span>
            </button>
            <button
              type="button"
              className="hl-icon-btn"
              disabled={pinnedIndex === pinnedCount - 1}
              onClick={() => onNudge(product.id, 1)}
              aria-label={`Move ${name} later among ${placement} pins`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_downward
              </span>
            </button>
          </>
        )}
        {placement !== 'top' && placement !== 'hidden' && (
          <button type="button" className="hl-text-btn" onClick={() => onPlace(product.id, 'top')}>
            Pin top
          </button>
        )}
        {placement !== 'bottom' && placement !== 'hidden' && (
          <button type="button" className="hl-text-btn" onClick={() => onPlace(product.id, 'bottom')}>
            Pin bottom
          </button>
        )}
        {placement === 'hidden' ? (
          <button type="button" className="hl-text-btn" onClick={() => onPlace(product.id, null)}>
            Show on home
          </button>
        ) : (
          <button type="button" className="hl-text-btn" onClick={() => onPlace(product.id, 'hidden')}>
            Hide
          </button>
        )}
        {isPinned && (
          <button type="button" className="hl-text-btn" onClick={() => onPlace(product.id, null)}>
            Unpin
          </button>
        )}
      </div>
    </li>
  );
}

export default function AdminHomeLayoutPage() {
  const { showToast } = useToast();
  const { products, loading: productsLoading } = useProducts();

  const [saved, setSaved] = useState(getCachedHomeLayout);
  const [draft, setDraft] = useState(getCachedHomeLayout);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [homeProductsPerRow, setHomeProductsPerRow] = useState(DEFAULT_STORE_SETTINGS.homeProductsPerRow);
  const [showBubbles, setShowBubbles] = useState(DEFAULT_STORE_SETTINGS.showCategoryBubbles);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PRODUCT_PAGE_SIZE);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // Latest values for the subscription callback, which must not re-subscribe on every edit.
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const dirty = !layoutsEqual(draft, saved);

  useEffect(() => {
    const unsubscribe = subscribeToHomeLayout((layout, error, meta) => {
      if (error) setLoadError(error);
      if (meta?.cached) {
        // Instant paint only: its revision may be stale, so saving stays disabled.
        if (!draftRef.current || layoutsEqual(draftRef.current, savedRef.current)) setDraft(layout);
        setSaved(layout);
        return;
      }
      setLoadError(null);
      const hadLocalEdits = !layoutsEqual(draftRef.current, savedRef.current);
      const changedRemotely = layout.rev !== savedRef.current.rev;
      setSaved(layout);
      if (!hadLocalEdits) {
        setDraft(layout);
        setRemoteChanged(false);
      } else if (changedRemotely) {
        setRemoteChanged(true);
      }
      setReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => {
      setHomeProductsPerRow(settings.homeProductsPerRow || DEFAULT_STORE_SETTINGS.homeProductsPerRow);
      setShowBubbles(settings.showCategoryBubbles ?? DEFAULT_STORE_SETTINGS.showCategoryBubbles);
    });
    return unsubscribe;
  }, []);

  // Browser-level guard against losing edits on reload/close.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => setVisibleCount(PRODUCT_PAGE_SIZE), [search]);

  const edit = useCallback((fn) => setDraft((prev) => fn(prev)), []);
  const onMoveSection = (from, to) => edit((l) => moveSection(l, from, to));
  const onChangeSection = (id) => (patch) => edit((l) => updateSection(l, id, patch));
  const onPlace = (id, target) => edit((l) => ({ ...l, products: placeProduct(l.products, id, target) }));
  const onNudge = (id, delta) => edit((l) => ({ ...l, products: nudgePinned(l.products, id, delta) }));

  // --- derived product views -------------------------------------------------
  const liveIds = useMemo(() => new Set(products.map((p) => String(p.id))), [products]);
  const orderedFeed = useMemo(() => applyHomeProductOrder(products, draft.products), [products, draft.products]);
  const hiddenProducts = useMemo(() => {
    const byId = new Map(products.map((p) => [String(p.id), p]));
    return draft.products.hidden.map((id) => byId.get(id)).filter(Boolean);
  }, [products, draft.products.hidden]);
  const missingIds = useMemo(() => {
    if (productsLoading || products.length === 0) return [];
    return [...draft.products.top, ...draft.products.bottom, ...draft.products.hidden].filter((id) => !liveIds.has(id));
  }, [draft.products, liveIds, products.length, productsLoading]);

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;
  const matches = useCallback(
    (p) =>
      [p.name, p.title, p.id, p.category, p.categoryTitle]
        .filter((v) => v !== undefined && v !== null)
        .some((v) => String(v).toLowerCase().includes(query)),
    [query]
  );
  const feedRows = useMemo(
    () =>
      orderedFeed
        .map((product, i) => ({ product, position: i + 1 }))
        .filter(({ product }) => !searching || matches(product)),
    [orderedFeed, searching, matches]
  );
  const shownRows = feedRows.slice(0, visibleCount);
  const row1End = homeProductsPerRow;
  const row2End = homeProductsPerRow + FEATURED_ROW2_SIZE;

  const visibleCountSections = countVisibleSections(draft.sections);

  const sectionNotes = (id) => {
    const notes = [];
    if (id === 'categoryBubbles' && !showBubbles) notes.push('Currently off in Store Settings, so nothing shows even when this is on.');
    return notes;
  };

  // --- actions ---------------------------------------------------------------
  const persist = async (expectedRev) => {
    setSaving(true);
    try {
      // Pins for deleted products are dropped — but only once the catalog has really
      // loaded, so a failed/empty catalog fetch can never wipe every pin.
      const cleaned =
        !productsLoading && products.length > 0 ? { ...draft, products: pruneMissingProducts(draft.products, products) } : draft;
      const result = await saveHomeLayout(cleaned, expectedRev);
      setSaved(result);
      setDraft(result);
      setConflict(false);
      setRemoteChanged(false);
      showToast('Home layout saved. It is live on the storefront.');
    } catch (err) {
      if (err instanceof HomeLayoutConflictError) {
        setConflict(true);
      } else {
        showToast(err?.message || 'Could not save the home layout.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => persist(saved.rev);
  const handleOverwrite = () => persist(savedRef.current.rev);
  const handleLoadLatest = () => {
    setDraft(savedRef.current);
    setConflict(false);
    setRemoteChanged(false);
  };
  const handleDiscard = () => {
    setDraft(saved);
    setConflict(false);
  };
  const handleReset = () => {
    if (!window.confirm('Reset to the default order and sizes? Nothing changes on the storefront until you save.')) return;
    setDraft((prev) => ({ ...createDefaultHomeLayout(), rev: prev.rev, updatedAt: prev.updatedAt }));
  };

  // --- drag & drop (keyboard users have the arrow buttons) --------------------
  const onDragStart = (event, index) => {
    setDragFrom(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };
  const onDragOver = (event, index) => {
    if (dragFrom === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOver !== index) setDragOver(index);
  };
  const onDrop = (event, index) => {
    event.preventDefault();
    if (dragFrom !== null) onMoveSection(dragFrom, index);
    setDragFrom(null);
    setDragOver(null);
  };
  const onDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  const canSave = ready && dirty && !saving && !loadError;

  if (!ready && !loadError) {
    return (
      <div className="admin-page-container flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <header className="admin-header hl-header">
        <div>
          <h1 className="admin-page-title">Home Layout</h1>
          <p className="admin-page-subtitle">
            Reorder, hide and resize the sections of the customer home screen, and pin live products to the top or bottom of
            its product rows.
          </p>
        </div>
        <div className="hl-header__actions">
          <Link to="/" target="_blank" rel="noreferrer" className="btn btn-secondary">
            <span className="material-symbols-outlined" aria-hidden="true">
              open_in_new
            </span>
            View storefront
          </Link>
          <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={saving}>
            Reset to default
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDiscard} disabled={!dirty || saving}>
            Discard changes
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving…' : dirty ? 'Save layout' : 'Saved'}
          </button>
        </div>
      </header>

      <main className="admin-main-container hl-main">
        {loadError && (
          <div className="hl-banner hl-banner--error" role="alert">
            Could not load the live layout ({loadError.message || 'unknown error'}). Showing the last known layout; saving is
            disabled until it loads.
          </div>
        )}
        {(conflict || remoteChanged) && (
          <div className="hl-banner hl-banner--warn" role="alert">
            <p>
              {conflict
                ? 'Another super user saved a different layout while you were editing, so your save was not applied.'
                : 'Another super user saved a new layout while you were editing.'}
            </p>
            <div className="hl-banner__actions">
              <button type="button" className="btn btn-secondary" onClick={handleLoadLatest}>
                Load latest (discard my edits)
              </button>
              <button type="button" className="btn btn-primary" onClick={handleOverwrite} disabled={saving}>
                Overwrite with my edits
              </button>
            </div>
          </div>
        )}

        <div className="hl-columns">
          <section className="admin-card hl-card" aria-labelledby="hl-sections-title">
            <div>
              <h2 id="hl-sections-title" className="admin-card-title">
                Sections
              </h2>
              <p className="admin-card-subtitle">
                Drag a section, or use the arrows, to change its place on the page. Hidden sections stay out of the storefront.
              </p>
            </div>
            <ol className="hl-sections">
              {draft.sections.map((section, index) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  index={index}
                  total={draft.sections.length}
                  isLastVisible={visibleCountSections <= 1}
                  notes={sectionNotes(section.id)}
                  dragOver={dragOver === index && dragFrom !== index}
                  onMove={onMoveSection}
                  onChange={onChangeSection(section.id)}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                />
              ))}
            </ol>
          </section>

          <section className="admin-card hl-card hl-card--preview" aria-labelledby="hl-preview-title">
            <div>
              <h2 id="hl-preview-title" className="admin-card-title">
                Preview
              </h2>
              <p className="admin-card-subtitle">
                A schematic of your unsaved layout. Open the storefront after saving to see real content.
              </p>
            </div>
            <LayoutPreview sections={draft.sections} />
          </section>
        </div>

        <section className="admin-card hl-card" aria-labelledby="hl-products-title">
          <div className="hl-products-head">
            <div>
              <h2 id="hl-products-title" className="admin-card-title">
                Home product feed
              </h2>
              <p className="admin-card-subtitle">
                Order of the live products in the Featured Elegance and Heritage Masterpieces rows. Pinned products keep their
                place as new products are added. Hiding only removes a product from these rows, not from the shop.
              </p>
            </div>
            <div className="form-group admin-form-group--tight">
              <label className="form-label" htmlFor="hl-search">
                Search products
              </label>
              <input
                id="hl-search"
                type="search"
                className="form-input"
                placeholder="Name, category or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <p className="hl-hint" aria-live="polite">
            {draft.products.top.length} pinned to top · {draft.products.bottom.length} pinned to bottom ·{' '}
            {draft.products.hidden.length} hidden · up to {MAX_PINNED_PRODUCTS} per list.
          </p>

          {productsLoading && products.length === 0 ? (
            <p className="hl-hint">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="hl-empty">There are no live products yet.</p>
          ) : feedRows.length === 0 ? (
            <p className="hl-empty">No products match “{search}”.</p>
          ) : (
            <ol className="hl-products">
              {shownRows.map(({ product, position }) => {
                const placement = getPlacement(draft.products, product.id);
                const list = placement === 'top' || placement === 'bottom' ? draft.products[placement] : [];
                return (
                  <ProductRowWithMarkers
                    key={product.id}
                    product={product}
                    position={position}
                    placement={placement}
                    pinnedIndex={list.indexOf(String(product.id))}
                    pinnedCount={list.length}
                    showMarkers={!searching}
                    row1End={row1End}
                    row2End={row2End}
                    onPlace={onPlace}
                    onNudge={onNudge}
                  />
                );
              })}
            </ol>
          )}
          {shownRows.length < feedRows.length && (
            <button type="button" className="btn btn-secondary hl-more" onClick={() => setVisibleCount((n) => n + PRODUCT_PAGE_SIZE)}>
              Show more ({feedRows.length - shownRows.length} left)
            </button>
          )}

          {hiddenProducts.length > 0 && (
            <div className="hl-subsection">
              <h3 className="hl-subtitle">Hidden from the home feed ({hiddenProducts.length})</h3>
              <ul className="hl-products">
                {hiddenProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    position={null}
                    placement="hidden"
                    pinnedIndex={-1}
                    pinnedCount={0}
                    onPlace={onPlace}
                    onNudge={onNudge}
                  />
                ))}
              </ul>
            </div>
          )}

          {missingIds.length > 0 && (
            <div className="hl-subsection">
              <h3 className="hl-subtitle">Products that no longer exist ({missingIds.length})</h3>
              <p className="hl-hint">
                These pins point at deleted products and have no effect on the storefront. They are removed when you save.
              </p>
              <ul className="hl-missing">
                {missingIds.map((id) => (
                  <li key={id}>
                    <code>{id}</code>
                    <button type="button" className="hl-text-btn" onClick={() => onPlace(id, null)}>
                      Remove now
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Adds the "row ends here" dividers around a product row.
function ProductRowWithMarkers({ position, showMarkers, row1End, row2End, ...rowProps }) {
  return (
    <>
      <ProductRow position={position} {...rowProps} />
      {showMarkers && position === row1End && (
        <li className="hl-marker" aria-hidden="true">
          End of Featured Elegance (first {row1End} products)
        </li>
      )}
      {showMarkers && position === row2End && (
        <li className="hl-marker hl-marker--cutoff" aria-hidden="true">
          End of Heritage Masterpieces — products below here are not on the home page
        </li>
      )}
    </>
  );
}
