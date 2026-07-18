import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/super', label: 'Dashboard', icon: 'dashboard', exact: true },
  { to: '/super/sales', label: 'Sales Management', icon: 'bar_chart' },
  { to: '/super/carousel', label: 'Hero Carousel', icon: 'view_carousel' },
  { to: '/super/categories', label: 'Categories', icon: 'category' },
  { to: '/super/products', label: 'Products', icon: 'inventory_2' },
  { to: '/super/product-videos', label: 'Product Videos', icon: 'video_library' },
  { to: '/super/ai-studio', label: 'AI Studio', icon: 'auto_awesome' },
  { to: '/super/bill-template', label: 'Bill Template', icon: 'receipt_long' },
  { to: '/super/referrers', label: 'Referrer Details', icon: 'person_add' },
  { to: '/super/settings', label: 'Store Settings', icon: 'storefront' },
  { to: '/super/tracking-partners', label: 'Tracking Partners', icon: 'local_shipping' },
  { to: '/super/payment-gateway', label: 'Payment Gateways', icon: 'credit_card' },
  { to: '/super/image-converter', label: 'Image Converter', icon: 'image' },
  { to: '/super/configurator', label: 'Layout Configurator', icon: 'settings_accessibility' },
  { to: '/super/docs', label: 'Docs', icon: 'menu_book' },
  { to: '/super/upload-test', label: 'R2 Upload Test', icon: 'cloud_upload' },
];

export default function AdminLayout({ children }) {
  const { signOutUser } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-[240px] bg-surface-container border-r border-outline-variant flex flex-col shrink-0">
        <div className="p-gutter border-b border-outline-variant">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary playfair">
            A2Z Collection
          </Link>
          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-unit py-gutter space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body-sm text-body-sm transition-colors ${
                  active
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-unit border-t border-outline-variant">
          <button
            type="button"
            onClick={signOutUser}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-body-sm text-body-sm text-error hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
