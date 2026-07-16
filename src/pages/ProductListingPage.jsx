import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { useProducts } from '../context/ProductsContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import './ProductListingPage.css';

const NAV_LINKS = [
  { label: 'New Arrivals', to: '/products' },
  { label: 'Sarees', to: '/products?category=Saree' },
  { label: 'Lehengas', to: '/products?category=Lehenga' },
  { label: 'Kurtis', to: '/products?category=Kurti' },
];

const COLORS = [
  { id: 'red', label: 'Red', className: 'bg-red-600' },
  { id: 'blue', label: 'Blue', className: 'bg-blue-800' },
  { id: 'green', label: 'Green', className: 'bg-green-700' },
  { id: 'yellow', label: 'Yellow', className: 'bg-yellow-400' },
  { id: 'dusty-rose', label: 'Dusty Rose', className: 'bg-[#DCAE96]' },
  { id: 'black', label: 'Black', className: 'bg-black' },
  { id: 'white', label: 'White', className: 'bg-white' },
];

const SIZES = [
  { id: 'xs', label: 'XS', disabled: false },
  { id: 's', label: 'S', disabled: false },
  { id: 'm', label: 'M', disabled: false },
  { id: 'l', label: 'L', disabled: false },
  { id: 'xl', label: 'XL', disabled: false },
  { id: 'xxl', label: 'XXL', disabled: true },
];

const BADGE_STYLES = {
  Handcrafted: 'bg-secondary-container text-on-secondary-container',
  'New Arrival': 'bg-tertiary text-on-tertiary',
  '15% OFF': 'bg-error text-on-error',
  'Best Seller': 'bg-tertiary text-on-tertiary',
};

const PAGES = [1];

