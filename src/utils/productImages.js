export function getR2KeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    return parts[parts.length - 1];
  } catch {
    return null;
  }
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
