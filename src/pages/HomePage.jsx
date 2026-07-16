import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import TrendingProducts from '../components/TrendingProducts.jsx';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import { getHighResUrl } from '../utils/image.js';
import './HomePage.css';

const categories = [
  {
    name: 'Bags',
    alt: 'A close-up product shot of a luxury, artisanal embroidered clutch bag featuring traditional Indian motifs in gold and Dusty Rose. Set against a clean, off-white minimalist background with soft studio lighting. High-end fashion aesthetic.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpGsco9fEpO7fBmbPz1f4WPhiBRCzE1yC-LdMULIAPj1oqU3lfvN3uW1OTgOf8XGauNEf60TzYn_zruaXYYiAgwTpgyEpBBz-YxV32Gsy6MVJkCMq_rm4WSfGj2nzOp9dRwph9cXMeePowLBWAap4YT_A6pwbcO3UMOxuKHGmvy4optk8AZwfbDwRkDs9o7nH-ZriqLJ3ThdC6_ih_QFrL67RmXwKJj9BmZ93cRqDs1gOr8QcixZxl3A',
  },
  {
    name: 'Best Sellers',
    alt: 'A close-up detailed shot of a best-selling intricate Kundan jewelry set and a folded silk fabric piece in vibrant Hot Pink. Minimalist off-white background, soft premium lighting, high visual fidelity.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDZJtx7cbsa-MVraxiDeswXCPttghVa_D3gmW5QD6L0KoHo_5mstPG-bRrOnzuIjtQWCuRRgIVRAZ7Lplm6AdviVFeBo7ECADEqzUpw91leHwUvbHW0F5LYWKZaYY1pDI_JPxpiKM_7mSrht17kz4I5GOtsRNBihTMt9KFsvnBUal_U54a1gGtOcxHV4M9Wsvn-u7MgORQhHPoBh434MfS1geJJkUDbJWJEDXWoxyRQYurpemwEASfPcw',
  },
  {
    name: 'Coords',
    alt: 'A stylish, contemporary Indian coordinated set (coord) in Sage Green with subtle artisanal embroidery, displayed neatly folded or on a minimalist hanger against a clean white background. High-end boutique feel.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAapWrtxtpoZLXabbFvrHMqCEyyeVbb5bDIedIyh6taScQaZzribPGI8x5SXkyLNP_iWKAAiGwNki6pETcpqW1eLoy6CmQ8_UtpymntauMUMZgxLX1_uFhEVVgKuukhyMs-_Oo4WSSiFukIHBtv2c6UWizNIVcIfAa8Tj3rYrhMv78JYEN7sVy4DCMq2P0LscHMifD-1z36kJvwxWPUgS_i3AztQzcz76HbzLuIrmY7pz6cDY-3b0vdVg',
  },
  {
    name: 'New Arrivals',
    alt: 'A macro shot of a new arrival traditional textile, showcasing vibrant rich colors and intricate weaving patterns, possibly a close up of a Saree pallu. Soft, bright lighting, luxury gallery aesthetic.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD3VetkJP_eWca_ztCnWaCquOYSWAk1yXdxkzQ0BAGxUk727Cjv38MxiVDrH5fovo6z1AlfgEBNLLeghJ66uv6qTr7gbWPd9M_e9pRSycSYyZ2zhuki1e9sKWOT_S0Vqg6iKkp9FJsxUqLsyB5o2khg8c-4BudANR2IJdi2VAKLjdUp2xXKHjO7_PADSHX0bR_HkKfB8vZWCvekT_ieHLap-wHcI7S4jIOJkfrpAEK0QAWszA_nhAlhAg',
  },
  {
    name: 'Tops',
    alt: 'A beautifully crafted contemporary Indian top or Kurti featuring delicate hand-block prints in Dusty Rose and off-white. Clean, minimalist presentation, high-quality fabric texture visible.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDo72VPkQwTN-Nmw1841eShwujwrb6VLMYl1AgelJas6CTCahaUnpIbtUUyhDIhebhC4yNc2fN2Ty-cI7wQh3QCgKJ-htnxBBQWO3-IeXU0srtoApCiVFxKri75kPFYnBa7BBywf8dWlL9G-OmTfjFUfBLaMPEbuWQBK7Eu_5ZjR1pmDJ81P6JojGEaK0AQqqX5fm_8Ik6x0b0FEDr7MXCFjzhpFlMwyxD7XYu_UtzFb_j0a9LtG1bnoQ',
  },
  {
    name: 'Trousers',
    alt: 'A pair of tailored, elegant trousers with a subtle traditional Indian print trim, presented in a minimalist, modern aesthetic against a bright, clean background. Premium fashion product photography.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAByvkDLFfLo4dnG7PGvRQ0FIcxM8lm3ZuLwOJpAcO4v_lp9eNrz6TLunpW4W7xUeVbltFq4jSWl2jT4yfsMeW_hCaqZrIh1y9e6y31imuerfXQMNnr56c9-wquxsPfgGoVG4ocOyAYoNjvCIQSVHPXdzZUarn3Zvy8FKoHQKyBU9x4YqLVMuUJlMDiDkHXT1Mp7F3tHA3-T29yUWGbdqOkusu17LSvGbGq7Kv-k7Qc80cflf50nA-Kew',
  },
];

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
        <div className="mt-3 flex items-center gap-1.5 text-primary-container font-label-caps text-[11px] uppercase tracking-wider">
          <span className="material-symbols-outlined text-[16px] animate-pulse">
            {isPaused ? 'play_arrow' : 'pause'}
          </span>
          <span>{isPaused ? 'Tap to play' : 'Playing Lookbook'}</span>
        </div>
      </div>
    </div>
  );
}

