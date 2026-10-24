import { useMemo, useState } from 'react';
import { useProducts } from '../../../context/ProductsContext.jsx';
import { formatCurrency } from '../../../context/CartContext.jsx';
import ProductImage from '../../ProductImage.jsx';
import { getDiscountedPrice } from '../../../utils/discount.js';
import { isProductAvailable } from '../../../utils/productColors.js';
import { addProductId, applyCollection, categoriesOf, filterProducts, moveProductId, productLimit, reconcileHero, removeCollection, removeProductId } from '../../../utils/blog/picker.js';
import { getBlogType } from '../../../utils/blog/types.js';

const PAGE = 20;
const photo = (p) => (p.images && p.images[0]) || p.image || '';

// Chooses the products and collections an article is about. It only stores ids: names, prices and stock are
// always read live from the catalogue. `value` = { productIds, collectionIds, heroProductId, primaryCollectionId }.
export default function BlogProductPicker({ type, value, onChange, collections }) {
  const { products } = useProducts();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [availability, setAvailability] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [note, setNote] = useState('');

  const limit = productLimit(type);
  const def = getBlogType(type);
  const chosen = new Set(value.productIds);
  const byId = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);
  const filterCollection = collections.find((c) => c.id === collectionFilter) ?? null;
  const results = useMemo(
    () => filterProducts(products, { query, category, collection: filterCollection, availability, minPrice, maxPrice }),
    [products, query, category, filterCollection, availability, minPrice, maxPrice]
  );
  const set = (next) => onChange(reconcileHero(next));

  const add = (id) => {
    const ids = addProductId(value.productIds, id, limit);
    if (ids === value.productIds && !chosen.has(String(id))) setNote(`${def.label} allows at most ${limit} product${limit === 1 ? '' : 's'}.`);
    else setNote('');
    set({ ...value, productIds: ids });
  };

  const addCollection = (collectionId) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;
    const { value: next, skipped } = applyCollection(value, collection, products, limit);
    setNote(skipped ? `${skipped} product${skipped === 1 ? '' : 's'} from this collection did not fit the limit of ${limit}.` : '');
    set(next);
  };

  return (
    <div className="pk">
      <p className="pk__hint">{def.label}: {def.products.mode === 'none' ? 'products are optional' : `${def.products.min === def.products.max ? `exactly ${def.products.min}` : `${def.products.min}–${def.products.max}`} product${def.products.max === 1 ? '' : 's'}`}.</p>

      <div className="pk__selected" aria-label="Chosen products">
        <h4>Chosen ({value.productIds.length}/{limit})</h4>
        {value.productIds.length === 0 ? <p className="pk__hint">Nothing chosen yet.</p> : (
          <ol>
            {value.productIds.map((id, i) => {
              const p = byId.get(String(id));
              return (
                <li key={id} className="pk__row">
                  <span className="pk__thumb">{p && photo(p) ? <ProductImage src={photo(p)} alt="" className="pk__img" /> : null}</span>
                  <span className="pk__name">{p ? p.name || p.title : `${id} (no longer in the catalogue)`}</span>
                  <button type="button" className="pk__icon" aria-label={`Move ${p?.name ?? id} up`} disabled={i === 0} onClick={() => set({ ...value, productIds: moveProductId(value.productIds, id, -1) })}>↑</button>
                  <button type="button" className="pk__icon" aria-label={`Move ${p?.name ?? id} down`} disabled={i === value.productIds.length - 1} onClick={() => set({ ...value, productIds: moveProductId(value.productIds, id, 1) })}>↓</button>
                  <label className="pk__hero"><input type="radio" name="hero-product" checked={value.heroProductId === String(id)} onChange={() => set({ ...value, heroProductId: String(id) })} /> Hero</label>
                  <button type="button" className="pk__icon pk__icon--danger" aria-label={`Remove ${p?.name ?? id}`} onClick={() => set({ ...value, productIds: removeProductId(value.productIds, id) })}>✕</button>
                </li>
              );
            })}
          </ol>
        )}
        {value.heroProductId && <button type="button" className="pk__link" onClick={() => set({ ...value, heroProductId: '' })}>Clear hero product</button>}
      </div>

      <div className="pk__collections">
        <h4>Collections</h4>
        <div className="pk__addcol">
          <select aria-label="Add a collection" value="" onChange={(e) => addCollection(e.target.value)}>
            <option value="">Add a collection (adds its products)…</option>
            {collections.filter((c) => !value.collectionIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}{c.published ? '' : ' (unpublished)'}</option>)}
          </select>
        </div>
        {value.collectionIds.map((id) => (
          <div key={id} className="pk__row">
            <span className="pk__name">{collections.find((c) => c.id === id)?.name ?? `${id} (deleted)`}</span>
            <label className="pk__hero"><input type="radio" name="primary-collection" checked={value.primaryCollectionId === id} onChange={() => set({ ...value, primaryCollectionId: id })} /> Primary</label>
            <button type="button" className="pk__icon pk__icon--danger" aria-label={`Remove collection ${collections.find((c) => c.id === id)?.name ?? id}`} onClick={() => set(removeCollection(value, id))}>✕</button>
          </div>
        ))}
        <p className="pk__hint">Removing a collection keeps the products you chose.</p>
      </div>

      <div className="pk__search">
        <h4>Find products</h4>
        <input type="search" aria-label="Search products" placeholder="Name, SKU or ID" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
        <div className="pk__filters">
          <select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE); }}>
            <option value="">All categories</option>
            {categoriesOf(products).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Collection" value={collectionFilter} onChange={(e) => { setCollectionFilter(e.target.value); setShown(PAGE); }}>
            <option value="">Any collection</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label="Availability" value={availability} onChange={(e) => { setAvailability(e.target.value); setShown(PAGE); }}>
            <option value="all">Any availability</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
          <input type="number" aria-label="Minimum price" placeholder="Min ₹" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setShown(PAGE); }} />
          <input type="number" aria-label="Maximum price" placeholder="Max ₹" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setShown(PAGE); }} />
        </div>
        {note && <p className="pk__note" role="status">{note}</p>}
        <ul className="pk__results" aria-label="Matching products">
          {results.slice(0, shown).map((p) => (
            <li key={p.id} className="pk__row">
              <span className="pk__thumb">{photo(p) ? <ProductImage src={photo(p)} alt="" className="pk__img" /> : null}</span>
              <span className="pk__name">{p.name || p.title}<small>{formatCurrency(getDiscountedPrice(p))} · {isProductAvailable(p) ? 'In stock' : 'Out of stock'}{p.sku ? ` · ${p.sku}` : ''}</small></span>
              {chosen.has(String(p.id)) ? (
                <button type="button" className="pk__add pk__add--on" onClick={() => set({ ...value, productIds: removeProductId(value.productIds, p.id) })}>Remove</button>
              ) : (
                <button type="button" className="pk__add" onClick={() => add(p.id)}>Add</button>
              )}
            </li>
          ))}
        </ul>
        {results.length === 0 && <p className="pk__hint">No products match.</p>}
        {results.length > shown && <button type="button" className="pk__link" onClick={() => setShown((n) => n + PAGE)}>Show more ({results.length - shown} left)</button>}
      </div>
    </div>
  );
}
