/**
 * Helper to get the original, uncompressed, crystal clear image URL
 * for googleusercontent.com images.
 */
export function getHighResUrl(url) {
  if (typeof url !== 'string') return url;
  if (url.includes('googleusercontent.com') && !url.includes('=s')) {
    return `${url}=s0`;
  }
  return url;
}
