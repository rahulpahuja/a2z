import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import { subscribeToTopProducts } from '../services/productStats.js';

const TABS = [
  { key: 'views', label: 'Most Viewed', statLabel: 'views', icon: 'visibility' },
  { key: 'purchases', label: 'Best Sellers', statLabel: 'sold', icon: 'shopping_bag' },
];

export default function TrendingProducts() {
  const { products: allProducts } = useProducts();
  const [activeTab, setActiveTab] = useState('views');
  const [rows, setRows] = useState({ views: [], purchases: [] });

  useEffect(() => {
    const unsubscribers = TABS.map((tab) =>
      subscribeToTopProducts(tab.key, 4, (stats) => {
        setRows((prev) => ({ ...prev, [tab.key]: stats }));
      })
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const tab = TABS.find((t) => t.key === activeTab);
  const products = rows[activeTab]
    .map((stat) => {
      const match = allProducts.find((p) => p.id === stat.id);
      return match ? { ...match, stat: stat[activeTab] } : null;
    })
    .filter(Boolean);

  if (rows.views.length === 0 && rows.purchases.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-margin-desktop max-w-container-max mx-auto">
      <div className="flex flex-col items-center gap-6 mb-12">
        <h2 className="font-headline-md text-headline-md playfair text-center">Trending Now</h2>
        <div className="flex gap-2 bg-surface-container rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-label-caps text-label-caps uppercase transition-colors ${
                activeTab === t.key
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group relative bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300"
          >
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius"
                data-alt={product.alt}
                src={product.image}
              />
              <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur text-on-surface px-3 py-1 rounded-full font-label-caps text-label-caps flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                {product.stat.toLocaleString('en-IN')} {tab.statLabel}
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <h3 className="font-title-sm text-title-sm text-on-surface truncate">{product.name || product.title}</h3>
              <p className="font-price-display text-price-display text-primary">{formatCurrency(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
