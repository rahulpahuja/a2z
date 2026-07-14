import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { PRODUCTS, getProductById } from '../data/products.js';
import { recordView, subscribeToProductStats } from '../services/productStats.js';

const NAV_LINKS = [
  { label: 'New Arrivals', to: '/products' },
  { label: 'Sarees', to: '/products?category=Saree' },
  { label: 'Lehengas', to: '/products?category=Lehenga' },
  { label: 'Kurtis', to: '/products?category=Kurti' },
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const COLORS = [
  { name: 'Green', hex: '#2e7d32' },
  { name: 'Brown', hex: '#5d4037' },
  { name: 'Pink', hex: '#e91e63' },
  { name: 'Black', hex: '#212121' },
];

const ACCORDION_ITEMS = [
  {
    title: 'Shipping Information',
    body: 'Free standard shipping on all orders over ₹2000. Express delivery options available at checkout. All items are carefully packaged in our signature artisan boxes to ensure safe arrival.',
    tone: 'text-on-surface-variant',
  },
  {
    title: 'Return / Refund',
    body: 'Please note: Due to the delicate handcrafted nature of this item, NO RETURNS are accepted unless the product is defective upon arrival.',
    tone: 'text-error',
  },
  {
    title: 'Exchange Policy',
    body: 'Size exchanges are permitted within 7 days of delivery, subject to inventory availability. The item must be unworn with original tags attached.',
    tone: 'text-on-surface-variant',
  },
];

const FOOTER_LINKS = ['About Us', 'Shipping Policy', 'Returns', 'Contact Us'];

function TopNav() {
  return (
    <nav className="bg-surface dark:bg-surface-container-highest flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto z-50 docked full-width top-0 sticky flat no shadows">
      <div className="flex items-center gap-gutter">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">A2Z Collection</Link>
      </div>
      <div className="hidden md:flex gap-gutter items-center">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 uppercase"
            to={link.to}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-unit text-primary dark:text-primary-fixed-dim">
        <CartIconButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
        <ProfileButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
      </div>
    </nav>
  );
}

function ProductNotFound() {
  return (
    <>
      <TopNav />
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-margin-desktop text-center">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-4">Product not found</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
          This item may have been removed or the link is incorrect.
        </p>
        <Link to="/products" className="inline-block bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-lg uppercase tracking-widest">
          Browse All Products
        </Link>
      </main>
    </>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = getProductById(id);

  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Pink');
  const [quantity, setQuantity] = useState(1);
  const [viewCount, setViewCount] = useState(null);

  useEffect(() => {
    if (!product) return undefined;
    recordView(product.id);
    const unsubscribe = subscribeToProductStats(product.id, (stats) => setViewCount(stats.views));
    return unsubscribe;
  }, [product?.id]);

  if (!product) {
    return <ProductNotFound />;
  }

  const images = product.images && product.images.length > 1 ? product.images : [product.image];
  const mainImage = images[selectedThumbnail] ?? images[0];
  const relatedProducts = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));
  const incrementQuantity = () => setQuantity((q) => q + 1);

  const cartLine = () => ({
    id: `${product.id}-${selectedColor}-${selectedSize}`,
    productId: product.id,
    title: product.name,
    color: selectedColor,
    size: selectedSize,
    price: product.price,
    image: mainImage,
    alt: product.alt,
  });

  const handleAddToCart = () => addItem(cartLine(), quantity);
  const handleBuyNow = () => {
    addItem(cartLine(), quantity);
    navigate('/checkout/shipping');
  };

  return (
    <>
      {/* TopNavBar */}
      <TopNav />

      {/* Main Content Canvas */}
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Left: Image Gallery (60% -> 7 columns) */}
        <section className="md:col-span-7 flex flex-col gap-unit">
          <div className="relative w-full aspect-[3/4] bg-surface-container rounded-xl overflow-hidden group">
            <img
              alt={product.name}
              className="object-cover w-full h-full"
              data-alt={product.alt}
              src={mainImage}
            />
            <button className="absolute top-4 right-4 bg-surface/80 p-2 rounded-full text-on-surface hover:text-primary transition-colors backdrop-blur-sm shadow-[0_10px_30px_rgba(172,36,113,0.05)] opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-unit">
              {images.map((src, index) => (
                <div
                  key={src}
                  className={`aspect-[3/4] rounded-lg overflow-hidden border cursor-pointer transition-opacity ${
                    index === selectedThumbnail
                      ? 'border-outline-variant/30 opacity-100'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => setSelectedThumbnail(index)}
                >
                  <img alt={`${product.name} ${index + 1}`} className="object-cover w-full h-full" src={src} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Product Info (40% -> 5 columns) */}
        <section className="md:col-span-5 flex flex-col gap-6">
          {/* Headers & Price */}
          <div className="flex flex-col gap-2 border-b border-outline-variant/30 pb-6">
            <div className="flex justify-between items-start">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">{product.category}</span>
              {product.badge && (
                <span className="bg-primary-container text-on-primary-container font-label-caps text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">{product.badge}</span>
              )}
            </div>
            <h1 className="font-headline-md text-headline-md md:font-display-lg md:text-display-lg text-on-surface">{product.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="font-price-display text-price-display text-primary">{formatCurrency(product.price)}</span>
              {product.originalPrice && (
                <span className="font-body-lg text-body-lg text-on-surface-variant line-through">{formatCurrency(product.originalPrice)}</span>
              )}
            </div>
            {viewCount !== null && viewCount > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span className="font-body-sm text-body-sm">{viewCount.toLocaleString('en-IN')} people viewed this</span>
              </div>
            )}
            {product.rating && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex text-tertiary-container text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: i < Math.round(product.rating) ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{product.rating}/5</span>
              </div>
            )}
          </div>

          {/* Selectors */}
          <div className="flex flex-col gap-6">
            {/* Size */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-title-sm text-title-sm text-on-surface">Size</span>
                <a className="font-body-sm text-body-sm text-primary hover:underline" href="#">Size Guide</a>
              </div>
              <div className="flex gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 rounded-full border font-label-caps text-label-caps flex items-center justify-center transition-colors uppercase ${
                      selectedSize === size
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant text-on-surface hover:border-primary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="flex flex-col gap-3">
              <span className="font-title-sm text-title-sm text-on-surface">Color: <span className="font-normal text-on-surface-variant ml-1">{selectedColor}</span></span>
              <div className="flex gap-3">
                {COLORS.map((color) => (
                  <button
                    key={color.name}
                    aria-label={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-8 h-8 rounded-full border ring-2 ring-offset-2 transition-all ${
                      selectedColor === color.name
                        ? 'border-primary ring-primary'
                        : 'border-outline-variant ring-transparent hover:ring-outline-variant'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  ></button>
                ))}
              </div>
            </div>

            {/* Stock & Quantity */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 font-body-sm text-body-sm text-secondary">
                <span className="material-symbols-outlined text-[16px]">{product.inStock ? 'check_circle' : 'cancel'}</span>
                <span>{product.inStock ? 'In Stock' : 'Out of Stock'}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden h-12 w-32">
                  <button
                    onClick={decrementQuantity}
                    className="w-10 h-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center font-body-lg text-body-lg">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    className="w-10 h-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={handleBuyNow}
              disabled={!product.inStock}
              className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-lg hover:opacity-90 transition-opacity uppercase tracking-widest shadow-[0_10px_30px_rgba(172,36,113,0.15)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              BUY IT NOW
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="w-full border-2 border-primary text-primary bg-transparent font-label-caps text-label-caps py-4 rounded-lg hover:bg-primary-fixed transition-colors uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              ADD TO CART
            </button>
            <div className="flex items-center justify-center gap-2 text-on-surface-variant font-body-sm text-body-sm mt-2">
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>⏱️ Estimated Delivery: 3 to 7 Business Days</span>
            </div>
          </div>

          {/* Accordions */}
          <div className="flex flex-col border-t border-outline-variant/30 mt-4 divide-y divide-outline-variant/30">
            {ACCORDION_ITEMS.map((item) => (
              <details key={item.title} className="group py-4">
                <summary className="flex justify-between items-center font-title-sm text-title-sm cursor-pointer list-none">
                  {item.title}
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <div className={`mt-4 font-body-sm text-body-sm ${item.tone}`}>{item.body}</div>
              </details>
            ))}
          </div>

          {/* Social & Wishlist */}
          <div className="flex items-center justify-between pt-6 border-t border-outline-variant/30">
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body-sm text-body-sm">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>favorite</span>
              Add to Wishlist
            </button>
            <div className="flex gap-4 text-on-surface-variant">
              <a aria-label="Share on Facebook" className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">share</span></a>
            </div>
          </div>
        </section>
      </main>

      {/* Below Fold Content */}
      <div className="bg-surface-container-low py-16">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
            {/* Description */}
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6">The Artisan's Touch</h2>
              <div className="font-body-lg text-body-lg text-on-surface-variant space-y-4">
                <p>{product.description}</p>
              </div>
            </div>

            {/* Specifications Bento */}
            <div className="bg-surface rounded-xl p-8 shadow-[0_10px_30px_rgba(172,36,113,0.05)] border border-[#DCAE96]/30">
              <h3 className="font-title-sm text-title-sm text-on-surface mb-6 uppercase tracking-widest border-b border-outline-variant/30 pb-2">Specifications</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <span className="block font-label-caps text-label-caps text-outline mb-1 uppercase">Category</span>
                  <span className="font-body-sm text-body-sm text-on-surface">{product.category}</span>
                </div>
                <div>
                  <span className="block font-label-caps text-label-caps text-outline mb-1 uppercase">Care</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Dry Clean Only</span>
                </div>
                <div>
                  <span className="block font-label-caps text-label-caps text-outline mb-1 uppercase">Availability</span>
                  <span className="font-body-sm text-body-sm text-on-surface">{product.inStock ? 'In Stock' : 'Out of Stock'}</span>
                </div>
                <div>
                  <span className="block font-label-caps text-label-caps text-outline mb-1 uppercase">Origin</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Handcrafted in India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          <section className="py-8">
            <h2 className="font-headline-md text-headline-md text-center text-on-surface mb-10">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {relatedProducts.map((related) => (
                <Link key={related.id} to={`/product/${related.id}`} className="group flex flex-col gap-3">
                  <div className="relative aspect-[3/4] rounded-[16px] overflow-hidden bg-surface-container border border-[#DCAE96]/30">
                    <img
                      alt={related.alt}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      src={related.image}
                    />
                    {related.badge && (
                      <span className="absolute top-4 left-4 bg-tertiary text-on-tertiary font-label-caps text-[10px] px-3 py-1 rounded-[32px] uppercase tracking-widest">{related.badge}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-title-sm text-title-sm text-on-surface">{related.name}</h4>
                    <p className="font-price-display text-[16px] text-primary mt-1">{formatCurrency(related.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-surface-container-low dark:bg-surface-container-lowest full-width bottom flat no shadows text-primary dark:text-primary-fixed-dim">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-desktop py-12 max-w-container-max mx-auto">
          <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">A2Z Collection</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant mt-2">© 2026 A2Z Collection. All rights reserved.</p>
          </div>
          <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-8">
            {FOOTER_LINKS.map((link) => (
              <div key={link} className="flex flex-col gap-2">
                <a className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all focus:ring-2 focus:ring-primary-container rounded" href="#">{link}</a>
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <Link className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all focus:ring-2 focus:ring-primary-container rounded" to="/privacy-policy">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
