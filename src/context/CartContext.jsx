import { createContext, useContext, useMemo, useState } from 'react';
import { recordPurchase } from '../services/productStats.js';
import { createFirebaseOrder, updateFirebaseOrder } from '../services/orders.js';
import { reduceProductStock } from '../services/adminProducts.js';
import { getStoreSettingsOnce } from '../services/storeSettings.js';
import { createForwardShipment, buildDeliveryAddress } from '../services/shipprime.js';
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
  };

  const removeItem = (id) => setItems((prev) => prev.filter((line) => line.id !== id));

  const updateQuantity = (id, quantity) =>
    setItems((prev) =>
      prev.map((line) => (line.id === id ? { ...line, quantity: Math.max(1, quantity) } : line))
    );

  const clearCart = () => setItems([]);



  const placeOrder = ({ paymentMethod, paymentId, placedAt }) => {
    const subtotalAtOrder = items.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const taxAtOrder = subtotalAtOrder * 0.18;
    const order = {
      id: generateOrderId(),
      items,
      subtotal: subtotalAtOrder,
      tax: taxAtOrder,
      total: subtotalAtOrder + taxAtOrder,
      paymentMethod,
      paymentId: paymentId || null,
      placedAt,
      shippingDetails,
      status: 'Processing',
    };

    // Save order details to Firebase Database
    createFirebaseOrder(order);
    autoCreateShipment(order);

    // Update stock levels in Firebase
    items.forEach((line) => {
      if (line.size) {
        reduceProductStock(line.id, line.size, line.quantity);
      }
    });

    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      // ignore storage failures (e.g. private mode)
    }
    setLastOrder(order);
    setItems([]);
    items.forEach((line) => recordPurchase(line.id, line.quantity));
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
    }),
    [items, shippingDetails, lastOrder]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
