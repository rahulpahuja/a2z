import { Link } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { PRODUCTS } from '../data/products.js';
import { getHighResUrl } from '../utils/image.js';

const categories = [
  {
    name: "Sarees",
    alt: "Close up of a vibrantly colored, heavily embroidered traditional Indian Saree fabric. The texture is rich and detailed, shot in a minimalist studio setting with soft lighting. The colors are striking, emphasizing 'Vibrant Elegance' against a clean background.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCARzYXzIj1gZdv7GRsnxvuTyixKKXCZ_GEY49nyWHN1Uv9IilC_7Jrgh6iVjWrUqX5AybzfSuMxZUWN0H6Jzp2QKZMv3pZRho6B_aDvSKGIQFvw7bBPQpDSq2V6qcR7DLJJgD0mDnTRHYwYtdG0S2ZldpmZeRk-gF_cAnTqFxzWDeAdun_atiPw3WFeQDlfuuAjfUY2lGQZEBCdYa4Iz5-tOHGNFfqVk0iCLawpByG7_M73zL9nmVjUg",
  },
  {
    name: "Lehengas",
    alt: "High-quality close up of a luxurious, contemporary Lehenga skirt fabric. Detailed intricate beadwork and embroidery are visible. The setting is clean and well-lit, reflecting a premium corporate fashion aesthetic with a traditional twist.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDDzpacbowO2gjVeSFFi69EnBvyZ0dzME6SzKDu6U_BdGiY-x6uOEaNDjQlN-ltucgmMV3bxyxv11deaux-7qKkZoDF-1lUqRuGUPvBmFj9mACx8aZeeGBMAQ-4s-dNwuBP8MPCEoIpv3UyvxC0vVZHFCTBv9VsOkzE-fGED2qDJ1GQMntCK-j8W4jnN34-65IefDTfrqoI0kDqkWvh88mk2_QMt0YPKX-SyfAwoylWPX9j9B2VcSN9A",
  },
  {
    name: "Kurtis",
    alt: "Elegant close up of a beautifully patterned Kurti top material. The fabric shows delicate traditional Indian motifs. Shot with bright, soft studio lighting in a minimalist environment, conveying a sense of sophisticated cultural heritage.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCSewrfsaNP6cnMWzsJNh0wyJHzQghJ6Qc8DVbNPEoVUmGVxpiyQnsamY6K0_FXe5nYWB2iJSYUD0e9dPCl3AKcSrF5pHPVFvPTAsAfbZy3m5HEzVbiF1FUyIBVgCHIgpNwSVq87fkZNHkY9R4cxh7ueH2nYTM2IE9n5Yy08u8fNQyVdn2UEHx3cgBb0g_iF4g27W4s3LIeOuPqv111KsNj5xjZPZyhBftD9krUxtT3tIaL3n4-Je3ptA",
  },
  {
    name: "Accessories",
    alt: "A macro shot of handcrafted traditional Indian jewelry accessories, perhaps a heavy necklace or bangles, resting on a clean, light surface. The lighting is bright and modern, highlighting the detailed craftsmanship and luxurious feel of the pieces.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1J1T-nbkFdaCTq4SeRSOdS0l19851jb-doVFWIWcOxI5HZW0F8OMaeNzk4dAbdpucgYD3FCHxcsZKxmqGE1wDsheXIryfXX0jOPWgQT1B7EggUox6DVsvLrBQif--azWT4QUT4PrA6M7FMRfIjXVi4GXgBLePxoKNRxggGSgu0RtWJic2ME9jKXX3Xziy4vOpGEDdYyruZJrauDjiTKH-dRPtKnuEpVaJP5rE9lx4gcdUXelU4_QYJg",
  },
];

const BADGE_STYLES = {
  'Best Seller': { bg: 'bg-tertiary', text: 'text-on-tertiary' },
  Handcrafted: { bg: 'bg-secondary', text: 'text-on-secondary' },
  'New Arrival': { bg: 'bg-primary', text: 'text-on-primary' },
  '15% OFF': { bg: 'bg-error', text: 'text-on-error' },
};

