import { PRODUCTS } from './products.js';

const productById = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const daysAgo = (days, hour = 12, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const line = (productId, quantity, overrides = {}) => {
  const product = productById[productId];
  return {
    id: `${productId}-mock`,
    title: product.name,
    price: product.price,
    quantity,
    image: product.image,
    alt: product.alt,
    color: null,
    size: null,
    ...overrides,
  };
};

const buildOrder = (id, daysBack, hour, customerName, status, itemsSpec) => {
  const items = itemsSpec.map(([productId, qty]) => line(productId, qty));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.18;
  return {
    id,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
    paymentMethod: 'Cash on Delivery',
    placedAt: daysAgo(daysBack, hour),
    shippingDetails: { firstName: customerName.split(' ')[0], lastName: customerName.split(' ')[1] ?? '' },
    status,
  };
};

// Seed order history, generated relative to "now" so the admin panel always
// has a realistic spread of today / this-week / this-month activity.
export const MOCK_ORDERS = [
  // Today
  buildOrder('ORD-2026-9001', 0, 9, 'Ananya Rao', 'Processing', [['regal-rani-pink-anarkali', 1]]),
  buildOrder('ORD-2026-9002', 0, 11, 'Meera Iyer', 'Processing', [['gulabi-anarkali-dress', 2]]),
  buildOrder('ORD-2026-9003', 0, 14, 'Kabir Singh', 'Shipped', [['mustard-silk-kurti-set', 1], ['crimson-silk-maxi', 1]]),
  buildOrder('ORD-2026-9004', 0, 17, 'Fatima Sheikh', 'Processing', [['dusty-rose-coord-set', 1]]),

  // Yesterday
  buildOrder('ORD-2026-8991', 1, 10, 'Rohan Mehta', 'Shipped', [['crimson-silk-maxi', 2]]),
  buildOrder('ORD-2026-8992', 1, 13, 'Sanya Kapoor', 'Delivered', [['gulabi-anarkali-dress', 1]]),
  buildOrder('ORD-2026-8993', 1, 18, 'Devika Nair', 'In Transit', [['emerald-silk-saree', 1]]),

  // Earlier this week
  buildOrder('ORD-2026-8981', 3, 12, 'Priya Sharma', 'Delivered', [['regal-rani-pink-anarkali', 1], ['mustard-silk-kurti-set', 1]]),
  buildOrder('ORD-2026-8982', 4, 15, 'Ishaan Verma', 'Delivered', [['dusty-rose-coord-set', 2]]),
  buildOrder('ORD-2026-8983', 5, 10, 'Neha Joshi', 'Delivered', [['mustard-silk-kurti-set', 1]]),
  buildOrder('ORD-2026-8984', 6, 16, 'Aditya Kulkarni', 'Cancelled', [['crimson-bridal-kanjivaram', 1]]),

  // Earlier this month
  buildOrder('ORD-2026-8971', 9, 11, 'Tanvi Desai', 'Delivered', [['gulabi-anarkali-dress', 1]]),
  buildOrder('ORD-2026-8972', 12, 14, 'Arjun Reddy', 'Delivered', [['emerald-zari-silk-saree', 1]]),
  buildOrder('ORD-2026-8973', 14, 9, 'Kavya Pillai', 'Delivered', [['crimson-silk-maxi', 1], ['regal-rani-pink-anarkali', 1]]),
  buildOrder('ORD-2026-8974', 16, 17, 'Yash Malhotra', 'Delivered', [['rose-quartz-lehenga', 1]]),
  buildOrder('ORD-2026-8975', 19, 12, 'Riya Bansal', 'Delivered', [['mustard-silk-kurti-set', 2]]),
  buildOrder('ORD-2026-8976', 21, 10, 'Vikram Chauhan', 'Delivered', [['dusty-rose-coord-set', 1]]),
  buildOrder('ORD-2026-8977', 24, 13, 'Simran Kaur', 'Delivered', [['gulabi-anarkali-dress', 1]]),
  buildOrder('ORD-2026-8978', 27, 15, 'Nikhil Bose', 'Cancelled', [['indigo-print-midi', 1]]),
  buildOrder('ORD-2026-8979', 29, 11, 'Zara Khan', 'Delivered', [['emerald-green-gown', 1]]),

  // Last month (context for month-over-month, not counted as "this month")
  buildOrder('ORD-2026-8961', 34, 12, 'Aarav Gupta', 'Delivered', [['bridal-heritage-lehenga', 1]]),
  buildOrder('ORD-2026-8962', 38, 10, 'Diya Menon', 'Delivered', [['crimson-bridal-kanjivaram', 1]]),
  buildOrder('ORD-2026-8963', 41, 14, 'Rahul Bhatt', 'Delivered', [['regal-rani-pink-anarkali', 1]]),
];
