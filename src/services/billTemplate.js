import { get, onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

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

function getLocalBillTemplate() {
  try {
    const data = localStorage.getItem(PATH);
    return data ? JSON.parse(data) : DEFAULT_BILL_TEMPLATE;
  } catch {
    return DEFAULT_BILL_TEMPLATE;
  }
}

function setLocalBillTemplate(data) {
  localStorage.setItem(PATH, JSON.stringify(data));
}

const templateListeners = new Set();
function notifyTemplateListeners() {
  const data = getLocalBillTemplate();
  templateListeners.forEach((listener) => listener(data, null));
}

export function subscribeToBillTemplate(callback) {
  if (!isFirebaseEnabled) {
    templateListeners.add(callback);
    callback(getLocalBillTemplate(), null);
    return () => {
      templateListeners.delete(callback);
    };
  }
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      callback(snapshot.exists() ? { ...DEFAULT_BILL_TEMPLATE, ...snapshot.val() } : DEFAULT_BILL_TEMPLATE, null);
    },
    (error) => callback(DEFAULT_BILL_TEMPLATE, error)
  );
}

export function saveBillTemplate(data) {
  if (!isFirebaseEnabled) {
    setLocalBillTemplate(data);
    notifyTemplateListeners();
    return Promise.resolve();
  }
  return set(ref(db, PATH), { ...data, updatedAt: Date.now() });
}

export async function getBillTemplateOnce() {
  if (!isFirebaseEnabled) return getLocalBillTemplate();
  const snapshot = await get(ref(db, PATH));
  return snapshot.exists() ? { ...DEFAULT_BILL_TEMPLATE, ...snapshot.val() } : DEFAULT_BILL_TEMPLATE;
}