const products = PRODUCTS.slice(4, 8).map((product) => ({
  id: product.id,
  alt: product.alt,
  src: product.image,
  badge: product.badge ? { label: product.badge, ...BADGE_STYLES[product.badge] } : null,
  name: product.name,
  desc: product.description,
  price: formatCurrency(product.price),
  priceValue: product.price,
}));

const videos = [
  {
    id: 1,
    alt: "A vertical video still showing a model gracefully walking in a flowing dusty rose Anarkali suit. The lighting is cinematic yet bright, capturing the movement of the fabric in a minimalist modern setting. The mood is elegant and dynamic.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBSyhONOo3DClR_Qp6KaQscZEt1YORCr4eufPLTL1TPy1cwTley7Z_F1-8byift97h8-z3DpRQJtcyyV1cFpvMLQ-opvUjSHiANuwbkVWGty3Pfwu8lEEosvGKRJEFGRiLwItJYhRkiz9zX3IMLOT2CrJkEYGL5yY6KMFP8llclh-Oi-f3oM7dRo4jaUfSn4594htIOnoPtGz-vj0Ix6lT-QtwnucFeFJYK7828YHCDJPgb4x60x6HOuA",
    duration: "0:15",
    title: "Dusty Rose Anarkali",
    price: "₹ 18,500",
  },
  {
    id: 2,
    alt: "A vertical video still of a close-up shot on a beautifully draped navy blue Saree. The model is adjusting the pallu, highlighting the fluid motion and rich texture of the fabric against a clean, light studio background.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAX0fqINQYzSUvYk7QQ0hAS44IoCw-arBWYR14e6J-4Bc77rdxK_m-V2d0aDTTyNKWr0Sa4S_LMiB8pRP9rYqBzMDri2Iiegw2SOtzBCObdYpATgHArb2RYXZ0RaJODmehswWl6zvp_SOfGdLbS8ZEAsNPeb6pHB-nIsjwjSCxLhW6671yO6ny5EGEANnkRmZY-DJy-l187oBIfs-lKPdA0E2Rc1p4OlNETMRey9PaQ295ZakJLNTbVXA",
    duration: "0:22",
    title: "Midnight Blue Drape",
    price: "₹ 21,000",
  },
  {
    id: 3,
    alt: "A vertical video still capturing a model posing in a vibrant, heavy bridal Lehenga. She is turning slightly, showcasing the flare and intricate hand-embroidery. The lighting is pristine and bright, reflecting high-end luxury fashion photography.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6VEKIa56PabNEDdDoZEj5-H_VRuH1ZINfG4lGzQga2brxQ4ex1UdNfavozW92x-ZyuAxToISIMSs2yPnqsI3svbAyUPG3-BJS0Gz2w4pSAnLFSkwpaIz6md55CCWqgdHbRTUe_xHDsGsKLUr_yUN4RX1sPNblbZLTYC8wEA-4DW6DEH_vyDahe53KGn8KrHyn0TY1cdvP9pykjTYRyTyJt8tnaJUuMVy99nKYwzZbd6HB4GVr7LLg1Q",
    duration: "0:30",
    title: "Bridal Collection Preview",
    price: "From ₹ 40,000",
  },
  {
    id: 4,
    alt: "A vertical video still focusing on the intricate details of a Sage Green Kurti. The model is standing still, allowing the camera to pan slowly over the fine thread work. The setting is bright, minimalist, and serene, emphasizing 'Vibrant Elegance'.",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCNKTg5QvC1L5FrLXT0egMnwpkCns_BaZEGiOikIl2jdiDdDUm5LrEKDqUv5sqS3hP5Q3ykDtScb8kNjMsE8nBBZwL5yAYmDbFbFiDOP7pt5T70HM0hqiNJv_L_8A-m0gBdafwz322qaBOBQSmC0N1YWcQKwmulRk2TzqYXB0tRKtvzpti7NCipCPh6PlWmk9DjzyXmAqK4kqOHsP6OfK2LXBP2VipAVOWVkA8XxIbpK-m_kreFEWPq8A",
    duration: "0:18",
    title: "Sage Green Everyday Elegance",
    price: "₹ 9,500",
  },
];

