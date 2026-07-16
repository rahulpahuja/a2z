import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../context/CartContext.jsx';
import { PRODUCTS } from '../../data/products.js';
import { MOCK_ORDERS } from '../../data/mockOrders.js';
import { generateReceiptPdf } from '../../utils/generateReceipt.js';
import { subscribeToAdminProducts } from '../../services/adminProducts.js';
import { subscribeToOrders } from '../../services/orders.js';
import ProductImage from '../../components/ProductImage.jsx';
import {
  getOrdersToday,
  findOrderById,
  searchProducts,
  getProductSalesStats,
  getTopProducts,
  getBottomProducts,
  getWeekSalesSummary,
} from '../../utils/salesAnalytics.js';

const STATUS_STYLES = {
  Processing: 'bg-primary-container text-on-primary-container',
  Shipped: 'bg-secondary-container text-on-secondary-container',
  'In Transit': 'bg-tertiary-container text-on-tertiary-container',
  Delivered: 'bg-secondary text-on-secondary',
  Cancelled: 'bg-error-container text-on-error-container',
};

function StatCard({ label, value, sublabel }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">{label}</p>
      <p className="font-display-lg-mobile text-display-lg-mobile text-primary">{value}</p>
      {sublabel && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{sublabel}</p>}
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: '/super/categories', icon: 'category', label: 'Add a Category', desc: 'Products need a category before they can be added.' },
  { to: '/super/products', icon: 'add_box', label: 'Add a Product', desc: 'Title, price, HSN code, colors, sizes & stock.' },
  { to: '/super/products', icon: 'label', label: 'Print a Barcode', desc: 'Generate & print a product label from the product list.' },
  { to: '/super/bill-template', icon: 'receipt_long', label: 'Customize Bill Template', desc: 'Page size, layout, and where each column prints.' },
  { to: '/super/settings', icon: 'storefront', label: 'Store Settings', desc: 'Store name, address, phone, GST number.' },
  { to: '#order-lookup', icon: 'local_shipping', label: 'Look Up an Order', desc: 'Jump to the order status search below.' },
  { to: '#product-lookup', icon: 'query_stats', label: 'Look Up a Product', desc: 'Jump to the product sales search below.' },
  { to: '#sales-report', icon: 'leaderboard', label: 'Top & Bottom Sellers', desc: 'Jump to the top 10 / bottom 10 product report.' },
  { to: '/super/docs', icon: 'menu_book', label: 'Admin Docs', desc: 'Full guide to everything in this panel.' },
];

