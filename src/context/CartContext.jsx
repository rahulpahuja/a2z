import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export const parsePrice = (value) =>
  typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, '')) || 0;

export const formatCurrency = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

let orderSequence = 1000;

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [shippingDetails, setShippingDetails] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);

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

  const placeOrder = ({ paymentMethod, placedAt }) => {
    const subtotalAtOrder = items.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const taxAtOrder = subtotalAtOrder * 0.18;
    orderSequence += 1;
    const order = {
      id: `ORD-2026-${orderSequence}`,
      items,
      subtotal: subtotalAtOrder,
      tax: taxAtOrder,
      total: subtotalAtOrder + taxAtOrder,
      paymentMethod,
      placedAt,
      shippingDetails,
    };
    setLastOrder(order);
    setItems([]);
    return order;
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
