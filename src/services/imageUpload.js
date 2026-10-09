import { getR2KeyFromUrl } from '../utils/productImages.js';

export const uploadImageToExternalServer = async (file, customName) => {
  const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;
  if (apiUrl) {
    const formData = new FormData();
    formData.append('file', file, customName);

    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  }

  await new Promise((resolve) => setTimeout(resolve, 800)); // simulate network delay
  return `https://external-image-server.com/uploads/${customName}`;
};

// Best-effort cleanup of a replaced or removed upload. The caller has already saved the
// change that stops referencing the file, so a failure here only leaves an orphan behind.
export async function deleteUploadedImage(url) {
  const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;
  const key = getR2KeyFromUrl(url);
  if (!apiUrl || !key) return;
  try {
    await fetch(`${apiUrl}/${key}`, { method: 'DELETE' });
  } catch (err) {
    console.error(`Failed to delete uploaded image: ${key}`, err);
  }
}
