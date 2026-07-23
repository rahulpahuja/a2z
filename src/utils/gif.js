const GIF_TYPE_RE = /gif/i;

export function isGifFile(file) {
  if (!file) return false;
  if (GIF_TYPE_RE.test(file.type)) return true;
  return GIF_TYPE_RE.test(file.name.split('.').pop() || '');
}
