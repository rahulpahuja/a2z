import { onValue, push, ref, remove, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { PRODUCTS } from '../data/products.js';

const ROOT = 'adminProducts';
const generateSku = () => `A2Z-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

function getLocalProducts() {
  try {
    const data = localStorage.getItem(ROOT);
    if (!data) {
      // Pre-populate with storefront products mapped to the admin product structure
      const defaultAdminProducts = PRODUCTS.map((p, idx) => ({
        id: p.id,
        title: p.name,
        description: p.description,
        hashtags: p.badge ? [p.badge] : [],
        categoryId: `cat_${p.category.toLowerCase().replace(/\s+/g, '')}`,
        categoryTitle: p.category,
        price: p.price,
        hsnCode: '6204',
        sku: `A2Z-${p.id.toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
        colors: ['Rani Pink', 'Emerald Green', 'Dusty Rose'],
        sizes: [
          { size: 'S', stock: 5 },
          { size: 'M', stock: 10 },
          { size: 'L', stock: 15 }
        ],
        createdAtMs: Date.now() - idx * 60000,
      }));
      localStorage.setItem(ROOT, JSON.stringify(defaultAdminProducts));
      return defaultAdminProducts;
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function setLocalProducts(products) {
  localStorage.setItem(ROOT, JSON.stringify(products));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const products = getLocalProducts();
  products.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  localListeners.forEach((listener) => listener(products, null));
}

export function subscribeToAdminProducts(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    const products = getLocalProducts();
    products.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
    callback(products, null);
    return () => {
      localListeners.delete(callback);
    };
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      rows.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}

// product: { title, description, hashtags: string[], categoryId, categoryTitle,
//            price: number, hsnCode, colors: string[], sizes: [{ size, stock }] }
export function createAdminProduct(product) {
  if (!isFirebaseEnabled) {
    const products = getLocalProducts();
    const newProduct = {
      ...product,
      id: `prod_${Date.now()}`,
      sku: generateSku(),
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
    };
    products.push(newProduct);
    setLocalProducts(products);
    notifyLocalListeners();
    return Promise.resolve(newProduct);
  }
  return push(ref(db, ROOT), {
    ...product,
    sku: generateSku(),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function deleteAdminProduct(id) {
  if (!isFirebaseEnabled) {
    let products = getLocalProducts();
    products = products.filter((p) => p.id !== id);
    setLocalProducts(products);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${id}`));
}
