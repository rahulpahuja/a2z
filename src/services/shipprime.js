const API_BASE = import.meta.env.VITE_SHIPPRIME_API_URL;
const APP_KEY = import.meta.env.VITE_SHIPPRIME_APP_KEY;

function assertConfigured() {
  if (!API_BASE || !APP_KEY) {
    throw new Error('ShipPrime is not configured. Set VITE_SHIPPRIME_API_URL and VITE_SHIPPRIME_APP_KEY in .env.');
  }
}

// weightGrams has no real per-product source today (no weight field on
// products) — this is a documented approximation, not a precise figure.
export function estimateWeightGrams(items) {
  const totalQty = items.reduce((sum, line) => sum + line.quantity, 0);
  return Math.max(500, totalQty * 300);
}

export function buildDeliveryAddress(shippingDetails, stateName) {
  return {
    name: `${shippingDetails.firstName} ${shippingDetails.lastName}`.trim(),
    phone: shippingDetails.phone,
    address1: shippingDetails.address,
    address2: shippingDetails.apartment || undefined,
    city: shippingDetails.city,
    state: stateName || shippingDetails.state,
    pincode: shippingDetails.zip,
    country: 'India',
  };
}

// ShipPrime has no public API documentation we could find, so the exact
// field name their forward-create response uses for the per-shipment charge
// is unknown. This checks the field names most freight/logistics APIs use;
// if none match, callers get null and should say "not available" rather
// than silently show ₹0 — see AdminTrackingPartnersPage's spend panel.
const COST_FIELD_CANDIDATES = [
  'freightCharges',
  'freightCharge',
  'shippingCharges',
  'shippingCharge',
  'totalCharges',
  'charges',
  'shippingCost',
  'cost',
  'amount',
];

export function extractShipmentCost(result) {
  if (!result || typeof result !== 'object') return null;
  for (const key of COST_FIELD_CANDIDATES) {
    const value = result[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

export async function createForwardShipment({ order, pickupAddress, deliveryAddress }) {
  assertConfigured();
  const res = await fetch(`${API_BASE}/forward/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-key': APP_KEY },
    body: JSON.stringify({
      clientReferenceId: order.id,
      paymentMethod: 'PREPAID',
      declaredValue: order.subtotal,
      weightGrams: estimateWeightGrams(order.items),
      items: order.items.map((line) => ({
        name: line.title,
        sku: line.id,
        quantity: line.quantity,
        price: line.price,
      })),
      pickupAddress,
      deliveryAddress,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'ShipPrime shipment creation failed.');
  }
  return data; // { status, awb, courier, orderId, labelUrl }
}

export async function trackShipment(awb) {
  assertConfigured();
  const res = await fetch(`${API_BASE}/forward/track?awb=${encodeURIComponent(awb)}`, {
    headers: { 'x-app-key': APP_KEY },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'ShipPrime tracking lookup failed.');
  }
  return data.results?.[0] || null; // { awb, currentStatus, statusDate, history }
}

export async function cancelShipment(awb) {
  assertConfigured();
  const res = await fetch(`${API_BASE}/forward/${encodeURIComponent(awb)}/cancel`, {
    method: 'POST',
    headers: { 'x-app-key': APP_KEY },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'ShipPrime shipment cancellation failed.');
  }
  return data;
}
