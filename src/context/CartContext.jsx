import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { recordPurchase } from '../services/productStats.js';
import { logAddToCart, logRemoveFromCart, logPurchase } from '../services/analytics.js';
import { createFirebaseOrder, updateFirebaseOrder, hasPriorOrders } from '../services/orders.js';
import { reserveProductStock, releaseProductStock } from '../services/adminProducts.js';
import { getStoreSettingsOnce, subscribeToStoreSettings, DEFAULT_STORE_SETTINGS } from '../services/storeSettings.js';
import { createForwardShipment, buildDeliveryAddress, extractShipmentCost } from '../services/shipprime.js';
import { getCouponByCode, reserveCouponUsage, releaseCouponUsage, getServerNow } from '../services/coupons.js';
import { computeCartTotals, computeEligibleAmount, evaluateCoupon } from '../utils/coupons.js';
import { INDIAN_STATES_AND_UT } from '../data/indiaData.js';

const CartContext = createContext(null);

const LAST_ORDER_KEY = 'a2z_last_order';

function readStoredLastOrder() {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const parsePrice = (value) =>
  typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, '')) || 0;

export const formatCurrency = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

// Generates a collision-safe order id (timestamp + random suffix) instead of
// an in-memory counter, which resets on every reload/tab and can silently
// overwrite a different order at the same Firebase key.
function generateOrderId() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${Date.now().toString(36).toUpperCase()}${rand}`;
}

// Fire-and-forget: books a ShipPrime forward shipment for a freshly placed
// order and persists the result onto it. Never throws — a shipping failure
// (bad address, ShipPrime down, not configured) must not affect checkout,
// which has already succeeded by the time this runs. Failures are visible to
// admins via order.shipment.status/error and retryable from Sales Management.
async function autoCreateShipment(order) {
  try {
    const storeSettings = await getStoreSettingsOnce();
    const pickupAddress = storeSettings.pickupAddress;
    if (!pickupAddress?.address1 || !pickupAddress?.pincode) {
      throw new Error('Store pickup address is not set up (Store Settings > Pickup Address).');
    }
    const stateName = INDIAN_STATES_AND_UT.find((s) => s.code === order.shippingDetails?.state)?.name;
    const deliveryAddress = buildDeliveryAddress(order.shippingDetails, stateName);
    const result = await createForwardShipment({ order, pickupAddress, deliveryAddress });
    await updateFirebaseOrder({
      ...order,
      shipment: {
        status: 'created',
        awb: result.awb,
        courier: result.courier,
        labelUrl: result.labelUrl,
        cost: extractShipmentCost(result),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await updateFirebaseOrder({
      ...order,
      shipment: { status: 'failed', error: err.message || 'Shipment creation failed.' },
    }).catch(() => {});
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [shippingDetails, setShippingDetails] = useState(null);
  const [lastOrder, setLastOrder] = useState(readStoredLastOrder);
  const [taxRatePercent, setTaxRatePercent] = useState(DEFAULT_STORE_SETTINGS.taxRatePercent);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => {
      setTaxRatePercent(settings.taxRatePercent ?? DEFAULT_STORE_SETTINGS.taxRatePercent);
    });
    return unsubscribe;
  }, []);

  // A coupon that stops matching the cart it was applied to (the eligible
  // lines were removed, or the remaining eligible amount fell under the
  // coupon's minimum order value) is silently dropped rather than left
  // applied with a stale/incorrect discount.
  useEffect(() => {
    if (!appliedCoupon) return;
    const eligibleAmount = computeEligibleAmount(appliedCoupon, items);
    if (eligibleAmount <= 0 || (appliedCoupon.minimumOrderValue && eligibleAmount < appliedCoupon.minimumOrderValue)) {
      setAppliedCoupon(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const totals = useMemo(() => computeCartTotals(items, taxRatePercent, appliedCoupon), [items, taxRatePercent, appliedCoupon]);

  // `user`/`customerId` come from the caller (not read from AuthContext here)
  // because CartProvider sits above AuthProvider in the component tree in
  // main.jsx — useAuth() isn't available at this level. Whether this is the
  // customer's first order is only looked up when the coupon actually cares
  // (firstOrderOnly), since it costs a full orders-table read that ordinary
  // coupons have no reason to pay for.
  const applyCoupon = async (code, { customerId, user } = {}) => {
    const coupon = await getCouponByCode(code);
    if (!coupon) {
      const err = new Error('Invalid coupon code.');
      err.code = 'COUPON_NOT_FOUND';
      throw err;
    }
    const now = await getServerNow();
    const isFirstOrder = coupon.firstOrderOnly ? !(await hasPriorOrders(user)) : true;
    const result = evaluateCoupon(coupon, { items, customerId, isFirstOrder, now });
    if (!result.ok) {
      const err = new Error(result.message);
      err.code = result.code;
      throw err;
    }
    setAppliedCoupon(coupon);
    return coupon;
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.id === product.id ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...prev, { ...product, quantity }];
    });
    logAddToCart(product, quantity);
  };

  const removeItem = (id) => {
    const line = items.find((item) => item.id === id);
    if (line) logRemoveFromCart(line);
    setItems((prev) => prev.filter((line) => line.id !== id));
  };

  const updateQuantity = (id, quantity) =>
    setItems((prev) =>
      prev.map((line) => (line.id === id ? { ...line, quantity: Math.max(1, quantity) } : line))
    );

  const clearCart = () => setItems([]);

  // Reserves stock for every stock-tracked line, stopping and rolling back
  // anything already reserved the moment one line can't be fulfilled — a
  // customer is never left with some lines silently deducted out from under
  // a cart whose order didn't go through.
  const reserveStockForItems = async (lines) => {
    const reserved = [];
    for (const line of lines) {
      if (!line.size) continue;
      const productId = line.productId ?? line.id;
      const ok = await reserveProductStock(productId, line.color, line.size, line.quantity);
      if (!ok) {
        await Promise.all(reserved.map((r) => releaseProductStock(r.productId, r.color, r.size, r.quantity)));
        const err = new Error(`"${line.title}" just went out of stock. Please update your cart and try again.`);
        err.code = 'OUT_OF_STOCK';
        throw err;
      }
      reserved.push({ productId, color: line.color, size: line.size, quantity: line.quantity });
    }
    return reserved;
  };

  // Places the order, atomically reserving inventory and the applied
  // coupon's usage before anything is written — and rolling either back if
  // a later step fails — so a failed order (out of stock, coupon limit
  // reached concurrently, the order write itself failing) never leaves
  // stock short or a coupon's usage consumed. `customerId`/`user` are
  // supplied by the caller, which has access to AuthContext; see
  // applyCoupon above for why CartContext can't read them itself.
  const placeOrder = async ({ paymentMethod, paymentId, placedAt, customerId, user }) => {
    const now = await getServerNow();
    const orderTotals = computeCartTotals(items, taxRatePercent, appliedCoupon);

    if (appliedCoupon) {
      const isFirstOrder = appliedCoupon.firstOrderOnly ? !(await hasPriorOrders(user)) : true;
      const validation = evaluateCoupon(appliedCoupon, { items, customerId, isFirstOrder, now });
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.code = validation.code;
        throw err;
      }
    }

    const reserved = await reserveStockForItems(items);

    let couponReserved = false;
    if (appliedCoupon) {
      try {
        await reserveCouponUsage(appliedCoupon.code, customerId, now);
        couponReserved = true;
      } catch (err) {
        await Promise.all(reserved.map((r) => releaseProductStock(r.productId, r.color, r.size, r.quantity)));
        throw err;
      }
    }

    const order = {
      id: generateOrderId(),
      items,
      subtotal: orderTotals.subtotal,
      couponCode: appliedCoupon?.code ?? null,
      discount: orderTotals.discount,
      tax: orderTotals.tax,
      total: orderTotals.grandTotal,
      paymentMethod,
      paymentId: paymentId || null,
      placedAt,
      shippingDetails,
      status: 'Processing',
      customerId: customerId ?? null,
    };

    try {
      await createFirebaseOrder(order);
    } catch (err) {
      await Promise.all(reserved.map((r) => releaseProductStock(r.productId, r.color, r.size, r.quantity)));
      if (couponReserved) await releaseCouponUsage(appliedCoupon.code, customerId);
      throw err;
    }

    autoCreateShipment(order);

    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      // ignore storage failures (e.g. private mode)
    }
    setLastOrder(order);
    setItems([]);
    setAppliedCoupon(null);
    items.forEach((line) => recordPurchase(line.id, line.quantity));
    logPurchase(order);
    return order;
  };

  const trackSpecificOrder = (order) => {
    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      // ignore
    }
    setLastOrder(order);
  };

  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotal,
      shippingDetails,
      setShippingDetails,
      lastOrder,
      placeOrder,
      trackSpecificOrder,
      taxRatePercent,
      totals,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
    }),
    [items, shippingDetails, lastOrder, taxRatePercent, totals, appliedCoupon]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