export default function ProductListingPage() {
  const { products: CATALOG, categories: CATEGORY_OPTIONS, subcategories: SUBCATEGORIES } = useProducts();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'All';
  const activeSubcategory = searchParams.get('subcategory') ?? 'All';

  const [priceValue, setPriceValue] = useState(2500);
  const [selectedColor, setSelectedColor] = useState('dusty-rose');
  const [selectedSize, setSelectedSize] = useState('m');
  const [favorites, setFavorites] = useState({});
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const setActiveCategory = (category) => {
    const next = {};
    if (category !== 'All') next.category = category;
    setSearchParams(next);
  };

  const setActiveSubcategory = (subcategory) => {
    const next = {};
    if (activeCategory !== 'All') next.category = activeCategory;
    if (subcategory !== 'All') next.subcategory = subcategory;
    setSearchParams(next);
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedColorLabel = COLORS.find((c) => c.id === selectedColor)?.label ?? null;
  const selectedSizeLabel = SIZES.find((s) => s.id === selectedSize)?.label ?? null;

  const subcategoryOptions = useMemo(() => {
    const relevant = activeCategory === 'All'
      ? SUBCATEGORIES
      : SUBCATEGORIES.filter((s) => s.categoryTitle === activeCategory);
    const titles = [...new Set(relevant.map((s) => s.title))];
    return titles;
  }, [SUBCATEGORIES, activeCategory]);

  const filteredProducts = useMemo(() => {
    let base = activeCategory === 'All' ? CATALOG : CATALOG.filter((p) => (p.category || p.categoryTitle) === activeCategory);
    if (activeSubcategory !== 'All') {
      base = base.filter((p) => p.subcategoryTitle === activeSubcategory);
    }
    if (sortBy === 'price-asc') return [...base].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return [...base].sort((a, b) => b.price - a.price);
    if (sortBy === 'popular') return [...base].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return base;
  }, [CATALOG, activeCategory, activeSubcategory, sortBy]);

  // Arrange products grouped by subcategory so like-with-like sits together on the grid.
  const productGroups = useMemo(() => {
    if (activeSubcategory !== 'All') {
      return [{ title: null, items: filteredProducts }];
    }
    const groups = [];
    const indexByTitle = new Map();
    filteredProducts.forEach((product) => {
      const key = product.subcategoryTitle || '';
      if (!indexByTitle.has(key)) {
        indexByTitle.set(key, groups.length);
        groups.push({ title: key || null, items: [] });
      }
      groups[indexByTitle.get(key)].items.push(product);
    });
    if (groups.length <= 1) {
      return [{ title: null, items: filteredProducts }];
    }
    return groups;
  }, [filteredProducts, activeSubcategory]);

  return (
    <>
      <header className="bg-surface dark:bg-surface-container-highest flex justify-between items-center w-full px-6 md:px-12 py-4 max-w-[1680px] mx-auto z-50 docked full-width top-0 sticky">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">A2Z Collection</Link>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim font-body-lg text-body-lg hover:opacity-80 transition-opacity duration-200"
              to={link.to}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-primary dark:text-primary-fixed-dim">
          <button aria-label="Search" className="hover:opacity-80 transition-opacity duration-200">
            <span className="material-symbols-outlined">search</span>
          </button>
          <CartIconButton className="hover:opacity-80 transition-opacity duration-200" />
          <ProfileButton className="hover:opacity-80 transition-opacity duration-200" />
        </div>
      </header>

      <div className="w-full max-w-[1680px] mx-auto px-6 md:px-12 py-8 md:py-12 flex flex-col md:flex-row justify-between items-baseline border-b border-surface-variant">
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface">
          {activeCategory === 'All' ? 'ALL PRODUCTS' : `${activeCategory.toUpperCase()}S`}
        </h1>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <label className="font-body-sm text-body-sm text-on-surface-variant" htmlFor="sort-by">Sort by:</label>
          <div className="relative">
            <select
              className="appearance-none bg-transparent border border-outline rounded-lg py-2 pl-4 pr-10 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="popular">Popularity</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-sm">expand_more</span>
          </div>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1680px] mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-[260px] flex-shrink-0 space-y-8 pr-4">
          <div className="space-y-4 border-b border-surface-variant pb-6">
            <h3 className="font-title-sm text-title-sm text-on-surface flex justify-between items-center cursor-pointer">
              Category
              <span className="material-symbols-outlined text-on-surface-variant text-sm">remove</span>
            </h3>
            <div className="space-y-3">
              {CATEGORY_OPTIONS.map((category) => (
                <label key={category} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    checked={activeCategory === category}
                    onChange={() => setActiveCategory(category)}
                    className="filter-checkbox rounded border-outline w-5 h-5 text-primary focus:ring-primary transition-colors"
                    type="radio"
                    name="category"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-primary transition-colors">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {subcategoryOptions.length > 0 && (
            <div className="space-y-4 border-b border-surface-variant pb-6">
              <h3 className="font-title-sm text-title-sm text-on-surface flex justify-between items-center cursor-pointer">
                Subcategory
                <span className="material-symbols-outlined text-on-surface-variant text-sm">remove</span>
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    checked={activeSubcategory === 'All'}
                    onChange={() => setActiveSubcategory('All')}
                    className="filter-checkbox rounded border-outline w-5 h-5 text-primary focus:ring-primary transition-colors"
                    type="radio"
                    name="subcategory"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-primary transition-colors">All</span>
                </label>
                {subcategoryOptions.map((subcategory) => (
                  <label key={subcategory} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      checked={activeSubcategory === subcategory}
                      onChange={() => setActiveSubcategory(subcategory)}
                      className="filter-checkbox rounded border-outline w-5 h-5 text-primary focus:ring-primary transition-colors"
                      type="radio"
                      name="subcategory"
                    />
                    <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-primary transition-colors">{subcategory}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 border-b border-surface-variant pb-6">
            <h3 className="font-title-sm text-title-sm text-on-surface flex justify-between items-center cursor-pointer">
              Price Range
              <span className="material-symbols-outlined text-on-surface-variant text-sm">remove</span>
            </h3>
            <div className="pt-2">
              <input
                className="range-slider mb-4"
                max="4999"
                min="299"
                type="range"
                value={priceValue}
                onChange={(e) => setPriceValue(Number(e.target.value))}
              />
              <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                <span>₹299</span>
                <span>₹4,999</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-b border-surface-variant pb-6">
            <h3 className="font-title-sm text-title-sm text-on-surface flex justify-between items-center cursor-pointer">
              Color
              <span className="material-symbols-outlined text-on-surface-variant text-sm">remove</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((color) => {
                const isSelected = selectedColor === color.id;
                return (
                  <button
                    key={color.id}
                    aria-label={color.label}
                    onClick={() => setSelectedColor(color.id)}
                    className={`w-8 h-8 rounded-full ${color.className} border ${color.id === 'white' ? 'border-outline' : 'border-outline/20'} ring-2 ${isSelected ? 'ring-primary' : 'ring-transparent'} focus:ring-primary transition-all hover:scale-110 relative`}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-white text-[16px]">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pb-6">
            <h3 className="font-title-sm text-title-sm text-on-surface flex justify-between items-center cursor-pointer">
              Size
              <span className="material-symbols-outlined text-on-surface-variant text-sm">remove</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => {
                const isSelected = selectedSize === size.id;
                return (
                  <button
                    key={size.id}
                    disabled={size.disabled}
                    onClick={() => !size.disabled && setSelectedSize(size.id)}
                    className={
                      isSelected
                        ? 'px-4 py-2 rounded-[32px] bg-tertiary text-on-tertiary border-transparent font-label-caps text-label-caps transition-colors'
                        : `px-4 py-2 rounded-[32px] border border-outline text-on-surface font-label-caps text-label-caps hover:border-primary hover:text-primary transition-colors${size.disabled ? ' opacity-50 cursor-not-allowed' : ''}`
                    }
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="w-full py-3 rounded-xl border border-primary text-primary font-label-caps text-label-caps uppercase tracking-widest hover:bg-primary/5 transition-colors"
            onClick={() => {
              setSearchParams({});
              setPriceValue(2500);
              setSelectedColor(null);
              setSelectedSize(null);
            }}
          >
            Clear Filters
          </button>
        </aside>

        <div className="flex-grow">
          <div className="flex flex-wrap gap-2 mb-6 hidden md:flex">
            {selectedColorLabel && (
              <span className="px-3 py-1 rounded-[32px] bg-surface-variant text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                {selectedColorLabel}{' '}
                <button className="hover:text-error" onClick={() => setSelectedColor(null)}>
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </span>
            )}
            {selectedSizeLabel && (
              <span className="px-3 py-1 rounded-[32px] bg-surface-variant text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                Size: {selectedSizeLabel}{' '}
                <button className="hover:text-error" onClick={() => setSelectedSize(null)}>
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </span>
            )}
          </div>

          {productGroups.map((group, groupIdx) => (
            <div key={group.title ?? `group-${groupIdx}`} className={groupIdx > 0 ? 'mt-10' : ''}>
              {group.title && (
                <h2 className="font-title-md text-title-md text-on-surface mb-4 pb-2 border-b border-surface-variant">
                  {group.title}
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {group.items.map((product) => {
                  const isFavorited = !!favorites[product.id];
                  const isAvailable = product.sizes?.some((s) => s.stock > 0) ?? product.inStock;
                  return (
                    <article
                  key={product.id}
                  className={`group relative flex flex-col bg-surface-container-lowest border border-[#DCAE96]/30 rounded-[16px] overflow-hidden transition-all duration-300 hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] hover:-translate-y-1 ${!isAvailable ? 'opacity-85' : ''}`}
                >
                  <Link to={`/product/${product.id}`} className="relative w-full aspect-[3/4] overflow-hidden product-card-img-wrapper bg-surface-container block">
                    <ProductImage
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                      loading="lazy"
                      src={product.image}
                      alt={product.alt}
                    />
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                        <span className="bg-error text-on-error font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-wider font-bold shadow-md">
                          Out of Stock
                        </span>
                      </div>
                    )}
                    {product.badge && (
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-[32px] ${BADGE_STYLES[product.badge] ?? 'bg-tertiary text-on-tertiary'} font-label-caps text-label-caps shadow-sm`}>
                          {product.badge}
                        </span>
                      </div>
                    )}
                    <button
                      aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                      onClick={(event) => {
                        event.preventDefault();
                        toggleFavorite(product.id);
                      }}
                      className={`absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm ${isFavorited ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                    >
                      <span className="material-symbols-outlined" data-weight={isFavorited ? 'fill' : undefined}>
                        {isFavorited ? 'favorite' : 'favorite_border'}
                      </span>
                    </button>
                  </Link>
                  <div className="p-4 flex flex-col flex-grow">
                    <span className="font-label-caps text-[10px] text-primary/80 uppercase tracking-wider mb-1 font-semibold block">
                      {product.category || product.categoryTitle}
                    </span>
                    <Link to={`/product/${product.id}`}>
                      <h2 className="font-title-sm text-title-sm text-on-surface mb-1 line-clamp-1">{product.name || product.title}</h2>
                    </Link>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 line-clamp-1">{product.description}</p>
                    {product.originalPrice ? (
                      <div className="mt-auto flex flex-col justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="font-price-display text-price-display text-error">{formatCurrency(product.price)}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant line-through">{formatCurrency(product.originalPrice)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto flex items-center justify-between">
                        <div className="font-price-display text-price-display text-on-surface">{formatCurrency(product.price)}</div>
                        {product.rating && (
                          <div className="flex items-center gap-1 text-tertiary">
                            <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                            <span className="font-body-sm text-body-sm font-medium">{product.rating}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(product.sizes?.some((s) => s.stock > 0) ?? product.inStock) ? (
                      <button
                        onClick={() =>
                          addItem({
                            id: product.id,
                            title: product.name || product.title,
                            price: product.price,
                            image: product.image,
                            alt: product.alt,
                            color: null,
                            size: null,
                          })
                        }
                        className="mt-4 w-full py-3 rounded-xl bg-primary text-white font-label-caps text-label-caps uppercase hover:bg-primary-container hover:text-on-primary-container transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary outline-none"
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <button disabled className="mt-4 w-full py-3 rounded-xl border-2 border-primary text-primary font-label-caps text-label-caps uppercase opacity-60 cursor-not-allowed focus:ring-2 focus:ring-offset-2 focus:ring-primary outline-none">
                        Out of Stock
                      </button>
                    )}
                  </div>
                </article>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-12 flex justify-center items-center gap-2">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center border border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            {PAGES.map((page, idx) =>
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="text-on-surface-variant">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={
                    currentPage === page
                      ? 'w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white font-body-sm text-body-sm transition-colors'
                      : 'w-10 h-10 rounded-full flex items-center justify-center border border-transparent text-on-surface hover:bg-surface-variant font-body-sm text-body-sm transition-colors'
                  }
                >
                  {page}
                </button>
              )
            )}
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center border border-outline text-on-surface hover:border-primary hover:text-primary transition-colors"
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-surface-container-low dark:bg-surface-container-lowest mt-auto grid grid-cols-1 md:grid-cols-4 gap-gutter px-6 md:px-12 py-12 max-w-[1680px] mx-auto full-width bottom">
        <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">A2Z Collection</Link>
          <p className="font-body-sm text-body-sm text-on-surface-variant">© 2026 A2Z Collection. All rights reserved.</p>
        </div>
        <div className="col-span-1 md:col-span-3 flex flex-wrap gap-8 md:justify-end items-start">
          <a className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim font-body-sm text-body-sm hover:underline transition-all" href="#">About Us</a>
          <a className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim font-body-sm text-body-sm hover:underline transition-all" href="#">Shipping Policy</a>
          <a className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim font-body-sm text-body-sm hover:underline transition-all" href="#">Returns</a>
          <a className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim font-body-sm text-body-sm hover:underline transition-all" href="#">Contact Us</a>
          <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim font-body-sm text-body-sm hover:underline transition-all" to="/privacy-policy">Privacy Policy</Link>
        </div>
      </footer>
    </>
  );
}
