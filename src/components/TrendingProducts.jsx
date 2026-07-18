import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import { subscribeToTopProducts } from '../services/productStats.js';
import ProductCardImage from './ProductCardImage.jsx';

const TABS = [
  { key: 'views', label: 'Most Viewed', statLabel: 'views', icon: 'visibility' },
  { key: 'purchases', label: 'Best Sellers', statLabel: 'sold', icon: 'shopping_bag' },
];

export default function TrendingProducts() {
  const { products: allProducts } = useProducts();
  const [activeTab, setActiveTab] = useState('views');
  const [rows, setRows] = useState({ views: [], purchases: [] });
  const scrollRef = useRef(null);

  useEffect(() => {
    const unsubscribers = TABS.map((tab) =>
      subscribeToTopProducts(tab.key, 20, (stats) => {
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
      <div className="relative flex flex-col items-center gap-6 mb-12">
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
        <Link
          to="/products"
          className="absolute right-0 top-1 font-label-caps text-label-caps text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
        >
          View All
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>

      <div className="relative group/arrows">
        {/* Left scroll navigation */}
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Left"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        {/* Scrolling horizontal list */}
        <div
          ref={scrollRef}
          className="flex gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {products.map((product) => (
            <div key={product.id} className="min-w-[250px] sm:min-w-[270px] w-[270px] shrink-0 snap-start">
              <Link
                to={`/product/${product.id}`}
                className="group flex flex-col h-full bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300"
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                  <ProductCardImage
                    images={product.images && product.images.length > 0 ? product.images : [product.image]}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius"
                    alt={product.alt}
                  />
                  <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur text-on-surface px-3 py-1 rounded-full font-label-caps text-label-caps flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                    {product.stat.toLocaleString('en-IN')} {tab.statLabel}
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2 mt-auto">
                  <h3 className="font-title-sm text-title-sm text-on-surface truncate">{product.name || product.title}</h3>
                  <p className="font-price-display text-price-display text-primary">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Right scroll navigation */}
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Right"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </section>
  );
}
