import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { useProducts } from '../../context/ProductsContext.jsx';
import { subscribeToAllProductStats } from '../../services/productStats.js';

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
  // approach AdminSalesPage uses for orders.
  const report = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const dayKeys = Array.from(
      { length: daysInMonth(year, monthNum) },
      (_, i) => `${year}-${String(monthNum).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    );

    const perProduct = [];
    const referrerTotals = {};
    let totalViews = 0;

    Object.entries(statsTree).forEach(([productId, stat]) => {
      const daily = stat?.daily || {};
      let productViews = 0;
      const productReferrers = {};
      dayKeys.forEach((day) => {
        const dayStat = daily[day];
        if (!dayStat) return;
        productViews += dayStat.views || 0;
        Object.entries(dayStat.referrers || {}).forEach(([refName, count]) => {
          productReferrers[refName] = (productReferrers[refName] || 0) + count;
          referrerTotals[refName] = (referrerTotals[refName] || 0) + count;
        });
      });
      if (productViews === 0) return;
      totalViews += productViews;
      const topReferrer = Object.entries(productReferrers).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      perProduct.push({
        productId,
        title: productTitleById.get(productId) || productId,
        views: productViews,
        topReferrer,
        allTimeViews: stat?.views || 0,
      });
    });

    perProduct.sort((a, b) => b.views - a.views);
    const topReferrers = Object.entries(referrerTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);

    return { perProduct, topReferrers, totalViews };
  }, [statsTree, month, productTitleById]);

  useEffect(() => {
    if (!referrerChartRef.current) return undefined;
    if (referrerChartInst.current) {
      referrerChartInst.current.destroy();
      referrerChartInst.current = null;
    }
    if (report.topReferrers.length > 0) {
      const ctx = referrerChartRef.current.getContext('2d');
      referrerChartInst.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: report.topReferrers.map(([name]) => name),
          datasets: [
            {
              data: report.topReferrers.map(([, count]) => count),
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
  }, [report.topReferrers]);

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
              <p className="admin-card-subtitle">Ranked by views this month.</p>
            </div>
            {report.perProduct.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant/60 flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/50 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-outline-variant">visibility</span>
                <p className="font-body-lg font-semibold">No views recorded for this month</p>
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
                    {report.perProduct.map((row) => (
                      <tr key={row.productId}>
                        <td>{row.title}</td>
                        <td>{row.views}</td>
                        <td>{row.topReferrer}</td>
                        <td>{row.allTimeViews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-card flex flex-col min-h-[340px]">
            <div className="mb-4">
              <h2 className="admin-card-title">Top Referrers</h2>
              <p className="admin-card-subtitle">Where views came from this month.</p>
            </div>
            {report.topReferrers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant text-[13px]">
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
