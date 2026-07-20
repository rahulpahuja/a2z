import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart } from 'chart.js/auto';
import { subscribeToOrders } from '../services/orders.js';
import { subscribeToAdminProducts } from '../services/adminProducts.js';
import { MOCK_ORDERS } from '../data/mockOrders.js';
import { formatCurrency } from '../context/CartContext.jsx';
import './DashboardPage.css';

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', active: true },
  { icon: 'inventory_2', label: 'Product Management' },
  { icon: 'smart_display', label: 'Video Management' },
  { icon: 'shopping_bag', label: 'Order Management' },
  { icon: 'group', label: 'Customer Management' },
  { icon: 'bar_chart', label: 'Inventory Tracking' },
  { icon: 'insights', label: 'Analytics' },
  { icon: 'settings', label: 'Settings' },
];

// A product counts as low stock once its total units across all sizes drop
// to this level or below.
const LOW_STOCK_THRESHOLD = 5;

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

function computeTrend(current, previous) {
  if (previous <= 0) return { pct: current > 0 ? 100 : 0, positive: current >= 0 };
  const pct = ((current - previous) / previous) * 100;
  return { pct, positive: pct >= 0 };
}

const STATUS_BADGE_CLASSES = {
  Delivered: 'bg-secondary-container text-on-secondary-container',
  Cancelled: 'bg-error-container text-on-error-container',
};
const DEFAULT_STATUS_BADGE_CLASS = 'bg-surface-variant text-on-surface-variant';