const HERO_SLIDES = [
  {
    title: 'The Festive Collection',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAi6nWtvfZJXTG4DXcMDNhCLHVdrK6vyhvOVsebD_THMBWJzQBfmneLZtM8xa-cso39eALmfuN97ofl_1zApobtY6XemRxNe0cn-ShqNrIELjxrqksxYN5AdUJfpVNEGY6ZAP3CuK2b3-yuMMDnyWaarDjLJ3fFdIexM86YhJhVkM0Zjl_jecY40qOjOJreeJbF4iGNPe6cLlalbtGW9bCoEAlb2oaqPbd4muawrbsZyh7Lo9aqaS6muQ',
    alt: 'A stunning, high-fashion editorial photograph of a South Asian woman wearing an intricately embroidered, vibrant Hot Pink and gold Saree.',
    cta: 'Shop Now',
    link: '/products',
  },
  {
    title: 'Royal Bridal Heritage',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNqdxRl1N12xTjFuuqWlyyCZgDvVutGsMr_a2j2bIXK0l146oUipKrvoOi5TBuB-oGD_oXFhaMMvWX9ToRlYXqI_Yw50wGMn8B9Y2-NdTGVDySAn6Wkx3EPanZT-At_TWaCri_mqVSqRgy0xZJE-4rSaxqy9oqS2YhRKJ2KBntvIIFonkdK-fXfAEZ6tjvyIyO7wowXYuLs9Y6HrCaXkMNAMUrM90UB503ceap0i_zhLZSlILzrhQCrw',
    alt: 'A heavily embroidered Bridal Lehenga in deep maroon and gold, presented in a high-end editorial style that highlights the intricate craftsmanship.',
    cta: 'Explore Bridal',
    link: '/products?category=Lehenga',
  },
  {
    title: 'Contemporary Luxury Coords',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGeEDQ9fsFvJl2R1sCNwJ9yZ_csqnlzRo6BUr-0UQv_sIOvILMQLjnhDLoRtWkmd5Jh07aZ2yk1IOYUhs5mO0elyMGF2KVzF_knqXKbyTJS4LoDLvCnoaYyQbcVvaQ44eJmurH6w5WK3_UODg-AhFU5z_Jlyp2hy6NeSPwLj7K14xOD1bikOxybrQ-W5rXfvCqNEFtr7nWPxMmVGAtP8eiOxRuR64VuGO7HOu8VOvU8Z3ognrTGtPAxw',
    alt: 'A contemporary Coord set featuring a tunic and wide-leg trousers in a soft Dusty Rose with subtle, traditional block-print patterns.',
    cta: 'Discover Coords',
    link: '/products?category=Coord Set',
  }
];

