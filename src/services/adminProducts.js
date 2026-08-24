import { onValue, ref, remove, serverTimestamp, set, get, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { PRODUCTS } from '../data/products.js';

const ROOT = 'adminProducts';
const TRASH_ROOT = 'trashedProducts';
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
        colors: [
          { name: 'Rani Pink', outOfStock: false, sizes: [{ size: 'S', stock: 2 }, { size: 'M', stock: 3 }, { size: 'L', stock: 3 }] },
          { name: 'Emerald Green', outOfStock: false, sizes: [{ size: 'S', stock: 2 }, { size: 'M', stock: 2 }, { size: 'L', stock: 2 }] },
          { name: 'Dusty Rose', outOfStock: false, sizes: [{ size: 'S', stock: 1 }, { size: 'M', stock: 2 }, { size: 'L', stock: 1 }] },
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
//            price: number, hsnCode,
//            colors: [{ name, hex, outOfStock: bool, sizes: [{ size, stock: number|null }] }] }
// Each color owns its own sizes — colors[].sizes[].stock is the joint
// (color, size) inventory count. stock === null means that size isn't
// stock-tracked for that color (always available). See utils/productColors.js.
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

function getLocalTrash() {
  try {
    const data = localStorage.getItem(TRASH_ROOT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalTrash(items) {
  localStorage.setItem(TRASH_ROOT, JSON.stringify(items));
}

const trashListeners = new Set();
function notifyTrashListeners() {
  const items = getLocalTrash();
  items.sort((a, b) => (b.trashedAtMs ?? 0) - (a.trashedAtMs ?? 0));
  trashListeners.forEach((listener) => listener(items, null));
}

export function subscribeToTrashedProducts(callback) {
  if (!isFirebaseEnabled) {
    trashListeners.add(callback);
    const items = getLocalTrash();
    items.sort((a, b) => (b.trashedAtMs ?? 0) - (a.trashedAtMs ?? 0));
    callback(items, null);
    return () => {
      trashListeners.delete(callback);
    };
  }
  return onValue(
    ref(db, TRASH_ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      rows.sort((a, b) => (b.trashedAtMs ?? 0) - (a.trashedAtMs ?? 0));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}

// Soft-delete: moves a product out of the live catalog into trashedProducts,
// stamped with when it was trashed. Images are deliberately left alone in R2
// here — they're only cleaned up on permanent delete/expiry, since a trashed
// product can still be restored.
export function moveProductToTrash(product) {
  const { id } = product;
  if (!isFirebaseEnabled) {
    setLocalProducts(getLocalProducts().filter((p) => p.id !== id));
    notifyLocalListeners();
    const trash = getLocalTrash().filter((p) => p.id !== id);
    trash.push({ ...product, trashedAtMs: Date.now() });
    setLocalTrash(trash);
    notifyTrashListeners();
    return Promise.resolve();
  }
  return update(ref(db), {
    [`${TRASH_ROOT}/${id}`]: { ...product, trashedAt: serverTimestamp(), trashedAtMs: Date.now() },
    [`${ROOT}/${id}`]: null,
  });
}

export function restoreProductFromTrash(trashedProduct) {
  const { id, trashedAt: _trashedAt, trashedAtMs: _trashedAtMs, ...product } = trashedProduct;
  if (!isFirebaseEnabled) {
    setLocalTrash(getLocalTrash().filter((p) => p.id !== id));
    notifyTrashListeners();
    const products = getLocalProducts().filter((p) => p.id !== id);
    products.push({ id, ...product });
    setLocalProducts(products);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return update(ref(db), {
    [`${ROOT}/${id}`]: product,
    [`${TRASH_ROOT}/${id}`]: null,
  });
}

export function permanentlyDeleteTrashedProduct(id) {
  if (!isFirebaseEnabled) {
    setLocalTrash(getLocalTrash().filter((p) => p.id !== id));
    notifyTrashListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${TRASH_ROOT}/${id}`));
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

export function updateProductOutOfStock(productId, outOfStock) {
  if (!isFirebaseEnabled) {
    const products = getLocalProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.outOfStock = outOfStock;
      setLocalProducts(products);
      notifyLocalListeners();
    }
    return Promise.resolve();
  }
  return set(ref(db, `${ROOT}/${productId}/outOfStock`), outOfStock);
}

// Reduces stock for one (color, size) pair. Sizes with stock: null aren't
// tracked and are left untouched — only a size the admin has given an
// explicit stock count gets decremented.
function reduceColorStock(colors, colorName, sizeName, quantity) {
  if (!colors || !colorName) return colors;
  return colors.map((c) => {
    if (typeof c === 'string' || c.name !== colorName || !Array.isArray(c.sizes)) return c;
    return {
      ...c,
      sizes: c.sizes.map((s) => {
        if (s.size !== sizeName || s.stock === null || s.stock === undefined) return s;
        return { ...s, stock: Math.max(0, s.stock - quantity) };
      }),
    };
  });
}

// Reverses a prior reduceProductStock call — used when a local bill is
// cancelled or edited (the original line items' stock must be given back
// before the new/updated line items are deducted). Delegates to
// reduceProductStock with the quantity negated rather than duplicating the
// per-size/per-color traversal.
export function restockProductStock(productId, size, quantity, color) {
  return reduceProductStock(productId, size, -quantity, color);
}

export function reduceProductStock(productId, size, quantity, color) {
  if (!isFirebaseEnabled) {
    const products = getLocalProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.colors = reduceColorStock(product.colors, color, size, quantity);
      setLocalProducts(products);
      notifyLocalListeners();
    }
    return Promise.resolve();
  }

  const productRef = ref(db, `${ROOT}/${productId}`);
  return get(productRef).then((snapshot) => {
    if (snapshot.exists()) {
      const product = snapshot.val();
      if (product.colors) {
        return set(ref(db, `${ROOT}/${productId}/colors`), reduceColorStock(product.colors, color, size, quantity));
      }
    }
  });
}

// Sets an explicit "stock out" override for one color on a product,
// independent of that color's stock count — mirrors updateProductOutOfStock
// but scoped to a single color instead of the whole product.
export function updateProductColorOutOfStock(productId, colorName, outOfStock) {
  const applyToColors = (colors) =>
    (colors ?? []).map((c) => {
      const name = typeof c === 'string' ? c : c.name;
      if (name !== colorName) return c;
      const base = typeof c === 'string' ? { name: c, hex: null, sizes: [] } : c;
      return { ...base, outOfStock };
    });

  if (!isFirebaseEnabled) {
    const products = getLocalProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.colors = applyToColors(product.colors);
      setLocalProducts(products);
      notifyLocalListeners();
    }
    return Promise.resolve();
  }

  const productRef = ref(db, `${ROOT}/${productId}`);
  return get(productRef).then((snapshot) => {
    if (snapshot.exists()) {
      const product = snapshot.val();
      return set(ref(db, `${ROOT}/${productId}/colors`), applyToColors(product.colors));
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
