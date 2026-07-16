import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import { useCart } from '../context/CartContext.jsx';
import { recordView, subscribeToProductStats } from '../services/productStats.js';
import { getHighResUrl } from '../utils/image.js';
import SiteFooter from '../components/SiteFooter.jsx';
import './ProductDetailAltPage.css';

const PRODUCT = { id: 'crop-shirt-side-dori', title: 'Crop Shirt with Side Dori', price: 360 };

const thumbnails = [
  {
    alt: "A close-up studio shot of the crop shirt's side dori (tie) detail, showcasing the intricate artisanal stitching and high-quality sage green tassels against a minimalist white background. Soft, diffused lighting enhances the premium texture.",
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8GOn6MjJHPJ_V6xx9b_Qmc8GJKALSGGbStkQ83-Y7VQAet7LJtG51xIUiJgCvYkFSxPW42g7l6w_C5etjYPHwi5OkfENrpctjrW86ZC3tYRJ13JMdCs_nqGyYiKFhRCAYhLNgfTMspxMPRLTAywS-Rp7P9yTPMNA5bbJiKJvm7NtntqKGakXT85R7djn-Cq_bRLfj06moknG7vbP_fqGjFGN7zS4s_L5eJ2rmghW-XfoNkmucKCI6iA',
    active: true,
  },
  {
    alt: 'A lifestyle fashion shot of the crop shirt styled on a model from the back, highlighting the silhouette and drape of the traditional fabric. The lighting is elegant and natural, emphasizing a high-end boutique aesthetic.',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAP2dUYhbJvfT5_z6PNqwoYPafYPK-QNL7AJ2KzEZSiZLsEDHkNXDGUsNrNSTYXTSFpnRa-1jwN1bWPUiIEcxL_AFiNE91koz2H3j7_P7ED7WSSG7bxsAnstqiVps_nYt4qa3EQiP337137VgIA9KxQmUPfAZYBQPbkW2Ones8rHlxfLCsot4YrF2jlEMwBd941PjbyJ3PyJ__JHmZo5flRZEyAym9LGvlYYQvbWpvo6yeUUKLG9fAv2g',
    active: false,
  },
  {
    alt: 'A detailed macro texture shot of the Indian textile used in the crop shirt, revealing the weave structure and subtle color variations between dusty rose and warm neutrals. Elegant, minimalist presentation.',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2_r4nfW26kp4X6iX-KWHXbCsz3D3h3Iap4NGbnLau49ibZvP4RgUQnFmr4IymQ0aQDq0sDE_hsTouk-RlY9YcaaaLpapHlZ5bxqY0EVRv4PVFDtb0Yll6oJpw3BbU9XnjoelCo1U7WUCbj0K-43AQdfqWLO3rQ_s_1YP5p57rKQ0gc1V4yZA9y5npIZW27lrfZk5X8LQPFx0BOxJiot9fTPJL9bf5yK5YDA_oa4CXZFKmcokVaraqVQ',
    active: false,
  },
];

const COLOR_OPTIONS = [
  { label: 'Sage Green', swatchClass: 'bg-secondary' },
  { label: 'Dusty Brown', swatchClass: 'bg-tertiary' },
  { label: 'Hot Pink', swatchClass: 'bg-primary' },
  { label: 'Black', swatchClass: 'bg-inverse-surface' },
];

const SIZE_OPTIONS = [
  { label: 'S', disabled: false },
  { label: 'M', disabled: false },
  { label: 'L', disabled: false },
  { label: 'XL', disabled: false },
  { label: 'XXL', disabled: true },
];

const accordionItems = [
  {
    key: 'shipping',
    icon: 'local_shipping',
    title: 'Shipping & Delivery',
    content:
      'We offer free express shipping on all orders above ₹1500. Standard delivery takes 3-5 business days depending on your location in India.',
  },
  {
    key: 'returns',
    icon: 'restart_alt',
    title: 'Returns & Exchange Policy',
    content:
      'Enjoy a hassle-free 7-day return and exchange policy. Garments must be unwashed, unworn, and with original tags intact.',
  },
  {
    key: 'material',
    icon: 'checkroom',
    title: 'Material & Care',
    content:
      'Crafted from 100% premium woven cotton blend. Gentle hand wash in cold water separately. Dry in shade to maintain color vibrancy.',
  },
];

