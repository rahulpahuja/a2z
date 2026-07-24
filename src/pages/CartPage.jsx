import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import MobileNavDrawer from '../components/MobileNavDrawer.jsx';
import { subscribeToTopNav, topNavLinkToPath, DEFAULT_TOP_NAV_LINKS } from '../services/topNav.js';

function CartLineItem({ item, onIncrease, onDecrease, onQuantityChange, onRemove }) {
  return (
    <div className="flex flex-col sm:flex-row gap-gutter sm:items-center border-b border-surface-variant pb-gutter">
      <div className="w-[100px] h-[133px] sm:w-[120px] sm:h-[160px] flex-shrink-0 rounded-[16px] overflow-hidden border border-[rgba(220,174,150,0.3)]">
        <ProductImage className="w-full h-full object-cover" data-alt={item.alt} alt={item.alt} src={item.image} />
      </div>
      <div className="flex-grow min-w-0 flex flex-col gap-[8px]">
        <h3 className="font-title-sm text-title-sm text-on-surface">{item.title}</h3>
        {item.color && <p className="font-body-sm text-body-sm text-on-surface-variant">Color: {item.color}</p>}
        {item.size && <p className="font-body-sm text-body-sm text-on-surface-variant">Size: {item.size}</p>}
        <div className="flex items-center gap-4 mt-[8px]">
          <button
            className="text-error hover:text-on-error-container transition-colors font-label-caps text-label-caps flex items-center gap-1"
            onClick={() => onRemove(item.id)}
          >
            <span className="material-symbols-outlined text-[16px]" data-icon="delete">
              delete
            </span>{' '}
            Remove
          </button>
        </div>
      </div>
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-4 w-full sm:w-auto">
        <span className="font-price-display text-price-display text-on-surface">
          {formatCurrency(item.price * item.quantity)}
        </span>
        <div className="flex items-center border border-outline rounded-DEFAULT overflow-hidden">
          <button
            aria-label="Decrease quantity"
            className="px-3 py-1 bg-surface-container hover:bg-surface-variant transition-colors text-on-surface"
            onClick={() => onDecrease(item.id)}
          >
            -
          </button>
          <input
            aria-label="Quantity"
            className="w-[40px] text-center bg-transparent border-none text-on-surface font-body-sm text-body-sm focus:ring-0 p-1"
            type="number"
            value={item.quantity}
            onChange={(e) => onQuantityChange(item.id, e.target.value)}
          />
          <button
            aria-label="Increase quantity"
            className="px-3 py-1 bg-surface-container hover:bg-surface-variant transition-colors text-on-surface"
            onClick={() => onIncrease(item.id)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items: cartItems, updateQuantity, removeItem } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToTopNav((links) => setTopNavLinks(links));
    return unsub;
  }, []);

  const navLinks = topNavLinks.map((link) => ({ label: link.label, to: topNavLinkToPath(link) }));

  const handleIncrease = (id) => {
    const line = cartItems.find((item) => item.id === id);
    if (line) updateQuantity(id, line.quantity + 1);
  };

  const handleDecrease = (id) => {
    const line = cartItems.find((item) => item.id === id);
    if (line) updateQuantity(id, Math.max(1, line.quantity - 1));
  };

  const handleQuantityChange = (id, value) => {
    updateQuantity(id, Math.max(1, Number(value) || 1));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  return (
    <>
      {/* TopNavBar */}
      <header className="bg-surface dark:bg-surface-container-highest docked full-width top-0 sticky flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto z-50 transition-all duration-300">
        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
            A2Z Collection
          </Link>
          <nav className="hidden md:flex gap-6 font-body-lg text-body-lg">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <CartIconButton className="text-primary dark:text-primary-fixed-dim border-b-2 border-primary dark:border-primary-fixed-dim pb-1 hover:opacity-80 transition-opacity duration-200 scale-95 transition-transform" />
          <ProfileButton className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200" />
        </div>
      </header>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />
      {/* Main Content */}
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-[64px]">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-gutter">
          Your Cart
        </h1>
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant">shopping_cart</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Your cart is empty.</p>
            <Link
              to="/products"
              className="bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-[12px] uppercase tracking-widest"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
        <div className="flex flex-col lg:flex-row gap-[64px]">
          {/* Cart Items (70%) */}
          <div className="lg:w-7/10 w-full flex flex-col gap-gutter">
            {cartItems.map((item) => (
              <CartLineItem
                key={item.id}
                item={item}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                onQuantityChange={handleQuantityChange}
                onRemove={removeItem}
              />
            ))}
            <Link
              className="text-secondary hover:text-primary transition-colors font-title-sm text-title-sm flex items-center gap-2 mt-4 self-start"
              to="/products"
            >
              <span className="material-symbols-outlined" data-icon="arrow_back">
                arrow_back
              </span>{' '}
              Continue Shopping
            </Link>
          </div>
          {/* Order Summary Sidebar (30%) */}
          <div className="lg:w-3/10 w-full">
            <div className="bg-surface-container-low border border-[rgba(220,174,150,0.3)] rounded-[16px] p-gutter sticky top-[100px] shadow-[0px_10px_30px_rgba(172,36,113,0.05)]">
              <h2 className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md text-on-surface mb-gutter">
                Order Summary
              </h2>
              <div className="flex flex-col gap-[16px] mb-gutter border-b border-surface-variant pb-gutter">
                <div className="flex justify-between items-center">
                  <span className="font-body-lg text-body-lg text-on-surface-variant">Subtotal</span>
                  <span className="font-price-display text-price-display text-on-surface">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-lg text-body-lg text-on-surface-variant">Shipping</span>
                  <span className="font-body-lg text-body-lg text-secondary font-semibold">Free</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-lg text-body-lg text-on-surface-variant">Tax (18%)</span>
                  <span className="font-price-display text-price-display text-on-surface text-[16px]">
                    {formatCurrency(tax)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-gutter">
                <span className="font-title-sm text-title-sm text-on-surface">Grand Total</span>
                <span className="font-price-display text-price-display text-primary text-[24px]">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="mb-gutter flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="coupon">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-grow bg-transparent border-b border-outline focus:border-primary focus:ring-0 font-body-sm text-body-sm text-on-surface py-2 transition-colors"
                    id="coupon"
                    placeholder="Enter code"
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button className="text-secondary hover:text-primary transition-colors font-label-caps text-label-caps border border-secondary hover:border-primary px-4 py-2 rounded-DEFAULT uppercase">
                    Apply
                  </button>
                </div>
              </div>
              <button
                onClick={() => navigate('/checkout/shipping')}
                className="w-full bg-primary hover:bg-surface-tint text-on-primary font-label-caps text-label-caps py-4 rounded-[12px] uppercase tracking-widest transition-colors shadow-sm"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
