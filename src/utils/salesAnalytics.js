const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const daysBetween = (date, now) => Math.floor((now - date) / MS_PER_DAY);

export function getOrdersToday(orders) {
  const now = new Date();
  return orders.filter((order) => isSameCalendarDay(new Date(order.placedAt), now));
}

export function getOrdersInLastDays(orders, days) {
  const now = new Date();
  return orders.filter((order) => daysBetween(new Date(order.placedAt), now) < days);
}

export function findOrderById(orders, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  return orders.find((order) => order.id.toLowerCase() === needle) ?? null;
}

export function searchProducts(products, query, limit = 5) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return products
    .filter(
      (p) =>
        p.id.toLowerCase().includes(needle) ||
        p.name.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle)
    )
    .slice(0, limit);
}

// Real cart line ids look like `${productId}-${color}-${size}`; seed data uses
// `${productId}-mock`; listing/storefront quick-add uses the bare productId.
// Resolve any of those shapes back to the catalog product they belong to.
function resolveProductId(lineId, products) {
  const exact = products.find((p) => p.id === lineId);
  if (exact) return exact.id;
  const prefixed = products.find((p) => lineId.startsWith(`${p.id}-`));
  return prefixed?.id ?? null;
}

export function getProductSalesStats(orders, products) {
  const statsById = Object.fromEntries(
    products.map((product) => [
      product.id,
      { product, unitsThisWeek: 0, unitsThisMonth: 0, revenueThisMonth: 0, unitsAllTime: 0, revenueAllTime: 0 },
    ])
  );

  const ordersThisWeek = new Set(getOrdersInLastDays(orders, 7).map((o) => o.id));
  const ordersThisMonth = new Set(getOrdersInLastDays(orders, 30).map((o) => o.id));

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const productId = resolveProductId(item.id, products);
      const stat = productId ? statsById[productId] : null;
      if (!stat) return;
      stat.unitsAllTime += item.quantity;
      stat.revenueAllTime += item.price * item.quantity;
      if (ordersThisMonth.has(order.id)) {
        stat.unitsThisMonth += item.quantity;
        stat.revenueThisMonth += item.price * item.quantity;
      }
      if (ordersThisWeek.has(order.id)) {
        stat.unitsThisWeek += item.quantity;
      }
    });
  });

  return Object.values(statsById);
}

export function getTopProducts(stats, n = 10) {
  return [...stats]
    .filter((s) => s.unitsThisMonth > 0)
    .sort((a, b) => b.unitsThisMonth - a.unitsThisMonth || b.revenueThisMonth - a.revenueThisMonth)
    .slice(0, n);
}

export function getBottomProducts(stats, n = 10) {
  return [...stats]
    .sort((a, b) => a.unitsThisMonth - b.unitsThisMonth || a.revenueThisMonth - b.revenueThisMonth)
    .slice(0, n);
}

export function getWeekSalesSummary(orders) {
  const ordersThisWeek = getOrdersInLastDays(orders, 7);
  const unitsSold = ordersThisWeek.reduce(
    (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
    0
  );
  const revenue = ordersThisWeek.reduce((sum, order) => sum + order.subtotal, 0);
  return { orderCount: ordersThisWeek.length, unitsSold, revenue };
}
