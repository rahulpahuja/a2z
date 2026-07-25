import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import ProductCardImage from './ProductCardImage.jsx';
import { createProductSearchIndex } from '../utils/productSearch.js';

export default function SearchModal({ open, onClose }) {
  const { products } = useProducts();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);

  const index = useMemo(() => createProductSearchIndex(products), [products]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebouncedQuery('');
      return;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    const needle = debouncedQuery.trim();
    if (!needle) return [];
    return index.search(needle, { limit: 8 }).map((r) => r.item);
  }, [index, debouncedQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-on-surface/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20 md:pt-28">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative bg-surface w-full max-w-xl rounded-2xl shadow-xl p-6 flex flex-col gap-4 max-h-[70vh]">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories, colors…"
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg pl-10 pr-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-1 -mx-2 px-2">
          {debouncedQuery.trim() && results.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant py-6 text-center">
              No products matched “{debouncedQuery.trim()}”.
            </p>
          )}
          {results.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              onClick={onClose}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container transition-colors"
            >
              <div className="relative w-14 h-16 rounded-md overflow-hidden bg-surface-variant shrink-0">
                <ProductCardImage
                  images={product.images?.length ? product.images : [product.image]}
                  alt={product.title || product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-lg text-body-lg text-on-surface truncate">
                  {product.title || product.name}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  {(product.categoryTitle || product.category) ?? ''} · {formatCurrency(product.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
