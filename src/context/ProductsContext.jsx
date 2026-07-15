import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { subscribeToAdminProducts } from '../services/adminProducts.js';
import { PRODUCTS } from '../data/products.js';

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAdminProducts((rows) => {
      setDbProducts(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  const products = useMemo(() => {
    const merged = [...dbProducts];
    PRODUCTS.forEach((staticProd) => {
      if (!merged.some((p) => p.id === staticProd.id)) {
        merged.push({
          ...staticProd,
          title: staticProd.name,
          categoryTitle: staticProd.category,
        });
      }
    });
    return merged;
  }, [dbProducts]);

  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      const cat = p.categoryTitle || p.category;
      if (cat) cats.add(cat);
    });
    return ['All', ...Array.from(cats)];
  }, [products]);

  const value = useMemo(
    () => ({
      products,
      categories,
      loading,
    }),
    [products, categories, loading]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
