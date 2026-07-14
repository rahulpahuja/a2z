import { jsPDF } from 'jspdf';
import { STORE_NAME, GST_NUMBER } from '../config/store.js';
import { formatCurrency } from '../context/CartContext.jsx';

export function generateReceiptPdf(order) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(STORE_NAME, marginX, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Order Receipt', marginX, y);
  if (GST_NUMBER) {
    doc.text(`GSTIN: ${GST_NUMBER}`, 595 - marginX, y, { align: 'right' });
  }
  y += 24;

  doc.setDrawColor(220, 174, 150);
  doc.line(marginX, y, 595 - marginX, y);
  y += 24;

  const placedDate = order.placedAt ? new Date(order.placedAt) : new Date();
  const customerName = [order.shippingDetails?.firstName, order.shippingDetails?.lastName]
    .filter(Boolean)
    .join(' ') || 'Valued Customer';

  doc.setFontSize(11);
  doc.text(`Order ID: ${order.id}`, marginX, y);
  doc.text(`Date: ${placedDate.toLocaleString('en-IN')}`, 595 - marginX, y, { align: 'right' });
  y += 18;
  doc.text(`Customer: ${customerName}`, marginX, y);
  if (order.paymentMethod) {
    doc.text(`Payment: ${order.paymentMethod}`, 595 - marginX, y, { align: 'right' });
  }
  y += 18;

  if (order.shippingDetails?.address) {
    const addressLines = [
      order.shippingDetails.address,
      order.shippingDetails.apartment,
      [order.shippingDetails.city, order.shippingDetails.state, order.shippingDetails.zip].filter(Boolean).join(', '),
      order.shippingDetails.phone ? `Phone: ${order.shippingDetails.phone}` : null,
    ].filter(Boolean);
    addressLines.forEach((line) => {
      doc.text(line, marginX, y);
      y += 14;
    });
  }
  y += 10;

  doc.line(marginX, y, 595 - marginX, y);
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.text('Item', marginX, y);
  doc.text('Qty', 380, y);
  doc.text('Price', 460, y);
  doc.text('Total', 595 - marginX, y, { align: 'right' });
  y += 8;
  doc.line(marginX, y, 595 - marginX, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  order.items.forEach((item) => {
    const label = [item.title, item.color, item.size].filter(Boolean).join(' · ');
    doc.text(label, marginX, y, { maxWidth: 300 });
    doc.text(String(item.quantity), 380, y);
    doc.text(formatCurrency(item.price), 460, y);
    doc.text(formatCurrency(item.price * item.quantity), 595 - marginX, y, { align: 'right' });
    y += 20;
  });

  y += 8;
  doc.line(marginX, y, 595 - marginX, y);
  y += 20;

  doc.text('Subtotal', 460, y);
  doc.text(formatCurrency(order.subtotal), 595 - marginX, y, { align: 'right' });
  y += 18;
  doc.text('Tax (18%)', 460, y);
  doc.text(formatCurrency(order.tax), 595 - marginX, y, { align: 'right' });
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 460, y);
  doc.text(formatCurrency(order.total), 595 - marginX, y, { align: 'right' });
  y += 36;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Thank you for shopping with us.', marginX, y);

  doc.save(`${order.id}-receipt.pdf`);
}