function QuickActions() {
  return (
    <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
      <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action) => {
          const className =
            'flex flex-col gap-2 border border-outline-variant/30 rounded-lg p-4 hover:border-primary hover:bg-surface-container transition-colors';
          const content = (
            <>
              <span className="material-symbols-outlined text-primary text-[22px]">{action.icon}</span>
              <span className="font-title-sm text-title-sm text-on-surface">{action.label}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{action.desc}</span>
            </>
          );
          return action.to.startsWith('#') ? (
            <a key={action.label} href={action.to} className={className}>
              {content}
            </a>
          ) : (
            <Link key={action.label} to={action.to} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ProductRankTable({ title, rows, emptyText }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
      <h2 className="font-title-sm text-title-sm text-on-surface mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant/30">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Units (30d)</th>
                <th className="py-2 pr-4">Revenue (30d)</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm">
              {rows.map((row, index) => (
                <tr key={row.product.id} className="border-b border-outline-variant/10 last:border-0">
                  <td className="py-3 pr-4 text-on-surface-variant">{index + 1}</td>
                  <td className="py-3 pr-4 text-on-surface flex items-center gap-3">
                    <ProductImage src={row.product.image} alt={row.product.name} className="w-9 h-11 object-cover rounded-md" />
                    {row.product.name}
                  </td>
                  <td className="py-3 pr-4 text-on-surface">{row.unitsThisMonth}</td>
                  <td className="py-3 pr-4 text-on-surface">{formatCurrency(row.revenueThisMonth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [liveOrders, setLiveOrders] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);

  useEffect(() => {
    const unsubProducts = subscribeToAdminProducts((rows) => {
      setDbProducts(rows);
    });
    const unsubOrders = subscribeToOrders((loadedOrders) => {
      setLiveOrders(loadedOrders);
    });
    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, []);

  const allProducts = useMemo(() => {
    const merged = [...dbProducts];
    PRODUCTS.forEach((staticProd) => {
      if (!merged.some((p) => p.id === staticProd.id)) {
        merged.push(staticProd);
      }
    });
    return merged;
  }, [dbProducts]);

  const allOrders = useMemo(() => [...liveOrders, ...MOCK_ORDERS], [liveOrders]);
  const ordersToday = useMemo(() => getOrdersToday(allOrders), [allOrders]);
  const weekSummary = useMemo(() => getWeekSalesSummary(allOrders), [allOrders]);
  const salesStats = useMemo(() => getProductSalesStats(allOrders, allProducts), [allOrders, allProducts]);
  const topProducts = useMemo(() => getTopProducts(salesStats, 10), [salesStats]);
  const bottomProducts = useMemo(() => getBottomProducts(salesStats, 10), [salesStats]);

  const [orderQuery, setOrderQuery] = useState('');
  const [orderResult, setOrderResult] = useState(undefined); // undefined = not searched yet, null = not found

  const [productQuery, setProductQuery] = useState('');
  const [productMatches, setProductMatches] = useState(null);

  const handleOrderLookup = (event) => {
    event.preventDefault();
    setOrderResult(findOrderById(allOrders, orderQuery));
  };

  const handleProductLookup = (event) => {
    event.preventDefault();
    setProductMatches(searchProducts(allProducts, productQuery));
  };

  const statsForProduct = (productId) => salesStats.find((s) => s.product.id === productId);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Dashboard</h1>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-10">
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard label="Orders Processed Today" value={ordersToday.length} />
          <StatCard
            label="Sales This Week"
            value={formatCurrency(weekSummary.revenue)}
            sublabel={`${weekSummary.unitsSold} units · ${weekSummary.orderCount} orders`}
          />
          <StatCard label="Orders Tracked (All Time)" value={allOrders.length} />
        </section>

        <QuickActions />

        {/* Order status lookup */}
        <section id="order-lookup" className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 scroll-mt-6">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Order Status Lookup</h2>
          <form onSubmit={handleOrderLookup} className="flex gap-3 mb-4">
            <input
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Enter Order ID, e.g. ORD-2026-9001"
              className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>
          {orderResult === null && (
            <p className="font-body-sm text-body-sm text-error">No order found with that ID.</p>
          )}
          {orderResult && (
            <div className="border border-outline-variant/30 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="font-title-sm text-title-sm text-on-surface">{orderResult.id}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => generateReceiptPdf(orderResult)}
                    className="px-3 py-1 rounded border border-primary text-primary font-label-caps text-[10px] uppercase hover:bg-surface-container transition-colors"
                  >
                    Download Invoice
                  </button>
                  <span className={`px-3 py-1 rounded-full font-label-caps text-[10px] uppercase ${STATUS_STYLES[orderResult.status] ?? 'bg-surface-variant text-on-surface-variant'}`}>
                    {orderResult.status}
                  </span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Placed {new Date(orderResult.placedAt).toLocaleString('en-IN')} ·{' '}
                {[orderResult.shippingDetails?.firstName, orderResult.shippingDetails?.lastName].filter(Boolean).join(' ') || 'Customer'}
              </p>
              <div className="flex flex-col gap-2">
                {orderResult.items.map((item) => (
                  <div key={item.id} className="flex justify-between font-body-sm text-body-sm text-on-surface">
                    <span>{item.title} × {item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-title-sm text-title-sm text-on-surface border-t border-outline-variant/30 pt-3">
                <span>Total</span>
                <span>{formatCurrency(orderResult.total)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Product lookup */}
        <section id="product-lookup" className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 scroll-mt-6">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Product Lookup</h2>
          <form onSubmit={handleProductLookup} className="flex gap-3 mb-4">
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Enter product ID, name, or category"
              className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>
          {productMatches !== null && productMatches.length === 0 && (
            <p className="font-body-sm text-body-sm text-error">No products matched that search.</p>
          )}
          {productMatches && productMatches.length > 0 && (
            <div className="flex flex-col gap-4">
              {productMatches.map((product) => {
                const stat = statsForProduct(product.id);
                const isAvailable = product.sizes?.some((s) => s.stock > 0) ?? product.inStock;
                return (
                  <div key={product.id} className="flex gap-4 border border-outline-variant/30 rounded-lg p-4">
                    <ProductImage src={product.images?.[0] || product.image} alt={product.name || product.title} className="w-16 h-20 object-cover rounded-md shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h3 className="font-title-sm text-title-sm text-on-surface">{product.name || product.title}</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {product.category || product.categoryTitle} · {formatCurrency(product.price)} · {isAvailable ? 'In Stock' : 'Out of Stock'}
                          </p>
                        </div>
                        <Link to={`/product/${product.id}`} className="font-label-caps text-label-caps text-primary hover:underline">
                          View on Storefront
                        </Link>
                      </div>

                      {product.sizes && product.sizes.length > 0 && (
                        <div className="mt-3 p-3 bg-surface-container rounded-lg border border-outline-variant/25">
                          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mb-1 font-semibold">Live Stock Breakdown</p>
                          <div className="flex flex-wrap gap-2">
                            {product.sizes.map((s) => (
                              <span key={s.size} className="px-2.5 py-1 rounded-md bg-surface-container-high border border-outline-variant/20 font-mono text-[11px] text-on-surface">
                                Size {s.size}: <strong className={s.stock > 0 ? "text-primary" : "text-error"}>{s.stock} left</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 mt-3 font-body-sm text-body-sm border-t border-outline-variant/20 pt-3">
                        <div>
                          <p className="text-on-surface-variant">Units this week</p>
                          <p className="text-on-surface font-semibold">{stat?.unitsThisWeek ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-on-surface-variant">Units this month</p>
                          <p className="text-on-surface font-semibold">{stat?.unitsThisMonth ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-on-surface-variant">Revenue this month</p>
                          <p className="text-on-surface font-semibold">{formatCurrency(stat?.revenueThisMonth ?? 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Top / bottom performers */}
        <section id="sales-report" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-6">
          <ProductRankTable title="Top 10 Performing Products (30d)" rows={topProducts} emptyText="No sales recorded yet." />
          <ProductRankTable title="Top 10 Non-Performing Products (30d)" rows={bottomProducts} emptyText="No products to show." />
        </section>
      </main>
    </div>
  );
}
