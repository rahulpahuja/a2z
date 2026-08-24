import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { useProducts } from '../../context/ProductsContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import { subscribeToOrders, updateFirebaseOrder } from '../../services/orders.js';
import { reduceProductStock, restockProductStock } from '../../services/adminProducts.js';
import { subscribeToReferrers, createReferrer } from '../../services/referrers.js';
import { subscribeToStoreSettings, DEFAULT_STORE_SETTINGS } from '../../services/storeSettings.js';
import { generateReceiptPdf } from '../../utils/generateReceipt.js';
import { normalizeColors, isColorOutOfStock, getColorSizeStock } from '../../utils/productColors.js';
import './AdminLocalBillingPage.css';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Other'];

const generateBillId = () =>
  `BILL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const generateLineId = () => `line_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function AdminLocalBillingPage() {
  const { showToast } = useToast();
  const { products } = useProducts();
  const [orders, setOrders] = useState([]);
  const [referrers, setReferrers] = useState([]);
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);

  // Bill metadata
  const [editingBillId, setEditingBillId] = useState(null);
  const [billingDate, setBillingDate] = useState(() => toDatetimeLocalValue(new Date()));
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [newReferrerName, setNewReferrerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [gstApplied, setGstApplied] = useState(true);
  const [customerGstNumber, setCustomerGstNumber] = useState('');
  const [items, setItems] = useState([]);
  const [savingBill, setSavingBill] = useState(false);

  // Barcode scan
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef(null);

  // Catalog item picker
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState('');

  // Virtual (unlisted) item entry
  const [virtualLabel, setVirtualLabel] = useState('Virtual');
  const [virtualAmount, setVirtualAmount] = useState('');

  const [billsSearch, setBillsSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeToOrders((rows) => setOrders(rows));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToReferrers((rows) => setReferrers(rows));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToStoreSettings((settings) => setStoreSettings(settings));
    return unsub;
  }, []);

  const localBills = useMemo(() => orders.filter((o) => o.source === 'in-store'), [orders]);

  const filteredBills = useMemo(() => {
    const q = billsSearch.trim().toLowerCase();
    if (!q) return localBills;
    return localBills.filter((bill) => {
      const name = `${bill.shippingDetails?.firstName || ''}`.toLowerCase();
      return bill.id.toLowerCase().includes(q) || name.includes(q) || (bill.shippingDetails?.phone || '').includes(q);
    });
  }, [localBills, billsSearch]);

  const todayStats = useMemo(() => {
    const now = new Date();
    const todaysBills = localBills.filter(
      (o) => o.status !== 'Cancelled' && o.placedAt && isSameDay(new Date(o.placedAt), now)
    );
    return {
      count: todaysBills.length,
      total: todaysBills.reduce((sum, o) => sum + (o.total || 0), 0),
    };
  }, [localBills]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;
  const selectedProductColors = useMemo(
    () => (selectedProduct ? normalizeColors(selectedProduct.colors, selectedProduct.sizes) : []),
    [selectedProduct]
  );
  const selectedColorObj = selectedProductColors.find((c) => c.name === selectedColor) || null;
  const selectedSizeStock = selectedColorObj ? getColorSizeStock(selectedColorObj, selectedSize) : null;

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products.filter((p) => (p.title || p.name || '').toLowerCase().includes(q)).slice(0, 50);
  }, [products, productSearch]);

  // Selecting a product resets its color/size/price so a stale selection
  // from a different product can't leak into the new item being built.
  useEffect(() => {
    setSelectedColor('');
    setSelectedSize('');
    setSelectedQty(1);
    setSelectedPrice(selectedProduct ? String(selectedProduct.price ?? '') : '');
  }, [selectedProductId]);

  const handleBarcodeKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    const match = products.find((p) => (p.sku || '').toLowerCase() === code.toLowerCase());
    if (match) {
      setSelectedProductId(match.id);
      setProductSearch(match.title || match.name || '');
      showToast(`Scanned: ${match.title || match.name}`);
    } else {
      showToast(`No product found for barcode/SKU "${code}".`);
    }
    setBarcodeInput('');
  };

  const addCatalogItem = () => {
    if (!selectedProduct) {
      showToast('Select a product first.');
      return;
    }
    if (selectedProductColors.length > 0 && !selectedColorObj) {
      showToast('Select a color.');
      return;
    }
    if (selectedColorObj && selectedColorObj.sizes.length > 0 && !selectedSize) {
      showToast('Select a size.');
      return;
    }
    const qty = Math.max(1, Number(selectedQty) || 1);
    if (selectedSizeStock !== null && qty > selectedSizeStock) {
      showToast(`Only ${selectedSizeStock} left in ${selectedColor} / ${selectedSize}.`);
      return;
    }
    const price = selectedPrice === '' ? Number(selectedProduct.price) || 0 : Number(selectedPrice) || 0;
    setItems((prev) => [
      ...prev,
      {
        lineId: generateLineId(),
        productId: selectedProduct.id,
        title: selectedProduct.title || selectedProduct.name,
        color: selectedColor || null,
        size: selectedSize || null,
        price,
        quantity: qty,
        isVirtual: false,
      },
    ]);
    setSelectedProductId('');
    setProductSearch('');
  };

  const addVirtualItem = () => {
    const amount = Number(virtualAmount);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount for the virtual item.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        lineId: generateLineId(),
        productId: null,
        title: (virtualLabel || 'Virtual').trim() || 'Virtual',
        color: null,
        size: null,
        price: amount,
        quantity: 1,
        isVirtual: true,
      },
    ]);
    setVirtualAmount('');
    setVirtualLabel('Virtual');
  };

  const removeItem = (lineId) => setItems((prev) => prev.filter((it) => it.lineId !== lineId));

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const taxRate = storeSettings.taxRatePercent ?? 18;
  const tax = gstApplied ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;

  const resetForm = () => {
    setEditingBillId(null);
    setBillingDate(toDatetimeLocalValue(new Date()));
    setCustomerName('');
    setCustomerPhone('');
    setReferredBy('');
    setPaymentMethod('Cash');
    setGstApplied(true);
    setCustomerGstNumber('');
    setItems([]);
  };

  const handleAddReferrer = async () => {
    if (!newReferrerName.trim()) return;
    try {
      const created = await createReferrer({ name: newReferrerName.trim(), phone: '' });
      setReferredBy(created?.name || newReferrerName.trim());
      setNewReferrerName('');
      showToast('Referrer added.');
    } catch (err) {
      showToast(err.message || 'Could not add referrer.');
    }
  };

  const handleEditBill = (bill) => {
    if (bill.status === 'Cancelled') {
      showToast('Cancelled bills cannot be edited.');
      return;
    }
    setEditingBillId(bill.id);
    setBillingDate(toDatetimeLocalValue(bill.placedAt ? new Date(bill.placedAt) : new Date()));
    const firstName = bill.shippingDetails?.firstName || '';
    setCustomerName(firstName === 'Walk-in Customer' ? '' : firstName);
    setCustomerPhone(bill.shippingDetails?.phone || '');
    setReferredBy(bill.shippingDetails?.referredBy || '');
    setPaymentMethod(bill.paymentMethod || 'Cash');
    setGstApplied(Boolean(bill.gstApplied));
    setCustomerGstNumber(bill.shippingDetails?.gstNumber || '');
    setItems((bill.items ?? []).map((it) => ({ ...it, lineId: generateLineId() })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveBill = async (event) => {
    event.preventDefault();
    if (items.length === 0) {
      showToast('Add at least one item to the bill.');
      return;
    }
    setSavingBill(true);
    try {
      const originalBill = editingBillId ? orders.find((o) => o.id === editingBillId) : null;

      // Editing a bill: give back the stock the original line items held
      // before deducting stock for the (possibly different) new line items.
      if (originalBill) {
        await Promise.all(
          (originalBill.items ?? [])
            .filter((it) => it.productId && !it.isVirtual)
            .map((it) => restockProductStock(it.productId, it.size, it.quantity, it.color))
        );
      }
      await Promise.all(
        items
          .filter((it) => it.productId && !it.isVirtual)
          .map((it) => reduceProductStock(it.productId, it.size, it.quantity, it.color))
      );

      const id = editingBillId || generateBillId();
      const bill = {
        id,
        source: 'in-store',
        items: items.map(({ lineId: _lineId, ...rest }) => rest),
        subtotal,
        tax,
        total,
        gstApplied,
        paymentMethod,
        paymentId: null,
        placedAt: new Date(billingDate).toISOString(),
        shippingDetails: {
          firstName: customerName.trim() || 'Walk-in Customer',
          lastName: '',
          phone: customerPhone.trim(),
          gstNumber: gstApplied ? customerGstNumber.trim() : '',
          referredBy: referredBy || '',
        },
        status: 'Completed',
        createdAt: originalBill?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      await updateFirebaseOrder(bill);
      showToast(editingBillId ? 'Bill updated.' : 'Bill created.');
      resetForm();
    } catch (err) {
      showToast(err.message || 'Could not save the bill.');
    } finally {
      setSavingBill(false);
    }
  };

  const handleCancelBill = async (bill) => {
    if (bill.status === 'Cancelled') return;
    if (!window.confirm(`Cancel bill ${bill.id}? Stock for its items will be restored.`)) return;
    try {
      await Promise.all(
        (bill.items ?? [])
          .filter((it) => it.productId && !it.isVirtual)
          .map((it) => restockProductStock(it.productId, it.size, it.quantity, it.color))
      );
      await updateFirebaseOrder({ ...bill, status: 'Cancelled', updatedAt: Date.now() });
      if (editingBillId === bill.id) resetForm();
      showToast('Bill cancelled and stock restored.');
    } catch (err) {
      showToast(err.message || 'Could not cancel the bill.');
    }
  };

  return (
    <div className="billing-page">
      <header className="billing-header">
        <h1 className="billing-header__title">Local Billing</h1>
        <p className="billing-header__subtitle">
          Create a bill for an in-person sale — scan or search a product, or add a one-off virtual item, then print
          the receipt.
        </p>
      </header>

      <main className="billing-main">
        <section className="billing-summary-row">
          <div className="billing-summary-card">
            <p className="billing-summary-card__label">Today's Bills</p>
            <p className="billing-summary-card__value">{todayStats.count}</p>
          </div>
          <div className="billing-summary-card">
            <p className="billing-summary-card__label">Today's Local Sales</p>
            <p className="billing-summary-card__value">{formatCurrency(todayStats.total)}</p>
            <Link to="/super/sales" className="billing-summary-card__link">
              View full sales reports →
            </Link>
          </div>
        </section>

        <section className="billing-section">
          <h2 className="billing-section__title">{editingBillId ? `Editing Bill ${editingBillId}` : 'New Bill'}</h2>

          {editingBillId && (
            <div className="billing-editing-banner">
              <span>Editing an existing bill — saving will update it in place.</span>
              <button type="button" className="billing-link-btn" onClick={resetForm}>
                Cancel edit / start new bill
              </button>
            </div>
          )}

          <form onSubmit={handleSaveBill}>
            <div className="billing-form-grid">
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="billing-date">
                  Billing Date &amp; Time
                </label>
                <input
                  id="billing-date"
                  type="datetime-local"
                  value={billingDate}
                  onChange={(e) => setBillingDate(e.target.value)}
                  className="billing-field__input"
                />
              </div>
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="customer-name">
                  Customer Name
                </label>
                <input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="billing-field__input"
                />
              </div>
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="customer-phone">
                  Customer Phone
                </label>
                <input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Optional"
                  className="billing-field__input"
                />
              </div>
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="payment-method">
                  Payment Method
                </label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="billing-field__select"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="referred-by">
                  Referred By
                </label>
                <select
                  id="referred-by"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  className="billing-field__select"
                >
                  <option value="">None</option>
                  {referrers.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="new-referrer">
                  Add New Referrer
                </label>
                <div className="billing-inline-row">
                  <input
                    id="new-referrer"
                    value={newReferrerName}
                    onChange={(e) => setNewReferrerName(e.target.value)}
                    placeholder="Name"
                    className="billing-field__input"
                  />
                  <button type="button" onClick={handleAddReferrer} className="billing-btn-ghost">
                    Add
                  </button>
                </div>
              </div>
              <div className="billing-field billing-field--checkbox">
                <input
                  id="gst-applied"
                  type="checkbox"
                  checked={gstApplied}
                  onChange={(e) => setGstApplied(e.target.checked)}
                  className="billing-field__checkbox"
                />
                <label
                  className="billing-field__label billing-field__label--normal-case"
                  htmlFor="gst-applied"
                >
                  Apply GST ({taxRate}%)
                </label>
              </div>
              {gstApplied && (
                <div className="billing-field">
                  <label className="billing-field__label" htmlFor="customer-gst">
                    Customer GSTIN (optional)
                  </label>
                  <input
                    id="customer-gst"
                    value={customerGstNumber}
                    onChange={(e) => setCustomerGstNumber(e.target.value)}
                    placeholder="For a GST invoice"
                    className="billing-field__input"
                  />
                </div>
              )}
            </div>

            <div className="billing-scan">
              <span className="material-symbols-outlined billing-scan__icon">barcode_scanner</span>
              <input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan a barcode (or type SKU) and press Enter to find the product"
                className="billing-scan__input"
              />
            </div>

            <div className="billing-item-picker">
              <div className="billing-item-picker__row">
                <div className="billing-field">
                  <label className="billing-field__label" htmlFor="product-search">
                    Product
                  </label>
                  <input
                    id="product-search"
                    list="billing-product-options"
                    value={productSearch || (selectedProduct ? selectedProduct.title || selectedProduct.name : '')}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      const match = products.find((p) => (p.title || p.name) === e.target.value);
                      setSelectedProductId(match ? match.id : '');
                    }}
                    placeholder="Search product by title…"
                    className="billing-field__input"
                  />
                  <datalist id="billing-product-options">
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.title || p.name} />
                    ))}
                  </datalist>
                </div>
                <div className="billing-field">
                  <label className="billing-field__label" htmlFor="item-color">
                    Color
                  </label>
                  <select
                    id="item-color"
                    value={selectedColor}
                    onChange={(e) => {
                      setSelectedColor(e.target.value);
                      setSelectedSize('');
                    }}
                    disabled={!selectedProduct || selectedProductColors.length === 0}
                    className="billing-field__select"
                  >
                    <option value="">{selectedProductColors.length === 0 ? 'N/A' : 'Select color'}</option>
                    {selectedProductColors.map((c) => (
                      <option key={c.name} value={c.name} disabled={isColorOutOfStock(c)}>
                        {c.name}
                        {isColorOutOfStock(c) ? ' (out of stock)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="billing-field">
                  <label className="billing-field__label" htmlFor="item-size">
                    Size
                  </label>
                  <select
                    id="item-size"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    disabled={!selectedColorObj || selectedColorObj.sizes.length === 0}
                    className="billing-field__select"
                  >
                    <option value="">{!selectedColorObj || selectedColorObj.sizes.length === 0 ? 'N/A' : 'Select size'}</option>
                    {(selectedColorObj?.sizes ?? []).map((s) => (
                      <option key={s.size} value={s.size} disabled={s.stock === 0}>
                        {s.size} {s.stock === null ? '' : `(${s.stock} left)`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="billing-field">
                  <label className="billing-field__label" htmlFor="item-qty">
                    Qty
                  </label>
                  <input
                    id="item-qty"
                    type="number"
                    min="1"
                    max={selectedSizeStock ?? undefined}
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(e.target.value)}
                    className="billing-field__input"
                  />
                </div>
                <div className="billing-field">
                  <label className="billing-field__label" htmlFor="item-price">
                    Unit Price
                  </label>
                  <input
                    id="item-price"
                    type="number"
                    min="0"
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                    className="billing-field__input"
                  />
                </div>
                <button type="button" onClick={addCatalogItem} className="billing-add-btn">
                  Add Item
                </button>
              </div>
            </div>

            <div className="billing-virtual-row">
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="virtual-label">
                  Virtual Item (not in catalog)
                </label>
                <input
                  id="virtual-label"
                  value={virtualLabel}
                  onChange={(e) => setVirtualLabel(e.target.value)}
                  placeholder="Virtual"
                  className="billing-field__input"
                />
              </div>
              <div className="billing-field">
                <label className="billing-field__label" htmlFor="virtual-amount">
                  Amount
                </label>
                <input
                  id="virtual-amount"
                  type="number"
                  min="0"
                  value={virtualAmount}
                  onChange={(e) => setVirtualAmount(e.target.value)}
                  placeholder="0"
                  className="billing-field__input"
                />
              </div>
              <button type="button" onClick={addVirtualItem} className="billing-add-btn">
                Add Virtual Item
              </button>
            </div>

            {items.length > 0 ? (
              <table className="billing-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.lineId}>
                      <td>
                        {it.title}
                        {[it.color, it.size].filter(Boolean).length > 0 && ` (${[it.color, it.size].filter(Boolean).join(' / ')})`}
                        {it.isVirtual && <span className="billing-items-table__badge">Virtual</span>}
                      </td>
                      <td>{it.quantity}</td>
                      <td>{formatCurrency(it.price)}</td>
                      <td>{formatCurrency(it.price * it.quantity)}</td>
                      <td>
                        <button type="button" onClick={() => removeItem(it.lineId)} className="billing-items-table__remove">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="billing-empty">No items added yet.</p>
            )}

            <div className="billing-totals">
              <div className="billing-totals__row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="billing-totals__row">
                <span>GST {gstApplied ? `(${taxRate}%)` : '(not applied)'}</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="billing-totals__row billing-totals__row--total">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="billing-form-actions">
              <button type="submit" disabled={savingBill} className="billing-btn-primary">
                {savingBill ? 'Saving…' : editingBillId ? 'Update Bill' : 'Save Bill'}
              </button>
              {editingBillId && (
                <button type="button" onClick={resetForm} className="billing-btn-ghost">
                  Discard Changes
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="billing-section">
          <h2 className="billing-section__title">Recent Bills</h2>
          <input
            value={billsSearch}
            onChange={(e) => setBillsSearch(e.target.value)}
            placeholder="Search by bill ID, customer name, or phone…"
            className="billing-field__input billing-bills-filter"
          />
          {filteredBills.length === 0 ? (
            <p className="billing-empty">No local bills yet.</p>
          ) : (
            <table className="billing-bills-table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Referred By</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.id}</td>
                    <td>{bill.placedAt ? new Date(bill.placedAt).toLocaleString('en-IN') : '—'}</td>
                    <td>{bill.shippingDetails?.firstName || 'Walk-in Customer'}</td>
                    <td>{bill.shippingDetails?.referredBy || '—'}</td>
                    <td>{bill.items?.length ?? 0}</td>
                    <td>{formatCurrency(bill.total)}</td>
                    <td>
                      <span
                        className={`billing-status-badge ${
                          bill.status === 'Cancelled' ? 'billing-status-badge--cancelled' : 'billing-status-badge--completed'
                        }`}
                      >
                        {bill.status || 'Completed'}
                      </span>
                    </td>
                    <td>
                      <div className="billing-row-actions">
                        <button type="button" onClick={() => generateReceiptPdf(bill)} className="billing-link-btn">
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditBill(bill)}
                          disabled={bill.status === 'Cancelled'}
                          className="billing-link-btn"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelBill(bill)}
                          disabled={bill.status === 'Cancelled'}
                          className="billing-link-btn billing-link-btn--danger"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
