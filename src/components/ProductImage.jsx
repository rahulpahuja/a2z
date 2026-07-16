import { useEffect, useState } from 'react';
import { decompressImageUrl, isCompressedImageUrl } from '../utils/imageCompression.js';

// Session-lived cache so the same .a2ic URL is only downloaded + decompressed
// once, even though it may appear on multiple pages (listing, detail, cart).
const decodedUrlCache = new Map();

function getDecodedUrl(url) {
  if (!decodedUrlCache.has(url)) {
    decodedUrlCache.set(
      url,
      decompressImageUrl(url).catch((err) => {
        decodedUrlCache.delete(url);
        throw err;
      })
    );
  }
  return decodedUrlCache.get(url);
}

/**
 * Drop-in replacement for <img src>. Plain image URLs pass straight through;
 * .a2ic URLs are downloaded and run through the lossless decompressor first.
 */
export default function ProductImage({ src, alt = '', className, style, onLoad, ...rest }) {
  const compressed = isCompressedImageUrl(src);
  const [resolvedSrc, setResolvedSrc] = useState(compressed ? null : src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!isCompressedImageUrl(src)) {
      setResolvedSrc(src);
      return;
    }

    let cancelled = false;
    setResolvedSrc(null);
    getDecodedUrl(src)
      .then((objectUrl) => {
        if (!cancelled) setResolvedSrc(objectUrl);
      })
      .catch((err) => {
        console.error('Failed to decompress image:', src, err);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || failed) {
    return <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} {...rest} />;
  }

  if (!resolvedSrc) {
    return (
      <div
        className={className}
        style={{ ...style, background: 'var(--color-surface-container, #eee)' }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return <img src={resolvedSrc} alt={alt} className={className} style={style} onLoad={onLoad} {...rest} />;
}