categories.forEach((c) => {
  c.image = getHighResUrl(c.image);
});
HERO_SLIDES.forEach((s) => {
  s.image = getHighResUrl(s.image);
});

export default function HomePage() {
  const { products } = useProducts();
  const productsRow1 = products.slice(0, 4);
  const productsRow2 = products.slice(4, 8);

  const [favorites, setFavorites] = useState({});
  const [currentSlide, setCurrentSlide] = useState(0);

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  return (
    <>
      <div className="bg-primary text-on-primary py-2 text-center text-label-caps font-label-caps uppercase sticky top-0 z-[60]">
        Enjoy Free Shipping on Orders Above ₹2,500
      </div>
      <header className="bg-surface dark:bg-surface-container-highest docked full-width sticky top-[32px] z-50 flat no shadows border-b border-surface-variant">
        <div className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto h-[80px]">
          <button className="md:hidden text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link
            to="/"
            className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim playfair tracking-tight"
          >
            A2Z Collection
          </Link>
          <nav className="hidden md:flex space-x-8">
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase" to="/products">New Arrivals</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase text-primary font-bold" to="/ai-studio">✨ AI Studio</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase" to="/products?category=Saree">Sarees</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase" to="/products?category=Lehenga">Lehengas</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase" to="/products?category=Kurti">Kurtis</Link>
          </nav>
          <div className="flex items-center space-x-6 text-primary dark:text-primary-fixed-dim">
            <button className="hover:opacity-80 transition-opacity duration-200 hidden md:block">
              <span className="material-symbols-outlined">search</span>
            </button>
            <ProfileButton className="hover:opacity-80 transition-opacity duration-200" />
            <CartIconButton className="hover:opacity-80 transition-opacity duration-200" />
          </div>
        </div>
      </header>
      <main>
        {/* Hero Carousel */}
        <section className="relative w-full h-[70vh] min-h-[500px] bg-surface-container overflow-hidden">
          <div
            className="w-full h-full flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {HERO_SLIDES.map((slide, index) => (
              <div key={index} className="w-full h-full flex-shrink-0 relative">
                <div
                  className="bg-cover bg-center bg-no-repeat w-full h-full"
                  data-alt={slide.alt}
                  style={{ backgroundImage: `url('${slide.image}')` }}
                ></div>
                <div className="absolute inset-0 bg-black/25"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <h1 className="font-display-lg text-display-lg text-on-tertiary playfair mb-6 max-w-3xl drop-shadow-lg">
                    {slide.title}
                  </h1>
                  <Link
                    to={slide.link}
                    className="bg-primary text-on-primary px-8 py-4 rounded-xl font-label-caps text-label-caps uppercase tracking-widest hover:bg-surface-tint transition-colors shadow-lg"
                  >
                    {slide.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {HERO_SLIDES.map((_, index) => (
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
        <section className="py-16 px-margin-desktop max-w-container-max mx-auto overflow-hidden">
          <div className="flex overflow-x-auto hide-scrollbar gap-8 justify-start md:justify-center px-4 carousel-container pb-4">
            {categories.map((category) => (
              <div key={category.name} className="flex flex-col items-center gap-4 min-w-[120px] carousel-item">
                <div className="w-[120px] h-[120px] rounded-full border-[3px] border-primary p-1 cursor-pointer hover:scale-105 transition-transform duration-300">
                  <div
                    className="w-full h-full rounded-full bg-cover bg-center"
                    data-alt={category.alt}
                    style={{ backgroundImage: `url('${category.image}')` }}
                  ></div>
                </div>
                <span className="font-title-sm text-title-sm text-on-surface text-center">{category.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Now */}
        <TrendingProducts />

        {/* Featured Products Row 1 */}
        <section className="py-16 px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10">
          <h2 className="font-headline-md text-headline-md playfair text-center mb-12">Featured Elegance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {productsRow1.map((product) => {
              const isFavorited = !!favorites[product.id];
              const isAvailable = product.sizes?.some((s) => s.stock > 0) ?? product.inStock;
              return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={`group relative bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300 ${!isAvailable ? 'opacity-85' : ''}`}
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                  <img
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                    data-alt={product.alt}
                    src={product.image}
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
                <div className="p-4 flex flex-col gap-2">
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
              );
            })}
          </div>
        </section>

        {/* Featured Products Row 2 */}
        <section className="py-16 px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/10">
          <h2 className="font-headline-md text-headline-md playfair text-center mb-12">Heritage Masterpieces</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {productsRow2.map((product) => {
              const isFavorited = !!favorites[product.id];
              const isAvailable = product.sizes?.some((s) => s.stock > 0) ?? product.inStock;
              return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={`group relative bg-surface-container-low rounded-xl border border-tertiary-container/30 overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300 ${!isAvailable ? 'opacity-85' : ''}`}
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-surface-variant">
                  <img
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-image-radius ${!isAvailable ? 'grayscale opacity-50' : ''}`}
                    data-alt={product.alt}
                    src={product.image}
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
                <div className="p-4 flex flex-col gap-2">
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
              );
            })}
          </div>
        </section>

        {/* Video Grid Lookbook Section */}
        <section className="py-16 px-margin-desktop max-w-container-max mx-auto">
          <h2 className="font-headline-md text-headline-md playfair text-center mb-4">Stories in Motion</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant text-center max-w-xl mx-auto mb-12">
            Hover over our lookbooks to witness traditional craftsmanship come to life.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <VideoCard
              src="https://vjs.zencdn.net/v/oceans.mp4"
              poster={productsRow1[0]?.image}
              title="Vibrant Rani Pink Lookbook"
              description="Witness the detailed gold zari embroidery and elegant drape in our modern heritage collection."
            />
            <VideoCard
              src="https://media.w3.org/2010/05/sintel/trailer_hd.mp4"
              poster={productsRow1[1]?.image}
              title="Artisanal Jewelry Adornments"
              description="A beautiful showcase of traditional handcrafted Kundan necklace sets."
            />
            <VideoCard
              src="https://www.w3schools.com/html/mov_bbb.mp4"
              poster={productsRow1[2]?.image}
              title="Pure Silk Weaving & Drape"
              description="Highlighting the soft, flowing textures and rich weaving of heritage block prints."
            />
            <VideoCard
              src="https://www.w3schools.com/html/movie.mp4"
              poster={productsRow1[3]?.image}
              title="Bridal Craft Editorial"
              description="Capturing the modern elegant look designed for the contemporary South Asian wedding."
            />
          </div>
        </section>
      </main>
      <footer className="bg-surface-container-low dark:bg-surface-container-lowest full-width bottom flat no shadows mt-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-desktop py-12 max-w-container-max mx-auto">
          <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
            <div className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim playfair">A2Z Collection</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant max-w-xs">Bridging traditional Indian craftsmanship with high-end contemporary fashion. Experience vibrant elegance.</p>
          </div>
          <div className="col-span-1 flex flex-col gap-4">
            <h4 className="font-title-sm text-title-sm text-on-surface">Explore</h4>
            <div className="flex flex-col gap-2">
              <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">About Us</a>
              <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">Shipping Policy</a>
              <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">Returns</a>
              <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">Contact Us</a>
              <Link className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" to="/privacy-policy">Privacy Policy</Link>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <h4 className="font-title-sm text-title-sm text-on-surface">Join Our Newsletter</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant">Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.</p>
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 bg-surface border-b border-tertiary-container focus:border-primary focus:ring-0 focus:outline-none py-2 px-0 font-body-sm text-body-sm bg-transparent transition-colors"
                placeholder="Enter your email"
                type="email"
              />
              <button className="bg-primary text-on-primary px-6 py-2 rounded-xl font-label-caps text-label-caps uppercase hover:bg-surface-tint transition-colors">Subscribe</button>
            </div>
          </div>
        </div>
        <div className="border-t border-surface-variant py-6 text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">© 2026 A2Z Collection. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
