import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import { getDiscountedPrice } from '../utils/discount.js';
import ProductCardImage from './ProductCardImage.jsx';
import { createProductSearchIndex } from '../utils/productSearch.js';
import { logSearch, logSelectItem } from '../services/analytics.js';

const EXPANDED_WIDTH = 260;

// Search icon that expands in place into an input. The bar overlays the header
// rather than opening a modal, so the page underneath stays visible.
export default function SearchBar({ className = '' }) {
  const { products } = useProducts();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const rootRef = useRef(null);
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
      return undefined;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = debouncedQuery.trim();
    if (!needle) return [];
    return index.search(needle, { limit: 8 }).map((r) => r.item);
  }, [index, debouncedQuery]);

  useEffect(() => {
    const needle = debouncedQuery.trim();
    if (needle) logSearch(needle);
  }, [debouncedQuery]);

  const close = () => setOpen(false);
  const showResults = open && debouncedQuery.trim();

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Search"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="hover:opacity-80 transition-opacity duration-200"
      >
        <span className="material-symbols-outlined">search</span>
      </button>

      <motion.div
        initial={false}
        animate={{ width: open ? EXPANDED_WIDTH : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        inert={!open}
        className="absolute right-0 top-1/2 -translate-y-1/2 h-11 overflow-hidden rounded-full border border-outline-variant bg-surface shadow-md"
      >
        <div className="flex h-full items-center gap-2 pl-3 pr-2" style={{ width: EXPANDED_WIDTH }}>
          <span className="material-symbols-outlined text-on-surface-variant text-[1.25rem]">search</span>
          <input
            ref={inputRef}
            type="text"
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="flex-1 min-w-0 bg-transparent border-0 focus:ring-0 p-0 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant"
          />
          <button type="button" aria-label="Close search" onClick={close} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[1.25rem]">close</span>
          </button>
        </div>
      </motion.div>

      {showResults && (
        <div className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto rounded-2xl border border-outline-variant/40 bg-surface shadow-xl p-2 flex flex-col gap-1 z-[250]">
          {results.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant py-6 text-center">
              No products matched “{debouncedQuery.trim()}”.
            </p>
          )}
          {results.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              onClick={() => {
                logSelectItem(product, 'Search Results');
                close();
              }}
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
                <p className="font-body-lg text-body-lg text-on-surface truncate">{product.title || product.name}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  {(product.categoryTitle || product.category) ?? ''} · {formatCurrency(getDiscountedPrice(product))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
