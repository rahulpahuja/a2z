import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { generateReceiptPdf } from '../utils/generateReceipt.js';
import { subscribeToOrder } from '../services/orders.js';
import { getTrackingPortalUrl } from '../utils/trackingPortal.js';
import ProductImage from '../components/ProductImage.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import MobileNavDrawer from '../components/MobileNavDrawer.jsx';
import OrderSuccessCelebration from '../components/OrderSuccessCelebration.jsx';
import { subscribeToTopNav, topNavLinkToPath, DEFAULT_TOP_NAV_LINKS } from '../services/topNav.js';
import './OrderTrackingPage.css';

export default function OrderTrackingPage() {
  const { lastOrder } = useCart();
  const location = useLocation();
  const [liveOrder, setLiveOrder] = useState(lastOrder);
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);
  const [showCelebration, setShowCelebration] = useState(Boolean(location.state?.justPlaced));

  useEffect(() => {
    const unsub = subscribeToTopNav((links) => setTopNavLinks(links));
    return unsub;
  }, []);

  const navLinks = topNavLinks.map((link) => ({ label: link.label, to: topNavLinkToPath(link) }));

  useEffect(() => {
    setLiveOrder(lastOrder);
    if (lastOrder?.id) {
      const unsub = subscribeToOrder(lastOrder.id, (order) => {
        if (order) {
          setLiveOrder(order);
        }
      });
      return unsub;
    }
  }, [lastOrder]);

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      await generateReceiptPdf(liveOrder);
    } catch (err) {
      showToast(err.message || 'Could not generate the receipt.');
    } finally {
      setDownloading(false);
    }
  };

  if (!liveOrder) {
    return (
      <>
        <nav className="bg-surface dark:bg-surface-container-highest docked full-width top-0 sticky flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto z-50 flat no shadows border-b-0">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
            A2Z Collection
          </Link>
          <CartIconButton className="text-primary dark:text-primary-fixed-dim" />
        </nav>
        <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-24 text-center">
          <h1 className="font-headline-md text-headline-md text-on-surface mb-4">No recent orders</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
            Place an order to see its tracking details here.
          </p>
          <Link to="/products" className="inline-block bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-lg uppercase tracking-widest">
            Browse Products
          </Link>
        </main>
      </>
    );
  }

  const customerName = [liveOrder.shippingDetails?.firstName, liveOrder.shippingDetails?.lastName]
    .filter(Boolean)
    .join(' ') || 'Valued Customer';
  const placedDate = liveOrder.placedAt ? new Date(liveOrder.placedAt) : new Date();
  const itemCount = liveOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  const currentStatus = liveOrder?.status || 'Processing';
  
  const statusToStepIndex = (status) => {
    switch (status) {
      case 'Processing':
      case 'Confirmed':
        return 0;
      case 'Shipped':
        return 1;
      case 'In Transit':
        return 2;
      case 'Delivered':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIndex = statusToStepIndex(currentStatus);

  const steps = [
    {
      label: 'Confirmed',
      date: 'Order placed',
      icon: 'check',
    },
    {
      label: 'Shipped',
      date: currentStepIndex >= 1 ? 'Ready for courier' : 'Pending',
      icon: 'local_shipping',
    },
    {
      label: 'In Transit',
      date: currentStepIndex >= 2 ? 'On the way' : 'Pending',
      icon: 'route',
    },
    {
      label: 'Delivered',
      date: currentStepIndex >= 3 ? 'Delivered' : 'Pending',
      icon: 'home',
    },
  ];

  const getProgressBarWidth = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return '5%';
      case 1:
        return '33%';
      case 2:
        return '66%';
      case 3:
        return '100%';
      default:
        return '5%';
    }
  };

  const getStepStyles = (index, activeIndex) => {
    if (index < activeIndex) {
      return {
        circle: 'w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-sm',
        label: 'font-label-caps text-label-caps text-on-background font-semibold',
        date: 'font-body-sm text-body-sm text-on-surface-variant',
      };
    } else if (index === activeIndex) {
      return {
        circle: 'w-8 h-8 rounded-full bg-surface border-2 border-secondary flex items-center justify-center text-secondary shadow-md ring-4 ring-secondary-container',
        label: 'font-label-caps text-label-caps text-on-background font-bold',
        date: 'font-body-sm text-body-sm text-on-surface-variant',
      };
    } else {
      return {
        circle: 'w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center text-on-surface-variant',
        label: 'font-label-caps text-label-caps text-on-surface-variant',
        date: 'font-body-sm text-body-sm text-on-surface-variant opacity-0',
      };
    }
  };

  return (
    <>
      {showCelebration && (
        <OrderSuccessCelebration orderId={liveOrder.id} onClose={() => setShowCelebration(false)} />
      )}
      {/* TopNavBar */}
      <nav
        aria-label="Top Navigation"
        className="bg-surface dark:bg-surface-container-highest docked full-width top-0 sticky flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto z-50 flat no shadows border-b-0"
      >
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
          <div className="hidden md:flex gap-6 ml-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim transition-opacity duration-200 hover:opacity-80"
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-primary dark:text-primary-fixed-dim">
          <CartIconButton className="hover:opacity-80 transition-opacity duration-200" />
          <ProfileButton className="text-primary dark:text-primary-fixed-dim border-b-2 border-primary dark:border-primary-fixed-dim pb-1 focus:scale-95 transition-transform" />
        </div>
      </nav>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />

      {/* Main Content */}
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24 flex flex-col gap-8">
        
        {/* Cancelled Banner */}
        {liveOrder.status === 'Cancelled' && (
          <div className="p-5 bg-error/10 text-error rounded-xl border border-error/20 flex items-center gap-4 shadow-sm">
            <span className="material-symbols-outlined text-[28px] shrink-0">cancel</span>
            <div>
              <p className="font-bold text-[15px] font-display">Order Cancelled</p>
              <p className="text-[12px] opacity-90 mt-0.5">This order has been cancelled and cannot be processed further. If you have questions about refunds or cancellation, please reach out to customer support.</p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-surface-dim pb-8">
          <div>
            <h1 className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md text-on-background mb-2">
              Track Order
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Order #<span className="font-semibold text-primary">{liveOrder.id}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleDownloadReceipt}
              disabled={downloading}
              className="px-6 py-3 rounded-lg border border-tertiary text-tertiary font-label-caps text-label-caps uppercase hover:bg-surface-container transition-colors focus:ring-2 focus:ring-primary-container disabled:opacity-50"
            >
              {downloading ? 'Preparing…' : 'Download Receipt'}
            </button>
            <button className="px-6 py-3 rounded-lg bg-primary-container text-on-primary font-label-caps text-label-caps uppercase hover:opacity-90 transition-opacity focus:ring-2 focus:ring-primary-container">
              Contact Support
            </button>
          </div>
        </header>

        {/* Tracking Visualizer */}
        <section className="bg-surface-container-low rounded-xl p-8 border border-surface-dim border-opacity-30 relative overflow-hidden">
          {/* Live Tracking Partner and ID Display */}
          {liveOrder.trackingId && (
            <div className="mb-8 p-5 bg-secondary/10 rounded-xl border border-secondary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[26px]">local_shipping</span>
                <div>
                  <p className="font-bold text-on-surface text-[14px]">
                    Shipped via <span className="text-secondary">{liveOrder.trackingPartner || 'Delivery Partner'}</span>
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Your package is on its way. Use the tracking ID below to check live transit updates.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center bg-surface-container border border-outline-variant/35 rounded-lg px-4 py-2 font-mono text-[12px] text-on-surface select-all shadow-sm">
                  <span className="text-on-surface-variant text-[10px] uppercase font-sans font-semibold tracking-wider mr-2">Tracking ID:</span>
                  {liveOrder.trackingId}
                </div>
                <a
                  href={getTrackingPortalUrl(liveOrder.trackingPartner, liveOrder.trackingId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary py-2 px-3 text-[10px] flex items-center justify-center gap-1.5"
                >
                  <span>Track on Portal</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider mb-1">Order Placed</p>
              <p className="font-title-sm text-title-sm text-on-background">
                {liveOrder.placedAt ? new Date(liveOrder.placedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Payment: <span className="font-semibold text-on-background">{liveOrder.paymentMethod}</span>
                {liveOrder.paymentId && (
                  <span className="ml-2 font-mono text-[11px] text-on-surface-variant">({liveOrder.paymentId})</span>
                )}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-12 pb-8">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-dim -translate-y-1/2 rounded-full overflow-hidden">
              <div
                className={`h-full ${liveOrder.status === 'Cancelled' ? 'bg-error' : 'bg-secondary'} transition-all duration-500`}
                style={{ width: getProgressBarWidth(currentStepIndex) }}
              ></div>
            </div>
            <div className="flex justify-between relative z-10">
              {steps.map((step, idx) => {
                const styles = getStepStyles(idx, currentStepIndex);
                return (
                  <div key={step.label} className="flex flex-col items-center gap-2">
                    <div className={styles.circle}>
                      <span className="material-symbols-outlined text-sm">
                        {liveOrder.status === 'Cancelled' && idx >= currentStepIndex ? 'close' : step.icon}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className={styles.label}>{step.label}</p>
                      <p className={styles.date}>{step.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Order Details Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items Section */}
          <section className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="font-title-sm text-title-sm text-on-background border-b border-surface-dim pb-4">Order Items</h2>
            <div className="flex flex-col gap-4">
              {liveOrder.items.map((item) => (
                <div key={item.id} className="flex gap-6 p-4 rounded-xl border border-tertiary border-opacity-30 bg-surface items-center">
                  <div className="w-24 h-32 rounded-lg overflow-hidden shrink-0">
                    <ProductImage className="w-full h-full object-cover" data-alt={item.alt} alt={item.alt} src={item.image} />
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-title-sm text-title-sm text-on-background">{item.title}</h3>
                      <p className="font-price-display text-price-display text-on-background">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
                      {[item.color && `Color: ${item.color}`, item.size && `Size: ${item.size}`].filter(Boolean).join(' | ')}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-tertiary bg-opacity-20 rounded-full font-label-caps text-label-caps text-on-tertiary-container">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping Details Sidebar */}
          <section className="flex flex-col gap-6">
            <div className="bg-surface-container-low rounded-xl p-6 border border-surface-dim border-opacity-30">
              <h2 className="font-title-sm text-title-sm text-on-background border-b border-surface-dim pb-4 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span>
                Shipping Address
              </h2>
              <div className="font-body-sm text-body-sm text-on-surface-variant space-y-1">
                <p className="font-semibold text-on-background text-base">{customerName}</p>
                <p>{liveOrder.shippingDetails?.address}</p>
                {liveOrder.shippingDetails?.apartment && <p>{liveOrder.shippingDetails.apartment}</p>}
                <p>
                  {[liveOrder.shippingDetails?.city, liveOrder.shippingDetails?.state, liveOrder.shippingDetails?.zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {liveOrder.shippingDetails?.phone && <p className="pt-2">Phone: {liveOrder.shippingDetails.phone}</p>}
              </div>
            </div>
            <div className="bg-surface-container-low rounded-xl p-6 border border-surface-dim border-opacity-30">
              <h2 className="font-title-sm text-title-sm text-on-background border-b border-surface-dim pb-4 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                Order Summary
              </h2>
              <div className="font-body-sm text-body-sm text-on-surface-variant space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>{formatCurrency(liveOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-secondary font-semibold">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18%)</span>
                  <span>{formatCurrency(liveOrder.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-surface-dim pt-3 font-semibold text-on-background text-base">
                  <span>Total</span>
                  <span>{formatCurrency(liveOrder.total)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
