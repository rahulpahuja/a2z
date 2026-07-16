import { useState } from 'react';
import { Link } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { generateReceiptPdf } from '../utils/generateReceipt.js';
import ProductImage from '../components/ProductImage.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import './OrderTrackingPage.css';

const NAV_LINKS = [
  { label: 'New Arrivals', to: '/products' },
  { label: 'Sarees', to: '/products?category=Saree' },
  { label: 'Lehengas', to: '/products?category=Lehenga' },
  { label: 'Kurtis', to: '/products?category=Kurti' },
];

const TRACKING_STEPS = [
  {
    label: 'Confirmed',
    date: 'Order placed',
    icon: 'check',
    circleClassName:
      'w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-sm',
    labelClassName: 'font-label-caps text-label-caps text-on-background',
    dateClassName: 'font-body-sm text-body-sm text-on-surface-variant',
  },
  {
    label: 'Shipped',
    date: 'Pending',
    icon: 'local_shipping',
    circleClassName:
      'w-8 h-8 rounded-full bg-surface border-2 border-secondary flex items-center justify-center text-secondary shadow-md ring-4 ring-secondary-container',
    labelClassName: 'font-label-caps text-label-caps text-on-background font-bold',
    dateClassName: 'font-body-sm text-body-sm text-on-surface-variant',
  },
  {
    label: 'In Transit',
    date: 'Pending',
    icon: 'route',
    circleClassName:
      'w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center text-on-surface-variant',
    labelClassName: 'font-label-caps text-label-caps text-on-surface-variant',
    dateClassName: 'font-body-sm text-body-sm text-on-surface-variant opacity-0',
  },
  {
    label: 'Delivered',
    date: 'Pending',
    icon: 'home',
    circleClassName:
      'w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center text-on-surface-variant',
    labelClassName: 'font-label-caps text-label-caps text-on-surface-variant',
    dateClassName: 'font-body-sm text-body-sm text-on-surface-variant opacity-0',
  },
];

export default function OrderTrackingPage() {
  const { lastOrder } = useCart();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      await generateReceiptPdf(lastOrder);
    } catch (err) {
      showToast(err.message || 'Could not generate the receipt.');
    } finally {
      setDownloading(false);
    }
  };

  if (!lastOrder) {
    return (
      <>
        <nav className="bg-surface dark:bg-surface-container-highest docked full-width top-0 sticky flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto z-50 flat no shadows border-b-0">
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

  const customerName = [lastOrder.shippingDetails?.firstName, lastOrder.shippingDetails?.lastName]
    .filter(Boolean)
    .join(' ') || 'Valued Customer';
  const placedDate = lastOrder.placedAt ? new Date(lastOrder.placedAt) : new Date();
  const itemCount = lastOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* TopNavBar */}
      <nav
        aria-label="Top Navigation"
        className="bg-surface dark:bg-surface-container-highest docked full-width top-0 sticky flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto z-50 flat no shadows border-b-0"
      >
        <div className="flex items-center gap-6">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
            A2Z Collection
          </Link>
          <div className="hidden md:flex gap-6 ml-8">
            {NAV_LINKS.map((link) => (
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

      {/* Main Content */}
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24 flex flex-col gap-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-surface-dim pb-8">
          <div>
            <h1 className="font-headline-md-mobile text-headline-md-mobile md:font-headline-md md:text-headline-md text-on-background mb-2">
              Track Order
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Order #<span className="font-semibold text-primary">{lastOrder.id}</span>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider mb-1">Order Placed</p>
              <p className="font-title-sm text-title-sm text-on-background">{placedDate.toLocaleString('en-IN')}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Payment: <span className="font-semibold text-on-background">{lastOrder.paymentMethod}</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-12 pb-8">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-dim -translate-y-1/2 rounded-full overflow-hidden">
              <div className="h-full bg-secondary progress-line" style={{ width: '25%' }}></div>
            </div>
            <div className="flex justify-between relative z-10">
              {TRACKING_STEPS.map((step) => (
                <div key={step.label} className="flex flex-col items-center gap-2">
                  <div className={step.circleClassName}>
                    <span className="material-symbols-outlined text-sm">{step.icon}</span>
                  </div>
                  <div className="text-center">
                    <p className={step.labelClassName}>{step.label}</p>
                    <p className={step.dateClassName}>{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Order Details Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items Section */}
          <section className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="font-title-sm text-title-sm text-on-background border-b border-surface-dim pb-4">Order Items</h2>
            <div className="flex flex-col gap-4">
              {lastOrder.items.map((item) => (
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
                <p>{lastOrder.shippingDetails?.address}</p>
                {lastOrder.shippingDetails?.apartment && <p>{lastOrder.shippingDetails.apartment}</p>}
                <p>
                  {[lastOrder.shippingDetails?.city, lastOrder.shippingDetails?.state, lastOrder.shippingDetails?.zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {lastOrder.shippingDetails?.phone && <p className="pt-2">Phone: {lastOrder.shippingDetails.phone}</p>}
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
                  <span>{formatCurrency(lastOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-secondary font-semibold">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18%)</span>
                  <span>{formatCurrency(lastOrder.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-surface-dim pt-3 font-semibold text-on-background text-base">
                  <span>Total</span>
                  <span>{formatCurrency(lastOrder.total)}</span>
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