const relatedProducts = [
  {
    alt: 'A fashion editorial shot of high-waisted wide-leg trousers in a complementary dusty rose tone. The trousers are styled minimally against a soft white studio background, conveying modern luxury and Indian heritage.',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSxi3yWeFH8xmyItKYFe6yE7dIAYIsbKj6MaNUuLsG9RNcU99wR9teKIU_r5mOEe5NiUdja_XdUptkJ1HYSJgMaLBbW1C6OZ92WrVRIoxVfnsjMnv2ztpiH9rCFKXWfFjSTH-frSuv9XMfonNI4qhhW3ZLStKRNzs3edTMiJ6ulfUH9wxzZTITJ4vG9012o1Z4kdaeX6esieIbHR9C5gNfCYmrOs_ItxV9-N1CCAnVY5Q3QqIKmFzAOA',
    badge: 'New',
    title: 'Pleated Wide Leg Trouser',
    price: '₹1,299',
  },
  {
    alt: 'A detailed product shot of artisanal oxidized silver earrings featuring lotus motifs, resting gently on a textured piece of raw sage green fabric. The lighting is soft and focused, creating a premium elegant aesthetic.',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQsVDtJ4_K8L3nyMz77ZD7tMAkAFNA350KXKMylmzpJcIsaViRM1-k4-EdU7gOWiOl2nPwDmgMoXwibMSlH5hZsdMBJMRPd5pLpnh3vRJ2GlNgsAiQSvn8DrlIvusNLODCiUCoOWN85J2yOJ_EcyXSSU6QR5uF6bj7APWKtBzGTCRAG1sHZBlLxxl7nz1Ii8i66Z6YhG-yBDx61mw5DNlSztQkM14z-XtJSY0N9Hzep9vuoVo-m-40hw',
    badge: null,
    title: 'Oxidized Lotus Earrings',
    price: '₹450',
  },
  {
    alt: 'A lifestyle photo of a minimalist sling bag crafted from traditional woven Indian textiles in warm neutral tones. Placed on a smooth white marble surface with a gentle drop shadow, embodying contemporary boutique fashion.',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADxyZxL4fLwnHjL2oO_HY2QeZx0rzY3Pjx2QLJ3nT1LE4WdmE8_z555FyFCojvR7OE_8riEPO7Ayu_0ztRVxeKGAAoxddI3mf2SQDNuzElEdkQAm9U5VX-9v1f5RRUkfIZFKrjeYKl9aJomxU83AjssI-fCIpK0Oa6pZcg3QkjTTn_kBcFJMON13_3kDZQUgNN7gxfBUqPwVOMMsJqd3gvFaKbm6n8zSoBfaoQve5pzshoYUBoJPtlSQ',
    badge: null,
    title: 'Woven Textile Sling',
    price: '₹890',
  },
  {
    alt: 'A beautiful fashion shot of an elegant dupion silk dupatta draped delicately over a chair. The fabric has a subtle sheen and deep hot pink color, illuminated by high-key, elegant studio lighting.',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXb115zyJLZWWOAcDB4szQreuZBNrNqYHlMs61VQxJB5HKB5jkiqGmsLegqzCbNW4NWCpWI_bJPV7b0KcqReGwLzfwF9nXvd_Z_QispPQkOLUa3cZ_l033y9YnjIGrJF2lXvKyyqEtMQWmN4ujhgE8hQCvcqjV-F5pHJwN_373b_3CfTTpbmoRyf0Vg2LIR_F2XgUgwDdN8mn3nXSL4xoWfypZuAVkx6itH_dyJ6w4GOHYsN5lQag3Fw',
    badge: null,
    title: 'Silk Blend Dupatta',
    price: '₹650',
  },
];

thumbnails.forEach((t) => {
  t.src = getHighResUrl(t.src);
});
relatedProducts.forEach((rp) => {
  rp.src = getHighResUrl(rp.src);
});

