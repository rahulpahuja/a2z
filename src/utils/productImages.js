// Alt text for a product's primary image: the admin-written one when set, else the product name.
export const getProductAlt = (product) => product.alt || product.title || product.name || '';

export function getR2KeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    return parts[parts.length - 1];
  } catch {
    return null;
  }
}

// The URL to fetch when downloading an image as a blob. Stored product images point at the
// public r2.dev host, which sends no CORS header, so the browser blocks reading them. The
// upload worker serves the same keys with CORS enabled, so go through it when it is configured.
// Local (blob:/data:) previews and anything without a usable key are fetched as they are.
export function getDownloadFetchUrl(url, apiUrl) {
  if (!url || !apiUrl || /^(blob|data):/i.test(url)) return url;
  const key = getR2KeyFromUrl(url);
  if (!key) return url;
  // `key` comes from URL.pathname, so it is already percent-encoded; the worker decodes it once.
  return `${apiUrl.replace(/\/+$/, '')}/${key}`;
}

// Keys queued for deletion after a product save, minus any the saved product still uses.
// A replacement that reuses the old file name would otherwise be deleted along with it.
export function getKeysToDelete(removedKeys, keysInUse) {
  const inUse = new Set(keysInUse);
  return [...new Set(removedKeys)].filter((key) => !inUse.has(key));
}

export async function deleteProductImagesFromR2(product) {
  const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;
  const urls = product.images || (product.image ? [product.image] : []);
  await Promise.all(
    urls.map(async (url) => {
      const key = getR2KeyFromUrl(url);
      if (!key || !apiUrl) return;
      try {
        await fetch(`${apiUrl}/${key}`, { method: 'DELETE' });
      } catch (e) {
        console.error(`Failed to delete R2 file: ${key}`, e);
      }
    })
  );
}
