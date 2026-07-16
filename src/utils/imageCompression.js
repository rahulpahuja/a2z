// Resizes an uploaded photo to a sane max dimension and re-encodes it as
// WebP (falling back to JPEG on browsers whose canvas can't encode WebP),
// so product photos actually shrink before upload instead of shipping
// multi-megabyte camera originals.

const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

function scaledSize(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encode failed'))), type, quality);
  });
}

function toOutputName(originalName, extension) {
  const base = originalName.replace(/\.[^./]+$/, '') || 'image';
  return `${base}${extension}`;
}

/**
 * Resizes + re-encodes an image File for upload. Returns the encoded File
 * (ready to upload) plus a local preview blob: URL for the same bytes.
 */
export async function compressImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = scaledSize(bitmap.width, bitmap.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, 'image/webp', QUALITY);
  let extension = '.webp';
  if (blob.type !== 'image/webp') {
    // Browser silently ignored the requested type (no WebP encoder) — fall back to JPEG.
    blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY);
    extension = '.jpg';
  }

  const outputFile = new File([blob], toOutputName(file.name, extension), { type: blob.type });

  return {
    file: outputFile,
    extension,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
    originalSize: file.size,
    compressedSize: outputFile.size,
  };
}
