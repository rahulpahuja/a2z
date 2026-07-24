import { jsPDF } from 'jspdf';
import { STORE_NAME, GST_NUMBER } from '../config/store.js';
import { formatCurrency } from '../context/CartContext.jsx';
import { getStoreSettingsOnce } from '../services/storeSettings.js';
import { getBillTemplateOnce, DEFAULT_BILL_TEMPLATE } from '../services/billTemplate.js';

const PAGE_FORMATS = {
  a4: { format: 'a4', width: 595 },
  a5: { format: 'a5', width: 420 },
  letter: { format: 'letter', width: 612 },
  thermal80: { format: [226, 900], width: 226 },
  thermal58: { format: [164, 700], width: 164 },
};

const ITEM_VALUE = {
  item: (item) => [item.title, item.color, item.size].filter(Boolean).join(' · '),
  qty: (item) => String(item.quantity),
  price: (item) => formatCurrency(item.price),
  total: (item) => formatCurrency(item.price * item.quantity),
};

export async function generateReceiptPdf(order) {
  const [storeSettings, billTemplate] = await Promise.all([
    getStoreSettingsOnce().catch(() => null),
    getBillTemplateOnce().catch(() => DEFAULT_BILL_TEMPLATE),
  ]);

  const storeName = storeSettings?.storeName || STORE_NAME;
  const storeAddress = storeSettings?.address || '';
  const storeLocation = storeSettings?.location || '';
  const storePhone = storeSettings?.phone || '';
  const gstNumber = storeSettings?.gstNumber || GST_NUMBER;

  const { format, width: pageWidth } = PAGE_FORMATS[billTemplate.pageSize] ?? PAGE_FORMATS.a4;
  const marginX = pageWidth < 300 ? 16 : 48;
  const align = billTemplate.headerAlign ?? 'left';
  const headerX = align === 'center' ? pageWidth / 2 : align === 'right' ? pageWidth - marginX : marginX;

  const doc = new jsPDF({ unit: 'pt', format });
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(storeName, headerX, y, { align });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  [storeAddress, storeLocation, storePhone && `Phone: ${storePhone}`, gstNumber && `GSTIN: ${gstNumber}`]
    .filter(Boolean)
    .forEach((line) => {
      doc.text(line, headerX, y, { align });
      y += 13;
    });
  y += 10;

  doc.setDrawColor(220, 174, 150);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  const placedDate = order.placedAt ? new Date(order.placedAt) : new Date();
  const customerName =
    [order.shippingDetails?.firstName, order.shippingDetails?.lastName].filter(Boolean).join(' ') ||
    'Valued Customer';

  doc.setFontSize(9);
  doc.text(`Order ID: ${order.id}`, marginX, y);
  y += 13;
  doc.text(`Order Date: ${placedDate.toLocaleString('en-IN')}`, marginX, y);
  y += 13;
  doc.text(`Printed On: ${new Date().toLocaleString('en-IN')}`, marginX, y);
  y += 13;
  doc.text(`Customer: ${customerName}`, marginX, y);
  y += 13;
  if (order.paymentMethod) {
    doc.text(`Payment: ${order.paymentMethod}`, marginX, y);
    y += 13;
  }
  if (order.shippingDetails?.gstNumber) {
    doc.text(`Customer GSTIN: ${order.shippingDetails.gstNumber}`, marginX, y);
    y += 13;
  }
  if (order.shippingDetails?.referredBy) {
    doc.text(`Referred By: ${order.shippingDetails.referredBy}`, marginX, y);
    y += 13;
  }

  if (order.shippingDetails?.address) {
    const addressLines = [
      order.shippingDetails.address,
      order.shippingDetails.apartment,
      [order.shippingDetails.city, order.shippingDetails.state, order.shippingDetails.zip].filter(Boolean).join(', '),
      order.shippingDetails.phone ? `Delivery Phone: ${order.shippingDetails.phone}` : null,
    ].filter(Boolean);
    addressLines.forEach((line) => {
      doc.text(line, marginX, y, { maxWidth: pageWidth - marginX * 2 });
      y += 13;
    });
  }
  y += 8;

  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  const columns = (billTemplate.columns ?? DEFAULT_BILL_TEMPLATE.columns).filter((col) => col.visible);
  const usableWidth = pageWidth - marginX * 2;
  const colX = columns.map((_, index) =>
    index === columns.length - 1 ? pageWidth - marginX : marginX + (usableWidth * index) / columns.length
  );
  const colAlign = (index) => (index === columns.length - 1 ? 'right' : 'left');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  columns.forEach((col, index) => {
    doc.text(col.label, colX[index], y, { align: colAlign(index) });
  });
  y += 6;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  order.items.forEach((item) => {
    columns.forEach((col, index) => {
      const value = ITEM_VALUE[col.key] ? ITEM_VALUE[col.key](item) : '';
      doc.text(value, colX[index], y, { align: colAlign(index), maxWidth: usableWidth / columns.length });
    });
    y += 18;
  });

  y += 6;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  doc.setFontSize(9);
  doc.text('Subtotal', marginX, y);
  doc.text(formatCurrency(order.subtotal), pageWidth - marginX, y, { align: 'right' });
  y += 14;
  doc.text('Tax (18%)', marginX, y);
  doc.text(formatCurrency(order.tax), pageWidth - marginX, y, { align: 'right' });
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', marginX, y);
  doc.text(formatCurrency(order.total), pageWidth - marginX, y, { align: 'right' });
  y += 30;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(billTemplate.footerNote || DEFAULT_BILL_TEMPLATE.footerNote, marginX, y);

  doc.save(`${order.id}-receipt.pdf`);
}