export default function DashboardPage() {
  const salesChartRef = useRef(null);
  const productsChartRef = useRef(null);
  const salesChartInst = useRef(null);
  const productsChartInst = useRef(null);

  const [liveOrders, setLiveOrders] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((rows) => setLiveOrders(rows || []));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAdminProducts((rows) => setProducts(rows || []));
    return unsubscribe;
  }, []);

  // Merge live and mock orders, same convention as Sales Management, so a
  // fresh store isn't staring at an empty dashboard.
  const allOrders = useMemo(() => {
    const merged = [...liveOrders];
    MOCK_ORDERS.forEach((mockOrder) => {
      if (!merged.some((o) => o.id === mockOrder.id)) {
        merged.push(mockOrder);
      }
    });
    return merged.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  }, [liveOrders]);

  const stats = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const todayCount = allOrders.filter((o) => isSameDay(new Date(o.placedAt), now)).length;
    const yesterdayCount = allOrders.filter((o) => isSameDay(new Date(o.placedAt), yesterday)).length;
    const ordersTrend = computeTrend(todayCount, yesterdayCount);

    // Cancelled orders never generated revenue — excluded here exactly like
    // Sales Management, so a cancellation adjusts this dashboard too.
    const revenueOrders = allOrders.filter((o) => o.status !== 'Cancelled');
    const revenueThisMonth = revenueOrders
      .filter((o) => isSameMonth(new Date(o.placedAt), now))
      .reduce((sum, o) => sum + o.total, 0);
    const revenueLastMonth = revenueOrders
      .filter((o) => isSameMonth(new Date(o.placedAt), lastMonth))
      .reduce((sum, o) => sum + o.total, 0);
    const revenueTrend = computeTrend(revenueThisMonth, revenueLastMonth);

    const pendingShipments = allOrders.filter((o) => o.status === 'Processing').length;

    const lowStockCount = products.filter((p) => {
      const totalStock = (p.sizes || []).reduce((sum, s) => sum + (s.stock || 0), 0);
      return totalStock <= LOW_STOCK_THRESHOLD;
    }).length;

    // Rolling last 7 days, oldest to newest, revenue excluding cancelled.
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const total = revenueOrders
        .filter((o) => isSameDay(new Date(o.placedAt), day))
        .reduce((sum, o) => sum + o.total, 0);
      dailyRevenue.push({ label: day.toLocaleDateString('en-IN', { weekday: 'short' }), total });
    }

    // Units sold by category (excluding cancelled orders), top 4.
    const categoryUnits = {};
    revenueOrders.forEach((o) => {
      o.items.forEach((item) => {
        const cat = item.category || 'Apparel';
        categoryUnits[cat] = (categoryUnits[cat] || 0) + item.quantity;
      });
    });
    const topCategories = Object.entries(categoryUnits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      todayCount,
      ordersTrend,
      revenueThisMonth,
      revenueTrend,
      pendingShipments,
      lowStockCount,
      dailyRevenue,
      topCategories,
      recentOrders: allOrders.slice(0, 5),
    };
  }, [allOrders, products]);

  useEffect(() => {
    const canvas = salesChartRef.current;
    if (!canvas) return undefined;

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#ac2471';
    const surfaceColor = '#fcf9f8';
    const onSurfaceColor = '#1c1b1b';
    const gridColor = '#e5e2e1'; // outline-variant

    const ctxSales = canvas.getContext('2d');

    const gradient = ctxSales.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, primaryColor + '33');
    gradient.addColorStop(1, primaryColor + '00');

    if (salesChartInst.current) salesChartInst.current.destroy();
    salesChartInst.current = new Chart(ctxSales, {
      type: 'line',
      data: {
        labels: stats.dailyRevenue.map((d) => d.label),
        datasets: [
          {
            label: 'Revenue (₹)',
            data: stats.dailyRevenue.map((d) => d.total),
            borderColor: primaryColor,
            backgroundColor: gradient,
            borderWidth: 3,
            pointBackgroundColor: surfaceColor,
            pointBorderColor: primaryColor,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: onSurfaceColor,
            titleFont: { family: 'Montserrat', size: 12 },
            bodyFont: { family: 'Montserrat', size: 14, weight: 'bold' },
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function (context) {
                return '₹' + context.parsed.y.toLocaleString();
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor, drawBorder: false },
            ticks: {
              font: { family: 'Montserrat', size: 12 },
              color: '#564149',
              callback: function (value) {
                return '₹' + value / 1000 + 'k';
              },
            },
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              font: { family: 'Montserrat', size: 12 },
              color: '#564149',
            },
          },
        },
      },
    });

    return () => salesChartInst.current?.destroy();
  }, [stats.dailyRevenue]);

  useEffect(() => {
    const canvas = productsChartRef.current;
    if (!canvas) return undefined;

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#ac2471';
    const secondaryColor = '#486730';
    const tertiaryColor = '#7a5642';
    const onSurfaceColor = '#1c1b1b';
    const gridColor = '#e5e2e1';
    const palette = [primaryColor, tertiaryColor, secondaryColor, '#ffb0d0'];

    const ctxProducts = canvas.getContext('2d');

    if (productsChartInst.current) productsChartInst.current.destroy();
    productsChartInst.current = new Chart(ctxProducts, {
      type: 'bar',
      data: {
        labels: stats.topCategories.map(([label]) => label),
        datasets: [
          {
            label: 'Units Sold',
            data: stats.topCategories.map(([, qty]) => qty),
            backgroundColor: stats.topCategories.map((_, i) => palette[i % palette.length]),
            borderRadius: 6,
            barThickness: 24,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: onSurfaceColor,
            titleFont: { family: 'Montserrat', size: 12 },
            bodyFont: { family: 'Montserrat', size: 14, weight: 'bold' },
            padding: 12,
            displayColors: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor, drawBorder: false },
            ticks: {
              font: { family: 'Montserrat', size: 12 },
              color: '#564149',
            },
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              font: { family: 'Montserrat', size: 12 },
              color: '#564149',
            },
          },
        },
      },
    });

    return () => productsChartInst.current?.destroy();
  }, [stats.topCategories]);

  const kpiCards = [
    {
      icon: 'shopping_bag',
      iconBg: 'bg-secondary-container',
      iconColor: 'text-on-secondary-container',
      badge: `${Math.round(stats.ordersTrend.pct)}%`,
      badgeIcon: stats.ordersTrend.positive ? 'trending_up' : 'trending_down',
      badgeColor: stats.ordersTrend.positive ? 'text-secondary' : 'text-error',
      label: 'Total Orders (Today)',
      value: String(stats.todayCount),
    },
    {
      icon: 'payments',
      iconBg: 'bg-primary-container',
      iconColor: 'text-on-primary-container',
      badge: `${Math.round(stats.revenueTrend.pct)}%`,
      badgeIcon: stats.revenueTrend.positive ? 'trending_up' : 'trending_down',
      badgeColor: stats.revenueTrend.positive ? 'text-secondary' : 'text-error',
      label: 'Revenue (Month)',
      value: formatCurrency(stats.revenueThisMonth),
      valueExtraClass: 'font-price-display',
    },
    {
      icon: 'local_shipping',
      iconBg: 'bg-tertiary-container',
      iconColor: 'text-on-tertiary-container',
      badge: 'Needs Action',
      badgeIcon: 'error',
      badgeColor: 'text-error',
      label: 'Pending Shipments',
      value: String(stats.pendingShipments),
    },
    {
      icon: 'inventory',
      iconBg: 'bg-error-container',
      iconColor: 'text-on-error-container',
      badge: 'View Details',
      badgeIcon: 'chevron_right',
      badgeColor: 'text-on-surface-variant',
      badgeIconAfter: true,
      label: 'Low Stock Items',
      value: String(stats.lowStockCount),
    },
  ];

  return (
    <div className="bg-surface text-on-surface font-body-lg flex h-screen overflow-hidden antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-[250px] bg-surface-container border-r border-outline-variant flex flex-col h-full shrink-0">
        <div className="p-gutter border-b border-outline-variant flex items-center h-[72px]">
          <Link to="/" className="font-headline-md text-headline-md text-primary">A2Z</Link>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-unit py-gutter">
          <ul className="space-y-unit">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  className={
                    item.active
                      ? 'flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-container text-on-primary-container group'
                      : 'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors group'
                  }
                  href="#"
                >
                  <span
                    className="material-symbols-outlined"
                    style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-caps text-label-caps">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-gutter border-t border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary">
              <span className="font-label-caps text-label-caps">AD</span>
            </div>
            <div>
              <p className="font-title-sm text-title-sm text-on-surface">Admin User</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Store Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* Top App Bar */}
        <header className="h-[72px] bg-surface border-b border-outline-variant flex items-center justify-between px-gutter shrink-0">
          <h2 className="font-headline-md text-headline-md text-on-surface">Dashboard Overview</h2>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
            </button>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-surface-container border-none rounded-full font-body-sm text-body-sm focus:ring-2 focus:ring-primary w-64 text-on-surface placeholder:text-on-surface-variant"
                placeholder="Search orders, products..."
                type="text"
              />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter space-y-gutter">
          {/* Welcome Header Section */}
          <div className="flex justify-between items-end">
            <div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-1">Welcome back, Admin</p>
              <p className="font-title-sm text-title-sm text-on-surface">
                Here's what's happening with your store today.
              </p>
            </div>
            <button className="bg-primary hover:bg-surface-tint text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-[12px] transition-colors flex items-center gap-2 shadow-[0px_4px_10px_rgba(172,36,113,0.2)]">
              <span className="material-symbols-outlined text-[18px]">add</span>
              NEW PRODUCT
            </button>
          </div>

          {/* KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {kpiCards.map((kpi) => (
              <div
                key={kpi.label}
                className="bg-surface-container-low rounded-xl p-6 border border-[#DCAE96]/30 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`w-10 h-10 rounded-full ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor}`}
                  >
                    <span className="material-symbols-outlined">{kpi.icon}</span>
                  </div>
                  <span className={`font-label-caps text-label-caps ${kpi.badgeColor} flex items-center gap-1`}>
                    {kpi.badgeIconAfter ? (
                      <>
                        {kpi.badge} <span className="material-symbols-outlined text-[14px]">{kpi.badgeIcon}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[14px]">{kpi.badgeIcon}</span> {kpi.badge}
                      </>
                    )}
                  </span>
                </div>
                <div>
                  <h3 className="font-body-sm text-body-sm text-on-surface-variant mb-1">{kpi.label}</h3>
                  <p
                    className={`font-display-lg-mobile text-display-lg-mobile text-on-surface ${kpi.valueExtraClass || ''}`}
                  >
                    {kpi.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {/* Main Chart: Sales Trend */}
            <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-title-sm text-title-sm text-on-surface">Sales Trend</h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Last 7 Days</span>
              </div>
              <div className="h-[300px] w-full relative">
                <canvas ref={salesChartRef}></canvas>
              </div>
            </div>

            {/* Secondary Chart: Top Products */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-title-sm text-title-sm text-on-surface">Top Categories</h3>
              </div>
              <div className="flex-1 w-full relative">
                <canvas ref={productsChartRef}></canvas>
              </div>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-title-sm text-title-sm text-on-surface">Recent Orders</h3>
              <Link className="font-label-caps text-label-caps text-primary hover:underline" to="/super/sales">
                VIEW ALL
              </Link>
            </div>
            <div className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface-variant font-label-caps text-label-caps border-b border-outline-variant">
                    <th className="py-3 px-6 font-semibold">Order ID</th>
                    <th className="py-3 px-6 font-semibold">Customer</th>
                    <th className="py-3 px-6 font-semibold">Status</th>
                    <th className="py-3 px-6 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface">
                  {stats.recentOrders.length === 0 ? (
                    <tr>
                      <td className="py-6 px-6 text-on-surface-variant" colSpan={4}>
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    stats.recentOrders.map((order, index) => {
                      const firstName = order.shippingDetails?.firstName || '';
                      const lastName = order.shippingDetails?.lastName || '';
                      const customer = `${firstName} ${lastName}`.trim() || 'Guest';
                      const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '??';
                      return (
                        <tr
                          key={order.id}
                          className={
                            index < stats.recentOrders.length - 1
                              ? 'border-b border-outline-variant hover:bg-surface-container-low transition-colors'
                              : 'hover:bg-surface-container-low transition-colors'
                          }
                        >
                          <td className="py-4 px-6 font-medium">{order.id}</td>
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant text-xs">
                              {initials}
                            </div>
                            {customer}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-block px-3 py-1 rounded-full ${STATUS_BADGE_CLASSES[order.status] || DEFAULT_STATUS_BADGE_CLASS} text-xs font-semibold`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-price-display text-[16px]">
                            {formatCurrency(order.total)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
