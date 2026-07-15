const HEIC_TYPE_RE = /heic|heif/i;

export function isHeicFile(file) {
  if (!file) return false;
  if (HEIC_TYPE_RE.test(file.type)) return true;
  return HEIC_TYPE_RE.test(file.name.split('.').pop() || '');
}

// Browsers can't decode/render HEIC/HEIF (no native <img> support), so any
// iPhone photo picked in that format needs converting to JPEG before it's
// previewed or uploaded.
export async function convertHeicFileToJpeg(file) {
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([jpegBlob], newName, { type: 'image/jpeg' });
}
