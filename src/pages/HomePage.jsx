import { useState } from 'react';
import { Link } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import { PRODUCTS } from '../data/products.js';
import { formatCurrency } from '../context/CartContext.jsx';
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

const products = PRODUCTS.slice(0, 4);

export default function HomePage() {
  const [favorites, setFavorites] = useState({});
  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
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
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase" to="/products?category=Saree">Sarees</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase" to="/products?category=Lehenga">Lehengas</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 font-label-caps text-label-caps uppercase" to="/products?category=Kurti">Kurtis</Link>
          </nav>
          <div className="flex items-center space-x-6 text-primary dark:text-primary-fixed-dim">
            <button className="hover:opacity-80 transition-opacity duration-200 hidden md:block">
              <span className="material-symbols-outlined">search</span>
            </button>
            <button className="hover:opacity-80 transition-opacity duration-200">
              <span className="material-symbols-outlined">person</span>
            </button>
            <CartIconButton className="hover:opacity-80 transition-opacity duration-200" />
          </div>
        </div>
      </header>
      <main>
        {/* Hero Carousel */}
        <section className="relative w-full h-[70vh] min-h-[500px] bg-surface-container overflow-hidden">
          <div className="w-full h-full flex">
            <div className="w-full flex-shrink-0 relative">
              <div
                className="bg-cover bg-center bg-no-repeat w-full h-full"
                data-alt="A stunning, high-fashion editorial photograph of a South Asian woman wearing an intricately embroidered, vibrant Hot Pink and gold Saree. She is posed elegantly against a minimalist, warm off-white studio background. The lighting is soft but dramatic, highlighting the rich textures of the traditional Indian fabric and the subtle Dusty Rose and Sage Green accents in her jewelry. The overall aesthetic is premium, modern corporate luxury mixed with vibrant elegance, utilizing generous whitespace."
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAi6nWtvfZJXTG4DXcMDNhCLHVdrK6vyhvOVsebD_THMBWJzQBfmneLZtM8xa-cso39eALmfuN97ofl_1zApobtY6XemRxNe0cn-ShqNrIELjxrqksxYN5AdUJfpVNEGY6ZAP3CuK2b3-yuMMDnyWaarDjLJ3fFdIexM86YhJhVkM0Zjl_jecY40qOjOJreeJbF4iGNPe6cLlalbtGW9bCoEAlb2oaqPbd4muawrbsZyh7Lo9aqaS6muQ')" }}
              ></div>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <h1 className="font-display-lg text-display-lg text-on-tertiary playfair mb-6 max-w-3xl drop-shadow-lg">The Festive Collection</h1>
                <Link
                  to="/products"
                  className="bg-primary text-on-primary px-8 py-4 rounded-xl font-label-caps text-label-caps uppercase tracking-widest hover:bg-surface-tint transition-colors shadow-lg"
                >
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-surface/50 backdrop-blur-sm rounded-full flex items-center justify-center text-on-surface hover:bg-surface transition-colors">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-surface/50 backdrop-blur-sm rounded-full flex items-center justify-center text-on-surface hover:bg-surface transition-colors">
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

        {/* Featured Products */}
        <section className="py-16 px-margin-desktop max-w-container-max mx-auto">
          <h2 className="font-headline-md text-headline-md playfair text-center mb-12">Featured Elegance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {products.map((product) => {
              const isFavorited = !!favorites[product.id];
              return (
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
                  <div className="flex justify-between items-start">
                    <h3 className="font-title-sm text-title-sm text-on-surface truncate pr-2">{product.name}</h3>
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
