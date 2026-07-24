const EXTENSION_MIME_MAP = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
};

// Declaring the right MIME type on a <source> lets the browser check codec
// support up front (fast, clean "unsupported" signal) instead of guessing
// from bytes — this is what actually lets Safari play a raw .mov via
// video/quicktime while other browsers fail fast instead of hanging.
export function getVideoMimeType(url) {
  const ext = (String(url).split(/[?#]/)[0].match(/\.[^./]+$/) || [''])[0].toLowerCase();
  return EXTENSION_MIME_MAP[ext];
}
