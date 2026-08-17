import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import { subscribeToTopProducts } from '../services/productStats.js';
import ProductCardImage from './ProductCardImage.jsx';
import EmptySegment from './EmptySegment.jsx';

const TABS = [
  { key: 'views', label: 'Most Viewed', statLabel: 'views', icon: 'visibility' },
  { key: 'purchases', label: 'Best Sellers', statLabel: 'sold', icon: 'shopping_bag' },
];

export default function TrendingProducts({ productsPerRow = 8 }) {
  const { products: allProducts } = useProducts();
  const [activeTab, setActiveTab] = useState('views');
  const [rows, setRows] = useState({ views: [], purchases: [] });
  const scrollRef = useRef(null);

  useEffect(() => {
    const unsubscribers = TABS.map((tab) =>
      subscribeToTopProducts(tab.key, productsPerRow, (stats) => {
        setRows((prev) => ({ ...prev, [tab.key]: stats }));
      })
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [productsPerRow]);

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
    <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8 md:mb-12">
        <div className="flex justify-between items-center w-full gap-2">
          <h2 className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md playfair text-on-surface">
            Trending Now
          </h2>
          <Link
            to="/products"
            className="font-label-caps text-[11px] md:text-label-caps text-primary hover:underline uppercase tracking-wider flex items-center gap-1 shrink-0"
          >
            View All
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">arrow_forward</span>
          </Link>
        </div>
        <div className="flex justify-start sm:justify-center w-full overflow-x-auto hide-scrollbar">
          <div className="flex gap-1.5 sm:gap-2 bg-surface-container rounded-full p-1 max-w-full shrink-0">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full font-label-caps text-[11px] sm:text-label-caps uppercase transition-colors shrink-0 ${
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
      </div>

      {products.length === 0 ? (
        <EmptySegment message={`No ${tab.label.toLowerCase()} yet — check back soon.`} icon={tab.icon} />
      ) : (
      <div className="relative group/arrows w-full max-w-full min-w-0">
        {/* Left scroll navigation */}
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Left"
        >
          <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
        </button>

        {/* Scrolling horizontal list */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth w-full max-w-full min-w-0"
        >
          {products.map((product) => (
            <div key={product.id} className="min-w-[220px] sm:min-w-[260px] md:min-w-[270px] w-[220px] sm:w-[260px] md:w-[270px] shrink-0 snap-start">
              <Link
                to={`/products/${product.id}`}
                className="group flex flex-col h-full bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300"
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                  <ProductCardImage
                    images={product.images && product.images.length > 0 ? product.images : [product.image]}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius"
                    alt={product.alt}
                  />
                  <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-surface/90 backdrop-blur text-on-surface px-2.5 py-1 rounded-full font-label-caps text-[10px] md:text-label-caps flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] md:text-[14px]">{tab.icon}</span>
                    {product.stat.toLocaleString('en-IN')} {tab.statLabel}
                  </div>
                </div>
                <div className="p-3.5 md:p-4 flex flex-col gap-1.5 md:gap-2 mt-auto">
                  <h3 className="font-title-sm text-sm md:text-title-sm text-on-surface truncate">{product.name || product.title}</h3>
                  <p className="font-price-display text-base md:text-price-display text-primary">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Right scroll navigation */}
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Scroll Right"
        >
          <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
        </button>
      </div>
      )}
    </section>
  );
}
