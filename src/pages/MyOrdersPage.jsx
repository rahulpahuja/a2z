import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import AuthModal from '../components/AuthModal.jsx';
import MobileNavDrawer from '../components/MobileNavDrawer.jsx';
import { subscribeToTopNav, topNavLinkToPath, DEFAULT_TOP_NAV_LINKS } from '../services/topNav.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { subscribeToOrders } from '../services/orders.js';
import { orderBelongsToUser } from '../utils/orderMatch.js';

const STATUS_STYLES = {
  Delivered: 'bg-secondary/15 text-secondary',
  Cancelled: 'bg-error/15 text-error',
};

export default function MyOrdersPage() {
  const { user } = useAuth();
  const { trackSpecificOrder } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);

  useEffect(() => {
    const unsub = subscribeToTopNav((links) => setTopNavLinks(links));
    return unsub;
  }, []);

  const navLinks = topNavLinks.map((link) => ({ label: link.label, to: topNavLinkToPath(link) }));

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToOrders((allOrders) => {
      const mine = allOrders
        .filter((o) => orderBelongsToUser(o, user))
        .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
      setOrders(mine);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const openOrder = (order) => {
    trackSpecificOrder(order);
    navigate('/orders/tracking');
  };

  if (!user) {
    return (
      <>
        <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto">
          <div className="flex items-center gap-4">
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
          </div>
        </header>
        <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />
        <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 flex flex-col items-center text-center gap-3">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
            Sign In to View Your Orders
          </h1>
        </main>
        <AuthModal dismissible onClose={() => navigate('/')} />
      </>
    );
  }

  return (
    <>
      <header className="bg-surface dark:bg-surface-container-highest flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto z-50 docked full-width top-0 sticky">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden [@media(orientation:landscape)_and_(max-height:500px)]:!inline-block text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
            A2Z Collection
          </Link>
        </div>
        <nav className="hidden md:flex [@media(orientation:landscape)_and_(max-height:500px)]:!hidden gap-8 items-center font-label-caps text-label-caps">
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
        <div className="flex items-center gap-unit text-primary dark:text-primary-fixed-dim">
          <CartIconButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
          <ProfileButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
        </div>
      </header>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-8">
          My Orders
        </h1>

        {loading ? (
          <p className="font-body-lg text-body-lg text-on-surface-variant">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant">receipt_long</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">You haven't placed any orders yet.</p>
            <Link
              to="/products"
              className="bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-lg uppercase tracking-widest"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => {
              const itemCount = order.items?.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openOrder(order)}
                  className="text-left bg-surface-container-low rounded-xl border border-outline-variant/30 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-primary transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-title-sm text-title-sm text-on-surface font-semibold">{order.id}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      {order.placedAt ? new Date(order.placedAt).toLocaleString('en-IN') : ''} · {itemCount} item{itemCount === 1 ? '' : 's'}
                    </p>
                    {order.shipment?.awb && (
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-1 font-mono">
                        AWB {order.shipment.awb} ({order.shipment.courier})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-price-display text-price-display text-on-surface">
                      {formatCurrency(order.total)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                        STATUS_STYLES[order.status] || 'bg-primary/10 text-primary'
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
