import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { subscribeToAdminProducts } from '../services/adminProducts.js';
import { subscribeToCategories } from '../services/categories.js';
import { subscribeToSubcategories } from '../services/subcategories.js';
import { PRODUCTS } from '../data/products.js';

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const [dbProducts, setDbProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [dbSubcategories, setDbSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubProducts = subscribeToAdminProducts((rows) => {
      setDbProducts(rows);
    });
    const unsubCategories = subscribeToCategories((rows) => {
      setDbCategories(rows);
      setLoading(false);
    });
    const unsubSubcategories = subscribeToSubcategories((rows) => {
      setDbSubcategories(rows);
    });
    return () => {
      unsubProducts();
      unsubCategories();
      unsubSubcategories();
    };
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
    const titles = dbCategories.map((c) => c.title);
    return ['All', ...titles];
  }, [dbCategories]);

  const subcategories = useMemo(() => dbSubcategories, [dbSubcategories]);

  const value = useMemo(
    () => ({
      products,
      categories,
      subcategories,
      loading,
    }),
    [products, categories, subcategories, loading]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