categories.forEach((c) => {
  c.src = getHighResUrl(c.src);
});
videos.forEach((v) => {
  v.src = getHighResUrl(v.src);
});

function CategoryBadge({ name, alt, src }) {
  return (
    <a className="flex flex-col items-center gap-3 group snap-center min-w-[80px]" href="#">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-outline-variant overflow-hidden group-hover:ring-2 ring-primary-container transition-all">
        <img className="w-full h-full object-cover" alt={alt} src={src} />
      </div>
      <span className="font-label-caps text-label-caps text-on-surface">{name}</span>
    </a>
  );
}

function ProductCard({ product }) {
  const { addItem } = useCart();
  return (
    <article className="group relative flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(172,36,113,0.05)] transition-all duration-300">
      <Link to={`/product/${product.id}`} className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl bg-surface-variant block">
        <img
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          alt={product.alt}
          src={product.src}
        />
        {product.badge && (
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span
              className={`${product.badge.bg} ${product.badge.text} font-label-caps text-label-caps px-3 py-1 rounded-full uppercase text-[10px]`}
            >
              {product.badge.label}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={(event) => event.preventDefault()}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-surface/80 text-on-surface hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">favorite</span>
        </button>
      </Link>
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-title-sm text-title-sm text-on-background mb-1 truncate">{product.name}</h3>
        </Link>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 flex-grow">{product.desc}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-price-display text-price-display text-on-background">{product.price}</span>
          <button
            type="button"
            aria-label="Add to Cart"
            onClick={() =>
              addItem({
                id: product.id,
                title: product.name,
                price: product.priceValue,
                image: product.src,
                alt: product.alt,
                color: null,
                size: null,
              })
            }
            className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function VideoCard({ video }) {
  return (
    <div className="relative min-w-[240px] md:min-w-[280px] aspect-[9/16] rounded-xl overflow-hidden snap-center group cursor-pointer bg-surface-variant flex-shrink-0">
      <img className="w-full h-full object-cover" alt={video.alt} src={video.src} />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 bg-surface/90 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined" data-weight="fill">play_arrow</span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
        <span className="font-label-caps text-label-caps text-[10px] bg-black/50 px-2 py-1 rounded backdrop-blur-sm mb-2 inline-block">
          {video.duration}
        </span>
        <h4 className="font-title-sm text-title-sm text-white truncate">{video.title}</h4>
        <p className="font-body-sm text-body-sm text-white/80">{video.price}</p>
      </div>
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <>
      {/* TopNavBar */}
      <nav className="bg-surface dark:bg-surface-container-highest docked full-width top-0 sticky z-50 transition-colors duration-300">
        <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
          {/* Mobile Menu Icon (Left) */}
          <button className="md:hidden text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200">
            <span className="material-symbols-outlined">menu</span>
          </button>
          {/* Brand Logo */}
          <Link to="/" className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
            A2Z Collection
          </Link>
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" to="/products">New Arrivals</Link>
            <Link className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" to="/products?category=Saree">Sarees</Link>
            <Link className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" to="/products?category=Lehenga">Lehengas</Link>
            <Link className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" to="/products?category=Kurti">Kurtis</Link>
          </div>
          {/* Trailing Icons */}
          <div className="flex items-center gap-4 text-primary dark:text-primary-fixed-dim">
            <CartIconButton className="hover:opacity-80 transition-opacity duration-200" />
            <ProfileButton className="hover:opacity-80 transition-opacity duration-200 hidden md:block" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full">
        {/* Hero Section */}
        <section className="relative w-full h-[60vh] md:h-[80vh] bg-surface-container-highest">
          <img
            className="absolute inset-0 w-full h-full object-cover object-top opacity-90 mix-blend-multiply"
            alt="High-fidelity lifestyle photography of a woman wearing a vibrant, elegantly embroidered red traditional Indian Saree. She is standing in a minimalist, luxury global boutique setting with generous whitespace, bathed in soft, bright studio lighting. The mood is 'Vibrant Elegance', bridging traditional craftsmanship with contemporary fashion, perfect for a premium brand hero image."
            src={getHighResUrl("https://lh3.googleusercontent.com/aida-public/AB6AXuB2MgYYN6KLRtwHEMEo3L4qTcAnGQbIzzqbPyC3EbYhS1lp6cgi5J4jEfC7KVeEXa25a0seXS0qeAV5dUeB5CaVWpcbtRv6BxBOhngNKSkP9svm3mgNqtJ_ct2iQVGQF1udW5Yx8s_x5oKuq4gMd88_KN2QVAU5_qTwlOKIuspLFk8PpF-I_AXoZbH2KBjI542szzasBe43EVwhowFxOhmYsSELsbHBvnU8Ytgy2tqvgeoom-K21glJsg")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-80"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-margin-mobile md:px-margin-desktop">
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-4 md:mb-6 max-w-3xl drop-shadow-sm">Vibrant Elegance</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-xl">Discover our curated collection of heritage textiles presented through a modern, sophisticated lens.</p>
            <button className="bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase rounded-xl px-8 py-4 hover:bg-primary hover:text-on-primary transition-colors duration-300">Shop Collection</button>
          </div>
        </section>

        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 space-y-24">
          {/* Circular Category Badges & Filter */}
          <section className="flex flex-col items-center space-y-12">
            {/* Category Badges */}
            <div className="flex overflow-x-auto w-full pb-4 hide-scrollbar justify-start md:justify-center gap-6 md:gap-12 snap-x">
              {categories.map((category) => (
                <CategoryBadge key={category.name} {...category} />
              ))}
            </div>
            {/* Filter/Sort Bar */}
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 py-4 border-y border-surface-variant">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  Filters
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm hidden md:flex">
                  Size
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant hidden md:block">Showing 24 of 142 items</p>
              <div className="flex items-center gap-2">
                <span className="font-body-sm text-body-sm text-on-surface-variant hidden md:block">Sort by:</span>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm">
                  Recommended
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>
              </div>
            </div>
          </section>

          {/* 4-Column Product Grid */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <h2 className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md text-on-background">Featured Collection</h2>
              <a className="font-label-caps text-label-caps text-primary hover:underline uppercase" href="#">View All</a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* 'Watch and Buy' Section */}
          <section className="bg-surface-container-low -mx-margin-mobile md:-mx-margin-desktop px-margin-mobile md:px-margin-desktop py-16">
            <div className="max-w-container-max mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md text-on-background mb-2">Watch &amp; Buy</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">See the garments in motion before you shop.</p>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <button className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface transition-colors">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
              {/* Horizontal Carousel */}
              <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar snap-x">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low dark:bg-surface-container-lowest full-width bottom mt-auto border-t border-surface-variant">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-mobile md:px-margin-desktop py-12 max-w-container-max mx-auto">
          {/* Brand & Copyright */}
          <div className="flex flex-col gap-4 col-span-1 md:col-span-2">
            <div className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
              A2Z Collection
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mt-4">
              Bridging traditional Indian craftsmanship with high-end contemporary fashion. Experience vibrant elegance.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-auto pt-8">
              © 2026 A2Z Collection. All rights reserved.
            </p>
          </div>
          {/* Links Column 1 */}
          <div className="flex flex-col gap-4">
            <h4 className="font-label-caps text-label-caps text-on-surface mb-2">Customer Care</h4>
            <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">About Us</a>
            <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">Shipping Policy</a>
            <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">Returns</a>
          </div>
          {/* Links Column 2 */}
          <div className="flex flex-col gap-4">
            <h4 className="font-label-caps text-label-caps text-on-surface mb-2">Legal</h4>
            <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" href="#">Contact Us</a>
            <Link className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all" to="/privacy-policy">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
