import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { useProducts } from '../context/ProductsContext.jsx';
import { recordView, subscribeToProductStats } from '../services/productStats.js';
import ProductImage from '../components/ProductImage.jsx';
import ProductCardImage from '../components/ProductCardImage.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import MobileNavDrawer from '../components/MobileNavDrawer.jsx';

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


function TopNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <>
      <nav className="bg-surface dark:bg-surface-container-highest flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto z-50 docked full-width top-0 sticky flat no shadows">
        <div className="flex items-center gap-gutter">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
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
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={NAV_LINKS} />
    </>
  );
}

function ProductNotFound() {
  return (
    <>
      <TopNav />
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-margin-desktop text-center">
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
  const { products: allProducts } = useProducts();
  const product = allProducts.find((p) => p.id === id) || null;

  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Pink');
  const [quantity, setQuantity] = useState(1);
  const [viewCount, setViewCount] = useState(null);

  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) {
        const firstAvailable = product.sizes.find((s) => s.stock > 0) || product.sizes[0];
        setSelectedSize(firstAvailable.size);
      } else {
        setSelectedSize('M');
      }
      const initialColor = product.colors && product.colors.length > 0 ? product.colors[0] : 'Pink';
      setSelectedColor(initialColor);
      const matchIndex = (product.imageColors ?? []).findIndex(
        (c) => c && c.toLowerCase() === initialColor.toLowerCase()
      );
      setSelectedThumbnail(matchIndex !== -1 ? matchIndex : 0);
    }
  }, [product]);

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
  const videos = product.videos ?? [];
  const media = [
    ...images.map((src) => ({ type: 'image', src })),
    ...videos.map((src) => ({ type: 'video', src })),
  ];
  const mainMedia = media[selectedThumbnail] ?? media[0];
  const relatedProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const availableSizes = product.sizes ?? SIZES.map((size) => ({ size, stock: 100 }));
  const availableColors = product.colors 
    ? product.colors.map((c) => typeof c === 'string' ? { name: c, hex: null } : c)
    : COLORS;

  const selectedSizeStock = product.sizes?.find((s) => s.size === selectedSize)?.stock ?? 999;

  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));
  const incrementQuantity = () => setQuantity((q) => Math.min(selectedSizeStock, q + 1));

  const handleSelectColor = (colorName) => {
    setSelectedColor(colorName);
    const matchIndex = (product.imageColors ?? []).findIndex(
      (c) => c && c.toLowerCase() === colorName.toLowerCase()
    );
    if (matchIndex !== -1) setSelectedThumbnail(matchIndex);
  };

  const cartLine = () => ({
    id: `${product.id}-${selectedColor}-${selectedSize}`,
    productId: product.id,
    title: product.name || product.title,
    color: selectedColor,
    size: selectedSize,
    price: product.price,
    image: images[0],
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
      <main 
        className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-gutter"
        style={{
          backgroundColor: 'var(--custom-store-bg, transparent)',
          backdropFilter: 'var(--custom-backdrop-filter, none)',
          background: 'var(--custom-backdrop-bg, inherit)',
        }}
      >
        {/* Left: Image Gallery (60% -> 7 columns) */}
        <section className="md:col-span-7 flex flex-col gap-unit">
          <div 
            className="relative w-full bg-surface-container overflow-hidden group"
            style={{
              aspectRatio: 'var(--custom-detail-img-aspect, 3/4)',
              borderRadius: 'var(--custom-border-radius, 12px)',
              borderWidth: 'var(--custom-border-width, 0px)',
              borderColor: 'var(--custom-border-color, transparent)',
              borderStyle: 'solid',
            }}
          >
            {mainMedia.type === 'video' ? (
              <VideoPlayer src={mainMedia.src} className="w-full h-full object-contain bg-black" />
            ) : (
              <ProductCardImage
                images={images}
                activeIndex={selectedThumbnail}
                alt={product.name}
                className="object-cover w-full h-full"
              />
            )}
            {mainMedia.type !== 'video' && (
              <button className="absolute top-4 right-4 bg-surface/80 p-2 rounded-full text-on-surface hover:text-primary transition-colors backdrop-blur-sm shadow-[0_10px_30px_rgba(172,36,113,0.05)] opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined">zoom_in</span>
              </button>
            )}
          </div>
          {media.length > 1 && (
            <div className="grid grid-cols-5 gap-unit">
              {media.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedThumbnail(index)}
                  className={`relative overflow-hidden border transition-all ${
                    selectedThumbnail === index ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant/60 hover:border-primary'
                  }`}
                  style={{
                    width: 'var(--custom-gallery-thumb-w, 64px)',
                    height: 'var(--custom-gallery-thumb-h, 80px)',
                    borderRadius: 'var(--custom-border-radius-sm, 6px)',
                  }}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                      <span className="material-symbols-outlined text-on-surface-variant">play_circle</span>
                    </div>
                  ) : (
                    <ProductImage alt={`${product.name || product.title} ${index + 1}`} className="object-cover w-full h-full" src={item.src} />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right: Product Info (40% -> 5 columns) */}
        <section className="md:col-span-5 flex flex-col gap-6">
          {/* Title & Description */}
          <div className="flex flex-col gap-2 border-b border-outline-variant/30 pb-6">
            <div className="flex justify-between items-start">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">{product.category}</span>
              {product.badge && (
                <span className="bg-primary-container text-on-primary-container font-label-caps text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">{product.badge}</span>
              )}
            </div>
            <h1 className="font-headline-md text-headline-md md:font-display-lg md:text-display-lg text-on-surface" style={{ fontSize: 'var(--custom-font-title-size-detail, 28px)' }}>{product.name || product.title}</h1>
            {product.description && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1" style={{ fontSize: 'var(--custom-font-desc-size-detail, 14px)' }}>{product.description}</p>
            )}
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
              <div className="flex gap-2 flex-wrap">
                {availableSizes.map((s) => {
                  const isSelected = selectedSize === s.size;
                  const isOutOfStock = s.stock === 0;
                  return (
                    <button
                      key={s.size}
                      disabled={isOutOfStock}
                      onClick={() => setSelectedSize(s.size)}
                      className={`w-12 h-12 rounded-full border font-label-caps text-label-caps flex items-center justify-center transition-colors uppercase relative ${
                        isOutOfStock
                          ? 'opacity-40 border-outline-variant text-on-surface-variant cursor-not-allowed line-through'
                          : isSelected
                          ? 'border-primary bg-primary text-on-primary font-bold'
                          : 'border-outline-variant text-on-surface hover:border-primary'
                      }`}
                    >
                      {s.size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="font-price-display text-price-display text-primary">{formatCurrency(product.price)}</span>
              {product.originalPrice && (
                <span className="font-body-lg text-body-lg text-on-surface-variant line-through">{formatCurrency(product.originalPrice)}</span>
              )}
            </div>

            {/* Color */}
            <div className="flex flex-col gap-3">
              <span className="font-title-sm text-title-sm text-on-surface">Color: <span className="font-normal text-on-surface-variant ml-1">{selectedColor}</span></span>
              <div className="flex gap-3 flex-wrap">
                {availableColors.map((color) => {
                  const isSelected = selectedColor === color.name;
                  if (color.hex) {
                    return (
                      <button
                        key={color.name}
                        aria-label={color.name}
                        onClick={() => handleSelectColor(color.name)}
                        className={`w-8 h-8 rounded-full border ring-2 ring-offset-2 transition-all ${
                          isSelected
                            ? 'border-primary ring-primary'
                            : 'border-outline-variant ring-transparent hover:ring-outline-variant'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      ></button>
                    );
                  }
                  return (
                    <button
                      key={color.name}
                      onClick={() => handleSelectColor(color.name)}
                      className={`px-4 py-2 rounded-lg border font-body-sm text-body-sm flex items-center justify-center transition-colors uppercase ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-outline-variant text-on-surface hover:border-primary'
                      }`}
                    >
                      {color.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock & Quantity */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 font-body-sm text-body-sm text-secondary">
                <span className="material-symbols-outlined text-[16px]">{selectedSizeStock > 0 ? 'check_circle' : 'cancel'}</span>
                <span>{selectedSizeStock > 0 ? `In Stock (${selectedSizeStock} left)` : 'Out of Stock'}</span>
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
              disabled={selectedSizeStock === 0}
              className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-lg hover:opacity-90 transition-opacity uppercase tracking-widest shadow-[0_10px_30px_rgba(172,36,113,0.15)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              BUY IT NOW
            </button>
            <button
              onClick={handleAddToCart}
              disabled={selectedSizeStock === 0}
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

          {/* Policies (Always Expanded) */}
          <div className="flex flex-col border-t border-outline-variant/30 mt-4 divide-y divide-outline-variant/30 font-body-sm text-body-sm">
            {ACCORDION_ITEMS.map((item) => (
              <div key={item.title} className="py-4 flex flex-col gap-2">
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  {item.title}
                </h3>
                <div className={item.tone}>{item.body}</div>
              </div>
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
                <p style={{ fontSize: 'var(--custom-font-desc-size-detail, 16px)' }}>{product.description}</p>
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
                    <ProductCardImage
                      images={related.images && related.images.length > 0 ? related.images : [related.image]}
                      alt={related.alt}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
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

      <SiteFooter />
    </>
  );
}
