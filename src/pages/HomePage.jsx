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
      <div className="bg-primary text-on-primary py-2 text-center text-label-caps font-label-caps uppercase sticky top-0 z-[60]">
        Enjoy Free Shipping on Orders Above ₹2,500
      </div>
      <header className="bg-surface dark:bg-surface-container-highest docked full-width sticky top-[32px] z-50 flat no shadows border-b border-surface-variant">
        <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto h-[80px]">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link
            to="/"
            className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim playfair tracking-tight"
          >
            A2Z Collection
          </Link>
          <nav className="hidden md:flex space-x-8">
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
          <div className="flex items-center space-x-6 text-primary dark:text-primary-fixed-dim">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="hover:opacity-80 transition-opacity duration-200 hidden md:block"
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
      <main>
        {/* Hero Carousel */}
        <section className="relative w-full h-[70vh] min-h-[500px] bg-surface-container overflow-hidden">
          <div
            className="w-full h-full flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {heroSlides.map((slide, index) => (
              <div key={slide.id || index} className="w-full h-full flex-shrink-0 relative">
                <div
                  className="bg-cover bg-center bg-no-repeat w-full h-full"
                  data-alt={slide.alt}
                  style={{ backgroundImage: `url('${slide.image}')` }}
                ></div>
                <div className="absolute inset-0 bg-black/25"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  {!slide.hideTitle && (
                    <h1 className="font-display-lg text-display-lg text-on-tertiary playfair mb-6 max-w-3xl drop-shadow-lg">
                      {slide.title}
                    </h1>
                  )}
                  {!slide.hideCta && (
                    <Link
                      to={slide.link}
                      className="bg-primary text-on-primary px-8 py-4 rounded-xl font-label-caps text-label-caps uppercase tracking-widest hover:bg-surface-tint transition-colors shadow-lg"
                    >
                      {slide.cta}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'bg-primary w-6' : 'bg-white/50 hover:bg-white'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handlePrevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-surface/50 backdrop-blur-sm rounded-full flex items-center justify-center text-on-surface hover:bg-surface transition-colors z-20"
            aria-label="Previous Slide"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={handleNextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-surface/50 backdrop-blur-sm rounded-full flex items-center justify-center text-on-surface hover:bg-surface transition-colors z-20"
            aria-label="Next Slide"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </section>

        {/* Category Badges */}
        {showCategoryBubbles && (
        <section className="py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto overflow-hidden">
          <div className="flex overflow-x-auto hide-scrollbar gap-8 justify-start md:justify-center px-4 carousel-container pb-4">
            <Link
              to="/shots"
              className="flex flex-col items-center gap-4 min-w-[120px] carousel-item"
            >
              <div className="w-[120px] h-[120px] rounded-full border-[3px] border-primary p-1 cursor-pointer hover:scale-105 transition-transform duration-300 bg-inverse-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[40px]">smart_display</span>
              </div>
              <span className="font-title-sm text-title-sm text-on-surface text-center">Shots</span>
            </Link>
            {categoryBubbles.map((category) => (
              <Link
                key={category.id || category.name}
                to={category.link || '/products'}
                className="flex flex-col items-center gap-4 min-w-[120px] carousel-item"
              >
                <div className="w-[120px] h-[120px] rounded-full border-[3px] border-primary p-1 cursor-pointer hover:scale-105 transition-transform duration-300">
                  <div
                    className="w-full h-full rounded-full bg-cover bg-center"
                    data-alt={category.alt}
                    style={{ backgroundImage: `url('${category.image}')` }}
                  ></div>
                </div>
                <span className="font-title-sm text-title-sm text-on-surface text-center">{category.name}</span>
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
        <section className="py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10">
          <div className="relative mb-12">
            <h2 className="font-headline-md text-headline-md playfair text-center">Featured Elegance</h2>
            <Link
              to="/products"
              className="absolute right-0 top-1/2 -translate-y-1/2 font-label-caps text-label-caps text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              View All
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          {productsRow1.length === 0 ? (
            <EmptySegment message="No featured products yet — check back soon." />
          ) : (
          <div className="relative group/arrows">
            {/* Left scroll navigation */}
            <button
              type="button"
              onClick={() => featuredScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Left"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            {/* Scrolling horizontal list */}
            <div
              ref={featuredScrollRef}
              className="flex gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth"
            >
              {productsRow1.map((product) => {
                const isFavorited = !!favorites[product.id];
                const isAvailable = product.sizes?.some((s) => s.stock > 0) ?? product.inStock;
                return (
                  <div key={product.id} className="min-w-[250px] sm:min-w-[270px] w-[270px] shrink-0 snap-start">
                    <Link
                      to={`/product/${product.id}`}
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
                          <div className="absolute top-4 left-4 bg-tertiary text-on-tertiary px-3 py-1 rounded-full font-label-caps text-label-caps uppercase">{product.badge}</div>
                        )}
                        <button
                          type="button"
                          aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                          onClick={(event) => {
                            event.preventDefault();
                            toggleFavorite(product.id);
                          }}
                          className={`absolute top-4 right-4 w-10 h-10 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center transition-colors ${isFavorited ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                        >
                          <span className="material-symbols-outlined" data-weight={isFavorited ? 'fill' : undefined}>
                            {isFavorited ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>
                      </div>
                      <div className="p-4 flex flex-col gap-2 mt-auto">
                        <span className="font-label-caps text-[10px] text-primary/80 uppercase tracking-wider font-semibold block">
                          {product.category || product.categoryTitle}
                        </span>
                        <div className="flex justify-between items-start">
                          <h3 className="font-title-sm text-title-sm text-on-surface truncate pr-2">{product.name || product.title}</h3>
                          {product.rating && (
                            <div className="flex items-center text-secondary gap-1 shrink-0">
                              <span className="material-symbols-outlined text-[16px] fill-icon">star</span>
                              <span className="font-body-sm text-body-sm">{product.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="font-price-display text-price-display text-primary">{formatCurrency(product.price)}</p>
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
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Right"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          )}
        </section>

        {/* Featured Products Row 2 */}
        <section className="py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10">
          <div className="relative mb-12">
            <h2 className="font-headline-md text-headline-md playfair text-center">Heritage Masterpieces</h2>
            <Link
              to="/products"
              className="absolute right-0 top-1/2 -translate-y-1/2 font-label-caps text-label-caps text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              View All
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          {productsRow2.length === 0 ? (
            <EmptySegment message="No heritage pieces here yet — check back soon." />
          ) : (
          <div className="relative group/arrows">
            {/* Left scroll navigation */}
            <button
              type="button"
              onClick={() => heritageScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Left"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            {/* Scrolling horizontal list */}
            <div
              ref={heritageScrollRef}
              className="flex gap-gutter overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory scroll-smooth"
            >
              {productsRow2.map((product) => {
                const isFavorited = !!favorites[product.id];
                const isAvailable = product.sizes?.some((s) => s.stock > 0) ?? product.inStock;
                return (
                  <div key={product.id} className="min-w-[250px] sm:min-w-[270px] w-[270px] shrink-0 snap-start">
                    <Link
                      to={`/product/${product.id}`}
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
                          <div className="absolute top-4 left-4 bg-tertiary text-on-tertiary px-3 py-1 rounded-full font-label-caps text-label-caps uppercase">{product.badge}</div>
                        )}
                        <button
                          type="button"
                          aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                          onClick={(event) => {
                            event.preventDefault();
                            toggleFavorite(product.id);
                          }}
                          className={`absolute top-4 right-4 w-10 h-10 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center transition-colors ${isFavorited ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                        >
                          <span className="material-symbols-outlined" data-weight={isFavorited ? 'fill' : undefined}>
                            {isFavorited ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>
                      </div>
                      <div className="p-4 flex flex-col gap-2 mt-auto">
                        <span className="font-label-caps text-[10px] text-primary/80 uppercase tracking-wider font-semibold block">
                          {product.category || product.categoryTitle}
                        </span>
                        <div className="flex justify-between items-start">
                          <h3 className="font-title-sm text-title-sm text-on-surface truncate pr-2">{product.name || product.title}</h3>
                          {product.rating && (
                            <div className="flex items-center text-secondary gap-1 shrink-0">
                              <span className="material-symbols-outlined text-[16px] fill-icon">star</span>
                              <span className="font-body-sm text-body-sm">{product.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="font-price-display text-price-display text-primary">{formatCurrency(product.price)}</p>
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
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface border border-outline-variant/30 text-on-surface hover:text-primary shadow-lg flex items-center justify-center z-20 opacity-0 group-hover/arrows:opacity-100 transition-opacity duration-300 cursor-pointer"
              aria-label="Scroll Right"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          )}
        </section>

        {/* Video Grid Lookbook Section */}
        <section className="py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <h2 className="font-headline-md text-headline-md playfair text-center mb-4">Stories in Motion</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant text-center max-w-xl mx-auto mb-12">
            Hover over our lookbooks to witness traditional craftsmanship come to life.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
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
