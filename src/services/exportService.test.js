import { describe, it, expect } from 'vitest';
import { ordersToCsvRows, ordersToCsv, ordersCsvFilename, ORDER_CSV_COLUMNS } from './exportService.js';

const fullOrder = {
  id: 'A2Z-1042',
  items: [
    { title: 'Floral Kurti', color: 'Blue', size: 'M', quantity: 2, price: 799 },
    { title: 'Silk Dupatta', quantity: 1, price: 499 },
  ],
  subtotal: 2097,
  couponCode: 'WELCOME10',
  discount: 209.7,
  tax: 94.37,
  total: 1981.67,
  paymentMethod: 'Razorpay',
  paymentId: 'pay_Nx12345',
  placedAt: '2026-03-04T05:06:07.000Z',
  status: 'Shipped',
  trackingId: 'SP123456',
  trackingPartner: 'ShipPrime',
  customerId: 'uid-secret',
  shippingDetails: {
    firstName: 'Priya',
    lastName: 'Sharma',
    address: '12 MG Road',
    city: 'Pune',
    state: 'MH',
    zip: '411001',
    phone: '9876543210',
  },
};

describe('ordersToCsvRows', () => {
  it('maps a fully populated order', () => {
    const [row] = ordersToCsvRows([fullOrder]);
    expect(row).toEqual({
      orderId: 'A2Z-1042',
      placedAt: '2026-03-04T05:06:07.000Z',
      customerName: 'Priya Sharma',
      phone: '9876543210',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      items: 'Floral Kurti x 2 (Blue, M); Silk Dupatta x 1',
      subtotal: 2097,
      discount: 209.7,
      couponCode: 'WELCOME10',
      tax: 94.37,
      total: 1981.67,
      paymentMethod: 'Razorpay',
      paymentId: 'pay_Nx12345',
      status: 'Shipped',
      trackingId: 'SP123456',
      trackingPartner: 'ShipPrime',
    });
  });

  it('tolerates a minimal order (no shipping, items, coupon or tracking)', () => {
    const [row] = ordersToCsvRows([{ id: 'A2Z-1', total: 100, status: 'Processing', couponCode: null, paymentId: null }]);
    expect(row.orderId).toBe('A2Z-1');
    expect(row.customerName).toBe('');
    expect(row.items).toBe('');
    expect(row.couponCode).toBe('');
    expect(row.paymentId).toBe('');
    expect(row.trackingId).toBe('');
    expect(row.subtotal).toBe('');
    expect(row.total).toBe(100);
  });

  it('keeps an unknown state value as-is and handles a single-name customer', () => {
    const [row] = ordersToCsvRows([{ id: 'x', shippingDetails: { firstName: 'Asha', state: 'Narnia' } }]);
    expect(row.state).toBe('Narnia');
    expect(row.customerName).toBe('Asha');
  });

  it('emits an empty date for a missing or invalid placedAt, and ISO for a parseable one', () => {
    const rows = ordersToCsvRows([{ id: 'a' }, { id: 'b', placedAt: 'not a date' }, { id: 'c', placedAt: 1772600767000 }]);
    expect(rows[0].placedAt).toBe('');
    expect(rows[1].placedAt).toBe('');
    expect(rows[2].placedAt).toBe(new Date(1772600767000).toISOString());
  });

  it('coerces numeric strings and blanks non-numeric amounts', () => {
    const [row] = ordersToCsvRows([{ id: 'a', subtotal: '500', tax: 'abc', discount: null }]);
    expect(row.subtotal).toBe(500);
    expect(row.tax).toBe('');
    expect(row.discount).toBe('');
  });

  it('does not leak fields outside the column set (e.g. customerId)', () => {
    const [row] = ordersToCsvRows([fullOrder]);
    const keys = ORDER_CSV_COLUMNS.map((c) => c.key);
    expect(Object.keys(row).sort()).toEqual([...keys].sort());
  });

  it('returns an empty array for nullish input', () => {
    expect(ordersToCsvRows(null)).toEqual([]);
    expect(ordersToCsvRows(undefined)).toEqual([]);
  });
});

describe('ordersToCsv', () => {
  it('produces a header and one record per order, with no currency formatting', () => {
    const lines = ordersToCsv([fullOrder]).replace(/^﻿/, '').split('\r\n');
    expect(lines[0]).toBe(
      'Order ID,Placed At (ISO 8601),Customer Name,Phone,City,State,Pincode,Items,Subtotal,Discount,Coupon Code,Tax,Total,Payment Method,Payment ID,Status,Tracking ID,Tracking Partner'
    );
    expect(lines[1]).toBe(
      'A2Z-1042,2026-03-04T05:06:07.000Z,Priya Sharma,9876543210,Pune,Maharashtra,411001,"Floral Kurti x 2 (Blue, M); Silk Dupatta x 1",2097,209.7,WELCOME10,94.37,1981.67,Razorpay,pay_Nx12345,Shipped,SP123456,ShipPrime'
    );
    expect(lines).toHaveLength(2);
  });

  it('neutralises formula payloads supplied by customers', () => {
    const evil = { ...fullOrder, shippingDetails: { ...fullOrder.shippingDetails, firstName: '=HYPERLINK("http://evil")', lastName: '' } };
    const csv = ordersToCsv([evil]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).not.toMatch(/,=HYPERLINK/);
  });

  it('exports Hindi names and keeps the item summary intact', () => {
    const hindi = { ...fullOrder, shippingDetails: { ...fullOrder.shippingDetails, firstName: 'प्रिया', lastName: 'शर्मा' } };
    expect(ordersToCsv([hindi])).toContain('प्रिया शर्मा');
  });

  it('returns just the BOM and header for no orders', () => {
    const csv = ordersToCsv([]);
    expect(csv.startsWith('﻿Order ID,')).toBe(true);
    expect(csv).not.toContain('\r\n');
  });
});

describe('ordersCsvFilename', () => {
  it('formats the local date as orders-YYYY-MM-DD.csv with zero padding', () => {
    expect(ordersCsvFilename(new Date(2026, 0, 5, 23, 59))).toBe('orders-2026-01-05.csv');
    expect(ordersCsvFilename(new Date(2026, 10, 30))).toBe('orders-2026-11-30.csv');
  });
});