export default function ProductDetailAltPage() {
  const [openSection, setOpenSection] = useState(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].label);
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [viewCount, setViewCount] = useState(null);

  useEffect(() => {
    recordView(PRODUCT.id);
    return subscribeToProductStats(PRODUCT.id, (stats) => setViewCount(stats.views));
  }, []);

  const toggleAccordion = (key) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const cartLine = () => ({
    id: `${PRODUCT.id}-${selectedColor}-${selectedSize}`,
    productId: PRODUCT.id,
    title: PRODUCT.title,
    color: selectedColor,
    size: selectedSize,
    price: PRODUCT.price,
    image: thumbnails[0].src,
    alt: thumbnails[0].alt,
  });

  const handleAddToCart = () => addItem(cartLine(), quantity);
  const handleBuyNow = () => {
    addItem(cartLine(), quantity);
    navigate('/checkout/shipping');
  };

  return (
    <>
      {/* TopNavBar (Shared Component) */}
      <header className="bg-surface dark:bg-surface-container-highest docked full-width top-0 sticky z-50">
        <div className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto z-50">
          {/* Brand Logo */}
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
            A2Z Collection
          </Link>
          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex gap-8 items-center font-label-caps text-label-caps">
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" to="/products">New Arrivals</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" to="/products?category=Saree">Sarees</Link>
            <Link className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" to="/products?category=Lehenga">Lehengas</Link>
            <Link className="text-primary dark:text-primary-fixed-dim border-b-2 border-primary dark:border-primary-fixed-dim pb-1 hover:opacity-80 transition-opacity duration-200 scale-95 transition-transform" to="/products?category=Kurti">Kurtis</Link>
          </nav>
          {/* Trailing Icons */}
          <div className="flex gap-4 items-center text-primary dark:text-primary-fixed-dim">
            <CartIconButton className="hover:opacity-80 transition-opacity duration-200" iconClassName="material-symbols-outlined text-2xl" />
            <ProfileButton className="hover:opacity-80 transition-opacity duration-200" iconClassName="material-symbols-outlined text-2xl" />
          </div>
        </div>
      </header>

      {/* Main Canvas: Product Detail Page */}
      <main className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex text-on-surface-variant font-body-sm text-body-sm mb-8">
          <ol className="inline-flex items-center space-x-2">
            <li className="inline-flex items-center hover:text-primary transition-colors cursor-pointer">Home</li>
            <li><span className="material-symbols-outlined text-sm mx-1">chevron_right</span></li>
            <li className="inline-flex items-center hover:text-primary transition-colors cursor-pointer">Kurtis &amp; Tops</li>
            <li><span className="material-symbols-outlined text-sm mx-1">chevron_right</span></li>
            <li aria-current="page" className="text-on-surface">Crop Shirt with Side Dori</li>
          </ol>
        </nav>

        {/* 60/40 Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-[64px] items-start">
          {/* LEFT: Image Gallery (60% / 7 cols) */}
          <div className="lg:col-span-7 flex flex-col md:flex-row-reverse gap-4 sticky top-[100px]">
            {/* Main Image */}
            <div className="w-full md:w-[85%] rounded-[16px] overflow-hidden bg-surface-container-low aspect-[3/4] relative group">
              <img
                className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                data-alt="A highly editorial fashion photograph of a beautiful handcrafted crop shirt with a side dori detail. The garment is made from traditional Indian textiles featuring subtle dusty rose and hot pink motifs, blending minimalism with modern luxury. The setting is a pristine, bright studio with soft, natural lighting that casts gentle shadows, highlighting the rich texture of the fabric. The overall aesthetic is 'Vibrant Elegance', appealing to a high-end contemporary fashion audience. Shot with an 85mm lens."
                id="main-product-image"
                src={getHighResUrl("https://lh3.googleusercontent.com/aida-public/AB6AXuA862w4s_QW4LsrwVqg_i79cFJRyRWPymM0bS5ADeHlUd1Od_JDVv9XPUCfYz5CTTPg3fqKZZwePePzrOaG2g2XnA5QJLj_cHSaf1AYMVuJXw4WRIyp5bI7Wpz0KxvFRRYvgeOV9DYD3NZZhSlBCo6OQWiy32TfaNTxF6v3BmHA9qw3dxJK6-3Nl2GJZbu5cviFyd32GQq9IjSB257ofYBYYE4vc2kwL74TQG0Xxh37YTYvr7e0-68N7w")}
              />
              {/* Favorite FAB */}
              <button className="absolute top-4 right-4 w-10 h-10 bg-surface rounded-full flex items-center justify-center text-outline shadow-sm hover:text-primary transition-colors">
                <span className="material-symbols-outlined">favorite</span>
              </button>
            </div>
            {/* Thumbnails */}
            <div className="w-full md:w-[15%] flex md:flex-col gap-4 overflow-x-auto hide-scrollbar snap-x">
              {thumbnails.map((thumb, index) => (
                <button
                  key={index}
                  className={`thumbnail-btn flex-shrink-0 snap-start w-20 md:w-full rounded-[12px] overflow-hidden aspect-[3/4] ${
                    thumb.active
                      ? 'border-2 border-primary'
                      : 'border border-outline-variant hover:border-primary transition-colors'
                  }`}
                >
                  <img className="w-full h-full object-cover" data-alt={thumb.alt} src={thumb.src} />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Product Details (40% / 5 cols) */}
          <div className="lg:col-span-5 flex flex-col pt-4 lg:pt-0">
            {/* Badges */}
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-secondary text-on-secondary font-label-caps text-label-caps uppercase px-4 py-1.5 rounded-full tracking-widest">
                Handcrafted
              </span>
              <span className="bg-tertiary-container text-on-tertiary-container font-label-caps text-label-caps uppercase px-4 py-1.5 rounded-full tracking-widest">
                On Sale
              </span>
            </div>
            {/* Title */}
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
              Crop Shirt with Side Dori
            </h1>
            {/* Ratings */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex text-primary">
                <span className="material-symbols-outlined fill-icon text-[20px]">star</span>
                <span className="material-symbols-outlined fill-icon text-[20px]">star</span>
                <span className="material-symbols-outlined fill-icon text-[20px]">star</span>
                <span className="material-symbols-outlined fill-icon text-[20px]">star</span>
                <span className="material-symbols-outlined fill-icon text-[20px]">star</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant underline cursor-pointer">42 Reviews</span>
              {viewCount !== null && viewCount > 0 && (
                <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  {viewCount.toLocaleString('en-IN')} views
                </span>
              )}
            </div>
            {/* Price */}
            <div className="flex items-end gap-4 mb-8">
              <span className="font-price-display text-price-display text-on-surface text-3xl">₹360</span>
              <span className="font-price-display text-price-display text-outline line-through text-xl pb-1">₹999</span>
            </div>
            <hr className="border-t border-outline-variant/30 mb-8" />
            {/* Color Selector */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="font-title-sm text-title-sm text-on-surface">
                  Color: <span className="font-body-lg font-normal text-on-surface-variant">{selectedColor}</span>
                </span>
              </div>
              <div className="flex gap-3">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.label}
                    aria-label={color.label}
                    onClick={() => setSelectedColor(color.label)}
                    className={`w-10 h-10 rounded-full ${color.swatchClass} ${
                      selectedColor === color.label
                        ? 'ring-2 ring-offset-2 ring-primary focus:outline-none'
                        : 'border border-outline hover:ring-2 hover:ring-offset-2 hover:ring-outline transition-all'
                    }`}
                  ></button>
                ))}
              </div>
            </div>
            {/* Size Selector */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="font-title-sm text-title-sm text-on-surface">Size</span>
                <a className="font-body-sm text-body-sm text-primary underline" href="#">Size Guide</a>
              </div>
              <div className="flex flex-wrap gap-3">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size.label}
                    disabled={size.disabled}
                    onClick={() => setSelectedSize(size.label)}
                    className={
                      size.disabled
                        ? 'border border-outline text-on-surface font-label-caps text-label-caps rounded-full px-6 py-3 opacity-50 cursor-not-allowed'
                        : selectedSize === size.label
                        ? 'border-2 border-primary bg-primary/5 text-primary font-label-caps text-label-caps rounded-full px-6 py-3'
                        : 'border border-outline text-on-surface font-label-caps text-label-caps rounded-full px-6 py-3 hover:border-primary hover:text-primary transition-colors'
                    }
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Actions: Quantity & Buttons */}
            <div className="flex flex-col gap-4 mb-10">
              <div className="flex gap-4">
                {/* Quantity */}
                <div className="flex items-center border border-outline rounded-[12px] h-12 w-32">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 text-on-surface-variant hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <input className="w-full text-center font-body-lg text-body-lg bg-transparent border-none focus:ring-0 p-0" readOnly type="text" value={quantity} />
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 text-on-surface-variant hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 border border-outline text-on-surface font-label-caps text-label-caps uppercase rounded-[12px] px-6 py-3 hover:border-primary hover:text-primary transition-colors flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">shopping_bag</span>
                  Add to Cart
                </button>
              </div>
              {/* Buy It Now */}
              <button
                onClick={handleBuyNow}
                className="w-full bg-primary text-on-primary font-label-caps text-label-caps uppercase rounded-[12px] px-6 py-4 hover:bg-surface-tint hover:shadow-[0px_10px_30px_rgba(172,36,113,0.15)] transition-all flex justify-center items-center tracking-widest"
              >
                Buy It Now
              </button>
            </div>
            {/* Accordions (Shipping, Returns) */}
            <div className="border-t border-outline-variant/30">
              {accordionItems.map((item) => {
                const isPermanentOpen = item.key === 'shipping' || item.key === 'returns';
                const isOpen = isPermanentOpen || openSection === item.key;
                return (
                  <div key={item.key} className="border-b border-outline-variant/30 py-4">
                    {isPermanentOpen ? (
                      <div className="w-full flex flex-col text-left">
                        <span className="font-title-sm text-title-sm text-on-surface flex items-center gap-3 mb-2">
                          <span className="material-symbols-outlined text-outline">{item.icon}</span>
                          {item.title}
                        </span>
                        <div className="font-body-sm text-body-sm text-on-surface-variant pr-8">
                          {item.content}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className="accordion-btn w-full flex justify-between items-center text-left focus:outline-none"
                          onClick={() => toggleAccordion(item.key)}
                        >
                          <span className="font-title-sm text-title-sm text-on-surface flex items-center gap-3">
                            <span className="material-symbols-outlined text-outline">{item.icon}</span>
                            {item.title}
                          </span>
                          <span
                            className="material-symbols-outlined text-on-surface-variant transition-transform duration-300"
                            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            expand_more
                          </span>
                        </button>
                        <div className={`accordion-content font-body-sm text-body-sm text-on-surface-variant pt-2 pr-8 ${isOpen ? 'open' : ''}`}>
                          {item.content}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-24 md:h-32"></div>

        {/* Product Description (Editorial Style) */}
        <section className="max-w-3xl mx-auto text-center mb-24">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-6">The Art of Subdued Elegance</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed mb-6">
            Redefine your casual wardrobe with the A2Z Collection Crop Shirt. Rooted in traditional Indian craftsmanship yet tailored for the modern aesthetic, this piece features a distinctive side dori detail that allows for a customizable, flattering fit.
          </p>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            The minimalist silhouette provides a perfect canvas for the intricate weave of the fabric, ensuring breathability and effortless style whether paired with high-waisted trousers or a flowing lehenga skirt.
          </p>
        </section>

        {/* Related Products Carousel */}
        <section className="mb-24">
          <div className="flex justify-between items-end mb-8">
            <h2 className="font-headline-md text-headline-md text-on-surface">Complete The Look</h2>
            <a className="font-label-caps text-label-caps text-primary uppercase hover:underline" href="#">View All</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-gutter">
            {relatedProducts.map((product) => (
              <a key={product.title} className="group block" href="#">
                <div className="rounded-[16px] border border-tertiary/30 bg-surface-container-low overflow-hidden aspect-[3/4] mb-4 relative">
                  <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" data-alt={product.alt} src={product.src} />
                  {product.badge && (
                    <div className="absolute bottom-3 left-3 bg-tertiary-container text-on-tertiary-container font-label-caps text-[10px] px-3 py-1 rounded-full uppercase">
                      {product.badge}
                    </div>
                  )}
                </div>
                <h3 className="font-title-sm text-title-sm text-on-surface truncate">{product.title}</h3>
                <p className="font-price-display text-price-display text-on-surface mt-1">{product.price}</p>
              </a>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
