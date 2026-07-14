import { get, onValue, ref, set } from 'firebase/database';
import { db } from '../firebase.js';

const PATH = 'settings/billTemplate';

export const DEFAULT_COLUMNS = [
  { key: 'item', label: 'Item', visible: true },
  { key: 'qty', label: 'Qty', visible: true },
  { key: 'price', label: 'Price', visible: true },
  { key: 'total', label: 'Total', visible: true },
];

export const DEFAULT_BILL_TEMPLATE = {
  pageSize: 'a4',
  headerAlign: 'left',
  columns: DEFAULT_COLUMNS,
  footerNote: 'Thank you for shopping with us.',
};

export function subscribeToBillTemplate(callback) {
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      callback(snapshot.exists() ? { ...DEFAULT_BILL_TEMPLATE, ...snapshot.val() } : DEFAULT_BILL_TEMPLATE, null);
    },
    (error) => callback(DEFAULT_BILL_TEMPLATE, error)
  );
}

export function saveBillTemplate(data) {
  return set(ref(db, PATH), { ...data, updatedAt: Date.now() });
}

export async function getBillTemplateOnce() {
  const snapshot = await get(ref(db, PATH));
  return snapshot.exists() ? { ...DEFAULT_BILL_TEMPLATE, ...snapshot.val() } : DEFAULT_BILL_TEMPLATE;
}
