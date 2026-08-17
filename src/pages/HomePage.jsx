import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import TrendingProducts from '../components/TrendingProducts.jsx';
import HomeCollections from '../components/HomeCollections.jsx';
import { useProducts } from '../context/ProductsContext.jsx';
import { useStorefrontTheme } from '../context/StorefrontThemeContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import { getHighResUrl } from '../utils/image.js';
import ProductCardImage from '../components/ProductCardImage.jsx';
import { subscribeToCarousel } from '../services/carousel.js';
import { subscribeToCategoryBubbles, DEFAULT_CATEGORY_BUBBLES } from '../services/categoryBubbles.js';
import { subscribeToTopNav, topNavLinkToPath, DEFAULT_TOP_NAV_LINKS } from '../services/topNav.js';
import { subscribeToStoreSettings, DEFAULT_STORE_SETTINGS } from '../services/storeSettings.js';
import SiteFooter from '../components/SiteFooter.jsx';
import MobileNavDrawer from '../components/MobileNavDrawer.jsx';
import EmptySegment from '../components/EmptySegment.jsx';
import SearchModal from '../components/SearchModal.jsx';
import './HomePage.css';

// Product slices are computed inside the component using the useProducts hook

function VideoCard({ src, poster, title, description }) {
  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPaused(false);
    const handlePause = () => setIsPaused(true);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Force play call on mount or URL change
    video.play()
      .then(() => setIsPaused(false))
      .catch(() => setIsPaused(true));

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src]);

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  return (
    <div
      onClick={handleTogglePlay}
      className="group relative bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300 aspect-[9/16] cursor-pointer"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6">
        <h3 className="font-title-sm text-title-sm text-white playfair mb-1">{title}</h3>
        <p className="font-body-sm text-body-sm text-white/80 line-clamp-2">{description}</p>
        <div className="mt-3 flex items-center gap-1.5 font-label-caps text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
          <span className="material-symbols-outlined text-[16px] animate-pulse">
            {isPaused ? 'play_arrow' : 'pause'}
          </span>
          <span>{isPaused ? 'Tap to play' : 'Playing Lookbook'}</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { products } = useProducts();
  const { theme } = useStorefrontTheme();
  const heritageScrollRef = useRef(null);
  const featuredScrollRef = useRef(null);

  const [favorites, setFavorites] = useState({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState([]);
  const [categoryBubbles, setCategoryBubbles] = useState(DEFAULT_CATEGORY_BUBBLES);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);
  const [homeProductsPerRow, setHomeProductsPerRow] = useState(DEFAULT_STORE_SETTINGS.homeProductsPerRow);
  const [showCategoryBubbles, setShowCategoryBubbles] = useState(DEFAULT_STORE_SETTINGS.showCategoryBubbles);

  const productsRow1 = products.slice(0, homeProductsPerRow);
  const productsRow2 = products.slice(homeProductsPerRow, homeProductsPerRow + 20);

  const navLinks = topNavLinks.map((link) => ({ label: link.label, to: topNavLinkToPath(link) }));

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const unsub = subscribeToTopNav((links) => setTopNavLinks(links));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToStoreSettings((data) => {
      setHomeProductsPerRow(data.homeProductsPerRow || DEFAULT_STORE_SETTINGS.homeProductsPerRow);
      setShowCategoryBubbles(data.showCategoryBubbles ?? DEFAULT_STORE_SETTINGS.showCategoryBubbles);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToCarousel((slides) => {
      const processed = slides.map(s => ({
        ...s,
        image: getHighResUrl(s.image)
      }));
      setHeroSlides(processed);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToCategoryBubbles((bubbles) => {
      setCategoryBubbles(bubbles.map((b) => ({ ...b, image: getHighResUrl(b.image) })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (heroSlides.length === 0) return undefined;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroSlides]);

  const handlePrevSlide = () => {
    if (heroSlides.length === 0) return;
    setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    if (heroSlides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  return (
    <>
      <div className="bg-primary text-on-primary py-2 px-3 text-center text-[11px] sm:text-label-caps font-label-caps uppercase sticky top-0 z-[60] w-full max-w-full break-words [@media(orientation:landscape)_and_(max-height:500px)]:!py-1">
        Enjoy Free Shipping on Orders Above ₹2,500
      </div>
      <header className="bg-surface dark:bg-surface-container-highest docked full-width sticky top-0 md:top-[32px] z-50 flat no shadows border-b border-surface-variant w-full max-w-full">
        <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-3 md:py-4 max-w-container-max mx-auto h-[64px] md:h-[80px] [@media(orientation:landscape)_and_(max-height:500px)]:!h-[52px] [@media(orientation:landscape)_and_(max-height:500px)]:!py-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden [@media(orientation:landscape)_and_(max-height:500px)]:!inline-block text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
            >
              <span className="material-symbols-outlined text-[26px]">menu</span>
            </button>
            <Link
              to="/"
              className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md [@media(orientation:landscape)_and_(max-height:500px)]:!font-headline-md-mobile [@media(orientation:landscape)_and_(max-height:500px)]:!text-headline-md-mobile font-bold text-primary dark:text-primary-fixed-dim playfair tracking-tight truncate"
            >
              A2Z Collection
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8 [@media(orientation:landscape)_and_(max-height:500px)]:!hidden">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase"
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center space-x-3 md:space-x-6 text-primary dark:text-primary-fixed-dim">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="hover:opacity-80 transition-opacity duration-200 hidden md:block [@media(orientation:landscape)_and_(max-height:500px)]:!hidden"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
            <ProfileButton className="hover:opacity-80 transition-opacity duration-200" />
            <CartIconButton className="hover:opacity-80 transition-opacity duration-200" />
          </div>
        </div>
      </header>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="w-full max-w-full overflow-x-clip">
        {/* Hero Carousel */}
        <section className="relative w-full max-w-full h-[52vh] min-h-[360px] sm:h-[65vh] sm:min-h-[460px] md:h-[70vh] md:min-h-[500px] [@media(orientation:landscape)_and_(max-height:500px)]:!h-[70vh] [@media(orientation:landscape)_and_(max-height:500px)]:!min-h-0 bg-surface-container overflow-hidden">
          <div
            className="w-full h-full flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {heroSlides.map((slide, index) => (
              <div key={slide.id || index} className="w-full h-full flex-shrink-0 relative overflow-hidden">
                {/* Blurred, scaled copy fills the frame so the sharp image below never needs to crop */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-60"
                  style={{ backgroundImage: `url('${slide.image}')` }}
                ></div>
                {/* Full, uncropped slide image */}
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                  data-alt={slide.alt}
                  style={{ backgroundImage: `url('${slide.image}')` }}
                ></div>
                <div className="absolute inset-0 bg-black/25"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  {!slide.hideTitle && (
                    <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg [@media(orientation:landscape)_and_(max-height:500px)]:!font-display-lg-mobile [@media(orientation:landscape)_and_(max-height:500px)]:!text-display-lg-mobile text-on-tertiary playfair mb-3 md:mb-6 [@media(orientation:landscape)_and_(max-height:500px)]:!mb-2 max-w-3xl drop-shadow-lg px-2 break-words text-center">
                      {slide.title}
                    </h1>
                  )}
                  {!slide.hideCta && (
                    <Link
                      to={slide.link}
                      className="bg-primary text-on-primary px-6 py-3 sm:px-8 sm:py-4 [@media(orientation:landscape)_and_(max-height:500px)]:!px-5 [@media(orientation:landscape)_and_(max-height:500px)]:!py-2 rounded-xl font-label-caps text-[11px] sm:text-label-caps uppercase tracking-widest hover:bg-surface-tint transition-colors shadow-lg"
                    >
                      {slide.cta}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'bg-primary w-5 sm:w-6' : 'bg-white/50 hover:bg-white w-2 sm:w-3'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handlePrevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-12 md:h-12 bg-surface/50 backdrop-blur-sm rounded-full hidden sm:flex items-center justify-center text-on-surface hover:bg-surface transition-colors z-20"
            aria-label="Previous Slide"
          >
            <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
          </button>
          <button
            onClick={handleNextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-12 md:h-12 bg-surface/50 backdrop-blur-sm rounded-full hidden sm:flex items-center justify-center text-on-surface hover:bg-surface transition-colors z-20"
            aria-label="Next Slide"
          >
            <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
          </button>
        </section>

        {/* Category Badges */}
        {showCategoryBubbles && (
        <section className="py-8 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto overflow-hidden w-full max-w-full">
          <div className="flex overflow-x-auto hide-scrollbar gap-4 sm:gap-8 justify-start md:justify-center px-1 carousel-container pb-3 min-w-0 max-w-full">
            <Link
              to="/shots"
              className="flex flex-col items-center gap-2.5 sm:gap-4 min-w-[90px] sm:min-w-[120px] carousel-item"
            >
              <div className="w-[90px] h-[90px] sm:w-[120px] sm:h-[120px] rounded-full border-[3px] border-primary p-1 cursor-pointer hover:scale-105 transition-transform duration-300 bg-inverse-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[30px] sm:text-[40px]">smart_display</span>
              </div>
              <span className="font-title-sm text-xs sm:text-title-sm text-on-surface text-center">Shots</span>
            </Link>
            {categoryBubbles.map((category) => (
              <Link
                key={category.id || category.name}
                to={category.link || '/products'}
                className="flex flex-col items-center gap-2.5 sm:gap-4 min-w-[90px] sm:min-w-[120px] carousel-item"
              >
                <div className="w-[90px] h-[90px] sm:w-[120px] sm:h-[120px] rounded-full border-[3px] border-primary p-1 cursor-pointer hover:scale-105 transition-transform duration-300">
                  <div
                    className="w-full h-full rounded-full bg-cover bg-center"
                    data-alt={category.alt}
                    style={{ backgroundImage: `url('${category.image}')` }}
                  ></div>
                </div>
                <span className="font-title-sm text-xs sm:text-title-sm text-on-surface text-center">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
        )}

        {/* Trending Now */}
        <TrendingProducts productsPerRow={homeProductsPerRow} />

        {/* Admin-curated Collections */}
        <HomeCollections />

        {/* Featured Products Row 1 */}
        <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10 w-full max-w-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 md:mb-12 gap-2">
            <h2 className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md playfair text-on-surface">
              Featured Elegance
            </h2>
            <Link
              to="/products"
              className="font-label-caps text-[11px] md:text-label-caps text-primary hover:underline uppercase tracking-wider flex items-center gap-1 shrink-0"
            >
              View All
              <span className="material-symbols-outlined text-[16px] md:text-[18px]">arrow_forward</span>
            </Link>
          </div>
          {productsRow1.length === 0 ? (
            <EmptySegment message="No featured products yet — check back soon." />
          ) : (
          <div className="relative group/arrows w-full max-w-full min-w-0">
            {/* Left scroll navigation */}
            <button
              type="button"
              onClick={() => featuredScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Left"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
            </button>

            {/* Scrolling horizontal list */}
            <div
              ref={featuredScrollRef}
              className="flex gap-4 md:gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth w-full max-w-full min-w-0"
            >
              {productsRow1.map((product) => {
                const isFavorited = !!favorites[product.id];
                const isAvailable = !product.outOfStock && (product.sizes?.some((s) => s.stock > 0) ?? product.inStock);
                return (
                  <div key={product.id} className="min-w-[220px] sm:min-w-[260px] md:min-w-[270px] w-[220px] sm:w-[260px] md:w-[270px] shrink-0 snap-start">
                    <Link
                      to={`/products/${product.id}`}
                      className={`group flex flex-col h-full bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300 ${!isAvailable ? 'opacity-85' : ''}`}
                    >
                      <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                        <ProductCardImage
                          images={product.images && product.images.length > 0 ? product.images : [product.image]}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                          alt={product.alt}
                        />
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                            <span className="bg-error text-on-error font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-wider font-bold shadow-md text-xs">
                              Out of Stock
                            </span>
                          </div>
                        )}
                        {product.badge && (
                          <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-tertiary text-on-tertiary px-2.5 py-1 rounded-full font-label-caps text-[10px] md:text-label-caps uppercase">{product.badge}</div>
                        )}
                        <button
                          type="button"
                          aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                          onClick={(event) => {
                            event.preventDefault();
                            toggleFavorite(product.id);
                          }}
                          className={`absolute top-3 right-3 md:top-4 md:right-4 w-9 h-9 md:w-10 md:h-10 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center transition-colors ${isFavorited ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                        >
                          <span className="material-symbols-outlined text-[18px] md:text-[20px]" data-weight={isFavorited ? 'fill' : undefined}>
                            {isFavorited ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>
                      </div>
                      <div className="p-3.5 md:p-4 flex flex-col gap-1.5 md:gap-2 mt-auto">
                        <span className="font-label-caps text-[10px] text-primary/80 uppercase tracking-wider font-semibold block truncate">
                          {product.category || product.categoryTitle}
                        </span>
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-title-sm text-sm md:text-title-sm text-on-surface truncate">{product.name || product.title}</h3>
                          {product.rating && (
                            <div className="flex items-center text-secondary gap-0.5 shrink-0">
                              <span className="material-symbols-outlined text-[15px] fill-icon">star</span>
                              <span className="font-body-sm text-xs md:text-body-sm">{product.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="font-price-display text-base md:text-price-display text-primary">{formatCurrency(product.price)}</p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Right scroll navigation */}
            <button
              type="button"
              onClick={() => featuredScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Right"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
            </button>
          </div>
          )}
        </section>

        {/* Featured Products Row 2 */}
        <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10 w-full max-w-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 md:mb-12 gap-2">
            <h2 className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md playfair text-on-surface">
              Heritage Masterpieces
            </h2>
            <Link
              to="/products"
              className="font-label-caps text-[11px] md:text-label-caps text-primary hover:underline uppercase tracking-wider flex items-center gap-1 shrink-0"
            >
              View All
              <span className="material-symbols-outlined text-[16px] md:text-[18px]">arrow_forward</span>
            </Link>
          </div>
          {productsRow2.length === 0 ? (
            <EmptySegment message="No heritage pieces here yet — check back soon." />
          ) : (
          <div className="relative group/arrows w-full max-w-full min-w-0">
            {/* Left scroll navigation */}
            <button
              type="button"
              onClick={() => heritageScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Left"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
            </button>

            {/* Scrolling horizontal list */}
            <div
              ref={heritageScrollRef}
              className="flex gap-4 md:gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth w-full max-w-full min-w-0"
            >
              {productsRow2.map((product) => {
                const isFavorited = !!favorites[product.id];
                const isAvailable = !product.outOfStock && (product.sizes?.some((s) => s.stock > 0) ?? product.inStock);
                return (
                  <div key={product.id} className="min-w-[220px] sm:min-w-[260px] md:min-w-[270px] w-[220px] sm:w-[260px] md:w-[270px] shrink-0 snap-start">
                    <Link
                      to={`/products/${product.id}`}
                      className={`group flex flex-col h-full bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300 ${!isAvailable ? 'opacity-85' : ''}`}
                    >
                      <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                        <ProductCardImage
                          images={product.images && product.images.length > 0 ? product.images : [product.image]}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                          alt={product.alt}
                        />
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                            <span className="bg-error text-on-error font-label-caps text-label-caps px-4 py-2 rounded-full uppercase tracking-wider font-bold shadow-md text-xs">
                              Out of Stock
                            </span>
                          </div>
                        )}
                        {product.badge && (
                          <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-tertiary text-on-tertiary px-2.5 py-1 rounded-full font-label-caps text-[10px] md:text-label-caps uppercase">{product.badge}</div>
                        )}
                        <button
                          type="button"
                          aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                          onClick={(event) => {
                            event.preventDefault();
                            toggleFavorite(product.id);
                          }}
                          className={`absolute top-3 right-3 md:top-4 md:right-4 w-9 h-9 md:w-10 md:h-10 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center transition-colors ${isFavorited ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                        >
                          <span className="material-symbols-outlined text-[18px] md:text-[20px]" data-weight={isFavorited ? 'fill' : undefined}>
                            {isFavorited ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>
                      </div>
                      <div className="p-3.5 md:p-4 flex flex-col gap-1.5 md:gap-2 mt-auto">
                        <span className="font-label-caps text-[10px] text-primary/80 uppercase tracking-wider font-semibold block truncate">
                          {product.category || product.categoryTitle}
                        </span>
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-title-sm text-sm md:text-title-sm text-on-surface truncate">{product.name || product.title}</h3>
                          {product.rating && (
                            <div className="flex items-center text-secondary gap-0.5 shrink-0">
                              <span className="material-symbols-outlined text-[15px] fill-icon">star</span>
                              <span className="font-body-sm text-xs md:text-body-sm">{product.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="font-price-display text-base md:text-price-display text-primary">{formatCurrency(product.price)}</p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Right scroll navigation */}
            <button
              type="button"
              onClick={() => heritageScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg hidden sm:flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Right"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
            </button>
          </div>
          )}
        </section>

        {/* Video Grid Lookbook Section */}
        <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full max-w-full overflow-hidden">
          <h2 className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md playfair text-center mb-2 md:mb-4">
            Stories in Motion
          </h2>
          <p className="font-body-sm text-body-sm md:font-body-lg md:text-body-lg text-on-surface-variant text-center max-w-xl mx-auto mb-8 md:mb-12 px-2">
            Hover over our lookbooks to witness traditional craftsmanship come to life.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-gutter w-full max-w-full">
            {(theme.lookbookVideos || []).map((video, idx) => (
              <VideoCard
                key={video.id || idx}
                src={video.src}
                poster={video.poster || productsRow1[idx % productsRow1.length]?.image}
                title={video.title}
                description={video.description}
              />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
