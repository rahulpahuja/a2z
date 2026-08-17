import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_FALLBACK_LINKS = [
  { label: 'New Arrivals', to: '/products?filter=new-arrivals' },
  { label: "Men's Wear", to: '/products?category=Jeans%2CMen%27s%20Shirts%2CMens%20T-Shirts' },
  { label: "Girl's Wear", to: '/products?category=Barbie%20Dress%2CBlazer%20Set%2CCo-ords%20Set%2CLong%20One%20Piece%2CShort%20One%20Piece%2CShort%20Two%20Piece' },
  { label: 'Funky Collection', to: '/products?category=Funky%20Jeans' },
];

export default function MobileNavDrawer({ open, onClose, links = [] }) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const handleKey = (event) => {
        if (event.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKey);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKey);
      };
    }
    document.body.style.overflow = '';
    return undefined;
  }, [open, onClose]);

  // Ensure 'New Arrivals' is always at the top of the list
  const categoryLinks = useMemo(() => {
    const rawList = Array.isArray(links) && links.length > 0 ? links : DEFAULT_FALLBACK_LINKS;
    const items = [...rawList];

    // Find if New Arrivals exists in the list
    const newArrivalsIndex = items.findIndex(
      (item) => item?.label?.toLowerCase() === 'new arrivals' || item?.type === 'all'
    );

    let newArrivalsItem;
    if (newArrivalsIndex >= 0) {
      newArrivalsItem = items.splice(newArrivalsIndex, 1)[0];
    } else {
      newArrivalsItem = { label: 'New Arrivals', to: '/products?filter=new-arrivals' };
    }

    return {
      newArrivals: newArrivalsItem,
      otherCategories: items,
    };
  }, [links]);

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '+919644444661';
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');

  return (
    <div
      className={`fixed inset-0 z-[300] md:hidden transition-all duration-300 ${
        open ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop overlay (pure dark fade for zero GPU compositing stalls) */}
      <div
        className={`absolute inset-0 bg-black/65 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel with hardware-accelerated slide */}
      <div
        className={`absolute left-0 top-0 h-full w-[85vw] max-w-[340px] bg-surface dark:bg-surface-container-highest shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out will-change-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-variant bg-surface-container-low dark:bg-surface-container">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 font-headline-md-mobile text-headline-md-mobile font-bold text-primary dark:text-primary-fixed-dim playfair tracking-tight"
          >
            <span>A2Z Collection</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Main Primary Links */}
          <div>
            <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold mb-2 block">
              Discover
            </span>
            <nav className="flex flex-col gap-1">
              {/* Guaranteed Prominent New Arrivals Link */}
              <Link
                to={categoryLinks.newArrivals.to || '/products?filter=new-arrivals'}
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-primary/10 text-primary font-bold font-title-sm text-title-sm hover:bg-primary/15 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-primary">sparkles</span>
                  <span>New Arrivals</span>
                </div>
                <span className="bg-primary text-on-primary font-label-caps text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
                  NEW
                </span>
              </Link>

              {/* All Products Link */}
              <Link
                to="/products"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors font-body-md text-body-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">grid_view</span>
                  <span>All Products</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">chevron_right</span>
              </Link>
            </nav>
          </div>

          {/* Categories Section */}
          <div>
            <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold mb-2 block">
              Categories
            </span>
            <nav className="flex flex-col gap-1">
              {categoryLinks.otherCategories.map((link) => (
                <Link
                  key={link.id || link.label}
                  to={link.to}
                  onClick={onClose}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors font-body-md text-body-md"
                >
                  <span className="truncate">{link.label}</span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50">chevron_right</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Highlights & Experience */}
          <div>
            <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold mb-2 block">
              Experience
            </span>
            <nav className="flex flex-col gap-1">
              <Link
                to="/shots"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors font-body-md text-body-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-secondary">smart_display</span>
                  <span>A2Z Shots (Video Reels)</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">chevron_right</span>
              </Link>
              <Link
                to="/orders/tracking"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors font-body-md text-body-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">local_shipping</span>
                  <span>Track Your Order</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">chevron_right</span>
              </Link>
              <Link
                to="/orders"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors font-body-md text-body-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">receipt_long</span>
                  <span>My Orders</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">chevron_right</span>
              </Link>
              <Link
                to="/cart"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors font-body-md text-body-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">shopping_bag</span>
                  <span>Cart</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">chevron_right</span>
              </Link>
            </nav>
          </div>

          {/* Quick Help & Store Details */}
          <div>
            <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold mb-2 block">
              About &amp; Support
            </span>
            <nav className="flex flex-col gap-1">
              <Link
                to="/a2z-stores"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3.5 py-2 text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span>Store Location</span>
              </Link>
              <Link
                to="/contact-us"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3.5 py-2 text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                <span>Contact Us</span>
              </Link>
              <Link
                to="/about-us"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3.5 py-2 text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>About A2Z</span>
              </Link>
              <Link
                to="/size-chart"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3.5 py-2 text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">straighten</span>
                <span>Size Guide</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Drawer Footer Contact Actions */}
        <div className="p-4 border-t border-surface-variant bg-surface-container-low dark:bg-surface-container flex gap-2">
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-label-caps text-[11px] uppercase tracking-wider transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              WhatsApp
            </a>
          )}
          {cleanPhone && (
            <a
              href={`tel:+${cleanPhone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-outline hover:border-primary text-on-surface hover:text-primary font-label-caps text-[11px] uppercase tracking-wider transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              Call Us
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
