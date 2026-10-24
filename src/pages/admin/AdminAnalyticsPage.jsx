import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { useProducts } from '../../context/ProductsContext.jsx';
import { subscribeToAllProductStats } from '../../services/productStats.js';
import { CHANNELS, classifyReferrer, getChannel } from '../../utils/referrerChannels.js';
import './AdminAnalyticsPage.css';

const REFERRER_COLORS = ['#ac2471', '#486730', '#7a5642', '#c1967f', '#e5989b', '#5c6bc0', '#26a69a', '#ff8a65'];

const currentMonthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export default function AdminAnalyticsPage() {
  const { products } = useProducts();
  const [statsTree, setStatsTree] = useState({});
  const [month, setMonth] = useState(currentMonthValue);
  const [channel, setChannel] = useState('all');
  const referrerChartRef = useRef(null);
  const referrerChartInst = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllProductStats(setStatsTree);
    return unsubscribe;
  }, []);

  const productTitleById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p.title || p.name || p.id));
    return map;
  }, [products]);

  // Rolls the day-bucketed view/referrer counters (see recordView in
  // services/productStats.js) up into per-product and sitewide totals for
  // the selected calendar month — same load-the-whole-tree-then-aggregate
  // approach AdminSalesPage uses for orders. Every referrer is also grouped
  // into a channel (utils/referrerChannels.js) so the tables can be filtered.
  const report = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const dayKeys = Array.from(
      { length: daysInMonth(year, monthNum) },
      (_, i) => `${year}-${String(monthNum).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    );

    const perProduct = [];
    const channelTotals = {};
    let totalViews = 0;

    Object.entries(statsTree).forEach(([productId, stat]) => {
      const daily = stat?.daily || {};
      let productViews = 0;
      let attributed = 0;
      const referrers = {}; // referrer -> views this month
      dayKeys.forEach((day) => {
        const dayStat = daily[day];
        if (!dayStat) return;
        productViews += dayStat.views || 0;
        Object.entries(dayStat.referrers || {}).forEach(([refName, count]) => {
          referrers[refName] = (referrers[refName] || 0) + count;
          attributed += count;
        });
      });
      if (productViews === 0) return;
      totalViews += productViews;

      // Views with no referrer breakdown (recorded before referrers were tracked).
      const unattributed = Math.max(0, productViews - attributed);

      const byChannel = {};
      Object.entries(referrers).forEach(([refName, count]) => {
        const channel = classifyReferrer(refName);
        const entry = (byChannel[channel] ||= { views: 0, referrers: {} });
        entry.views += count;
        entry.referrers[refName] = (entry.referrers[refName] || 0) + count;
        channelTotals[channel] = (channelTotals[channel] || 0) + count;
      });
      if (unattributed > 0) {
        byChannel.unattributed = { views: unattributed, referrers: {} };
        channelTotals.unattributed = (channelTotals.unattributed || 0) + unattributed;
      }

      // All-time referrer counters, grouped the same way.
      const allTimeByChannel = {};
      let allTimeAttributed = 0;
      Object.entries(stat?.referrers || {}).forEach(([refName, count]) => {
        const channel = classifyReferrer(refName);
        allTimeByChannel[channel] = (allTimeByChannel[channel] || 0) + count;
        allTimeAttributed += count;
      });
      const allTimeUnattributed = Math.max(0, (stat?.views || 0) - allTimeAttributed);
      if (allTimeUnattributed > 0) allTimeByChannel.unattributed = allTimeUnattributed;

      perProduct.push({
        productId,
        title: productTitleById.get(productId) || productId,
        views: productViews,
        referrers,
        byChannel,
        allTimeViews: stat?.views || 0,
        allTimeByChannel,
      });
    });

    return { perProduct, channelTotals, totalViews };
  }, [statsTree, month, productTitleById]);

  // The channel tabs: "All", then each channel that has views this month.
  const channelTabs = useMemo(
    () => [
      { id: 'all', label: 'All channels', icon: 'select_all', count: report.totalViews },
      ...CHANNELS.filter((c) => (report.channelTotals[c.id] || 0) > 0).map((c) => ({
        ...c,
        count: report.channelTotals[c.id],
      })),
    ],
    [report]
  );

  // A selected channel can disappear when the month changes; fall back to "All".
  const activeChannel = channelTabs.some((t) => t.id === channel) ? channel : 'all';

  const view = useMemo(() => {
    const rows = [];
    const referrerTotals = {};
    report.perProduct.forEach((row) => {
      const refs = activeChannel === 'all' ? row.referrers : row.byChannel[activeChannel]?.referrers || {};
      const views = activeChannel === 'all' ? row.views : row.byChannel[activeChannel]?.views || 0;
      if (views === 0) return;
      Object.entries(refs).forEach(([name, count]) => {
        referrerTotals[name] = (referrerTotals[name] || 0) + count;
      });
      const topRef = Object.entries(refs).sort((a, b) => b[1] - a[1])[0]?.[0];
      rows.push({
        productId: row.productId,
        title: row.title,
        views,
        topReferrer: topRef || (activeChannel === 'unattributed' || activeChannel === 'all' ? '—' : '—'),
        topChannel: topRef ? classifyReferrer(topRef) : 'unattributed',
        allTimeViews: activeChannel === 'all' ? row.allTimeViews : row.allTimeByChannel[activeChannel] || 0,
      });
    });
    rows.sort((a, b) => b.views - a.views);
    const topReferrers = Object.entries(referrerTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { rows, topReferrers, totalViews: rows.reduce((sum, r) => sum + r.views, 0) };
  }, [report, activeChannel]);

  const onTabKeyDown = (event, index) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = channelTabs[(index + step + channelTabs.length) % channelTabs.length];
    setChannel(next.id);
    document.getElementById(`channel-tab-${next.id}`)?.focus();
  };

  useEffect(() => {
    if (!referrerChartRef.current) return undefined;
    if (referrerChartInst.current) {
      referrerChartInst.current.destroy();
      referrerChartInst.current = null;
    }
    if (view.topReferrers.length > 0) {
      const ctx = referrerChartRef.current.getContext('2d');
      referrerChartInst.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: view.topReferrers.map(([name]) => name),
          datasets: [
            {
              data: view.topReferrers.map(([, count]) => count),
              backgroundColor: REFERRER_COLORS,
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 10 } },
          },
        },
      });
    }
    return () => {
      if (referrerChartInst.current) {
        referrerChartInst.current.destroy();
        referrerChartInst.current = null;
      }
    };
  }, [view.topReferrers]);

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Analytics</h1>
        <p className="admin-page-subtitle">
          Product views and where visitors came from, for the selected month. Referrer is the linking site's domain,
          or the <code>utm_source</code> value when a view arrives via a tagged marketing link; same-site navigation
          and views with no referrer both count as "direct."
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        <section className="admin-card flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="admin-card-title">Overview</h2>
              <p className="admin-card-subtitle">{report.totalViews} total product views this month.</p>
            </div>
            <div className="form-group admin-form-group--tight">
              <label className="form-label" htmlFor="analytics-month">
                Month
              </label>
              <input
                id="analytics-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 admin-card flex flex-col gap-4">
            <div>
              <h2 className="admin-card-title">Product Views</h2>
              <p className="admin-card-subtitle">
                Ranked by views this month
                {activeChannel === 'all' ? '.' : ` from ${getChannel(activeChannel).label}.`}
              </p>
            </div>
            <div className="channel-tabs" role="tablist" aria-label="Filter by referrer channel">
              {channelTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  id={`channel-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeChannel === tab.id}
                  aria-controls="channel-panel"
                  tabIndex={activeChannel === tab.id ? 0 : -1}
                  className={`channel-tab${activeChannel === tab.id ? ' channel-tab--active' : ''}`}
                  onClick={() => setChannel(tab.id)}
                  onKeyDown={(e) => onTabKeyDown(e, index)}
                >
                  <span className="material-symbols-outlined channel-tab__icon" aria-hidden="true">
                    {tab.icon}
                  </span>
                  <span className="channel-tab__label">{tab.label}</span>
                  <span className="channel-tab__count">{tab.count}</span>
                </button>
              ))}
            </div>
            <div id="channel-panel" role="tabpanel" aria-labelledby={`channel-tab-${activeChannel}`}>
            {view.rows.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant/60 flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/50 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-outline-variant">visibility</span>
                <p className="font-body-lg font-semibold">
                  {activeChannel === 'all' ? 'No views recorded for this month' : 'No views from this channel this month'}
                </p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Views (Month)</th>
                      <th>Top Referrer</th>
                      <th>All-Time Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((row) => (
                      <tr key={row.productId}>
                        <td>{row.title}</td>
                        <td>{row.views}</td>
                        <td>
                          <span className="referrer-cell">
                            <span
                              className="material-symbols-outlined referrer-cell__icon"
                              aria-label={getChannel(row.topChannel).label}
                              title={getChannel(row.topChannel).label}
                              role="img"
                            >
                              {getChannel(row.topChannel).icon}
                            </span>
                            {row.topReferrer}
                          </span>
                        </td>
                        <td>{row.allTimeViews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </section>

          <section className="admin-card flex flex-col min-h-[340px]">
            <div className="mb-4">
              <h2 className="admin-card-title">Top Referrers</h2>
              <p className="admin-card-subtitle">
                Where views came from this month{activeChannel === 'all' ? '' : ` (${getChannel(activeChannel).label})`}.
              </p>
            </div>
            {view.topReferrers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant text-[0.8125rem]">
                No referrer data yet.
              </div>
            ) : (
              <div className="flex-1 relative">
                <canvas ref={referrerChartRef}></canvas>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
