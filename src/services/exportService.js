import { toCsv } from '../utils/csv.js';
import { INDIAN_STATES_AND_UT } from '../data/indiaData.js';

// Admin data exports. Everything here is a pure function over orders already
// loaded in memory (the Sales page's `subscribeToOrders` data) — it performs
// no reads or writes of its own.
//
// Order shape (see CartContext.placeOrder): id, items[{title, color, size,
// quantity, price}], subtotal, discount, couponCode, tax, total,
// paymentMethod, paymentId, placedAt, status, shippingDetails{firstName,
// lastName, phone, city, state (2-letter code), zip}, and — once set from the
// Sales page — trackingId and trackingPartner.

const STATE_NAME_BY_CODE = new Map(INDIAN_STATES_AND_UT.map((s) => [s.code, s.name]));

function toIsoDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function toAmount(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : '';
}

// "Kurti x 2 (Blue, M)" — the variant part is omitted when neither is set.
function summariseItem(item) {
  const variant = [item?.color, item?.size].filter(Boolean).join(', ');
  const base = `${item?.title ?? 'Item'} x ${item?.quantity ?? 1}`;
  return variant ? `${base} (${variant})` : base;
}

export const ORDER_CSV_COLUMNS = [
  { header: 'Order ID', key: 'orderId' },
  { header: 'Placed At (ISO 8601)', key: 'placedAt' },
  { header: 'Customer Name', key: 'customerName' },
  { header: 'Phone', key: 'phone' },
  { header: 'City', key: 'city' },
  { header: 'State', key: 'state' },
  { header: 'Pincode', key: 'pincode' },
  { header: 'Items', key: 'items' },
  { header: 'Subtotal', key: 'subtotal', numeric: true },
  { header: 'Discount', key: 'discount', numeric: true },
  { header: 'Coupon Code', key: 'couponCode' },
  { header: 'Tax', key: 'tax', numeric: true },
  { header: 'Total', key: 'total', numeric: true },
  { header: 'Payment Method', key: 'paymentMethod' },
  { header: 'Payment ID', key: 'paymentId' },
  { header: 'Status', key: 'status' },
  { header: 'Tracking ID', key: 'trackingId' },
  { header: 'Tracking Partner', key: 'trackingPartner' },
];

/** Maps orders to flat row objects keyed as in ORDER_CSV_COLUMNS. Amounts are raw numbers (no currency symbol). */
export function ordersToCsvRows(orders) {
  return (orders ?? []).map((order) => {
    const ship = order?.shippingDetails ?? {};
    return {
      orderId: order?.id ?? '',
      placedAt: toIsoDate(order?.placedAt),
      customerName: [ship.firstName, ship.lastName].filter(Boolean).join(' '),
      phone: ship.phone ?? '',
      city: ship.city ?? '',
      state: STATE_NAME_BY_CODE.get(ship.state) ?? ship.state ?? '',
      pincode: ship.zip ?? '',
      items: (Array.isArray(order?.items) ? order.items : []).map(summariseItem).join('; '),
      subtotal: toAmount(order?.subtotal),
      discount: toAmount(order?.discount),
      couponCode: order?.couponCode ?? '',
      tax: toAmount(order?.tax),
      total: toAmount(order?.total),
      paymentMethod: order?.paymentMethod ?? '',
      paymentId: order?.paymentId ?? '',
      status: order?.status ?? '',
      trackingId: order?.trackingId ?? '',
      trackingPartner: order?.trackingPartner ?? '',
    };
  });
}

export function ordersToCsv(orders) {
  return toCsv(ordersToCsvRows(orders), ORDER_CSV_COLUMNS);
}

/** `orders-YYYY-MM-DD.csv` using the viewer's local calendar date. */
export function ordersCsvFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `orders-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
}
