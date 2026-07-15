const HEIC_TYPE_RE = /heic|heif/i;

export function isHeicFile(file) {
  if (!file) return false;
  if (HEIC_TYPE_RE.test(file.type)) return true;
  return HEIC_TYPE_RE.test(file.name.split('.').pop() || '');
}

// Browsers can't decode/render HEIC/HEIF (no native <img> support), so any
// iPhone photo picked in that format needs converting to PNG before it's
// previewed or uploaded.
export async function convertHeicFileToPng(file) {
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/png' });
  const pngBlob = Array.isArray(converted) ? converted[0] : converted;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.png');
  return new File([pngBlob], newName, { type: 'image/png' });
}
