import { onValue, ref, remove, serverTimestamp, set, get } from 'firebase/database';
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
  const productId = product.id || `prod_${Date.now()}`;
  if (!isFirebaseEnabled) {
    const products = getLocalProducts();
    const existing = products.find((p) => p.id === productId);
    const newProduct = {
      ...product,
      id: productId,
      sku: existing?.sku || generateSku(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      createdAtMs: existing?.createdAtMs ?? Date.now(),
    };
    const updatedProducts = existing
      ? products.map((p) => (p.id === productId ? newProduct : p))
      : [...products, newProduct];
    setLocalProducts(updatedProducts);
    notifyLocalListeners();
    return Promise.resolve(newProduct);
  }
  const productRef = ref(db, `${ROOT}/${productId}`);
  return get(productRef).then((snapshot) => {
    const existing = snapshot.exists() ? snapshot.val() : null;
    const payload = {
      ...product,
      id: productId,
      sku: existing?.sku || generateSku(),
      createdAt: existing?.createdAt || serverTimestamp(),
      createdAtMs: existing?.createdAtMs ?? Date.now(),
    };
    return set(productRef, payload).then(() => ({ id: productId, ...payload }));
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

export function updateProductVideos(productId, videos) {
  if (!isFirebaseEnabled) {
    const products = getLocalProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.videos = videos;
      setLocalProducts(products);
      notifyLocalListeners();
    }
    return Promise.resolve();
  }
  return set(ref(db, `${ROOT}/${productId}/videos`), videos);
}

export function reduceProductStock(productId, size, quantity) {
  if (!isFirebaseEnabled) {
    const products = getLocalProducts();
    const product = products.find((p) => p.id === productId);
    if (product && product.sizes) {
      product.sizes = product.sizes.map((s) => {
        if (s.size === size) {
          return { ...s, stock: Math.max(0, s.stock - quantity) };
        }
        return s;
      });
      setLocalProducts(products);
      notifyLocalListeners();
    }
    return Promise.resolve();
  }

  const productRef = ref(db, `${ROOT}/${productId}`);
  return get(productRef).then((snapshot) => {
    if (snapshot.exists()) {
      const product = snapshot.val();
      if (product.sizes) {
        const updatedSizes = product.sizes.map((s) => {
          if (s.size === size) {
            return { ...s, stock: Math.max(0, s.stock - quantity) };
          }
          return s;
        });
        return set(ref(db, `${ROOT}/${productId}/sizes`), updatedSizes);
      }
    }
  });
}

export function createFileMetadata(metadata) {
  const fileKey = (metadata.key || `file_${Date.now()}`).replace(/\./g, '_');
  if (!isFirebaseEnabled) {
    try {
      const existing = JSON.parse(localStorage.getItem('fileMetadata') || '[]');
      existing.push({ ...metadata, fileKey, createdAtMs: Date.now() });
      localStorage.setItem('fileMetadata', JSON.stringify(existing));
    } catch (e) {
      console.error(e);
    }
    return Promise.resolve({ ...metadata, fileKey });
  }

  const fileRef = ref(db, `fileMetadata/${fileKey}`);
  const payload = {
    ...metadata,
    fileKey,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  };
  return set(fileRef, payload).then(() => ({ fileKey, ...payload }));
}
