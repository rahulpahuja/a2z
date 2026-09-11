import { useCallback, useEffect, useRef, useState } from 'react';

// A cached image can finish loading before React attaches the onLoad
// listener, which would otherwise leave it stuck shimmering forever.
function isAlreadyLoaded(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

// Once an image scrolls this far past the viewport, its decoded bitmap is
// released (src cleared) instead of staying resident — long product grids
// (hundreds of photos after a few "Load More" taps) would otherwise keep
// every decoded image in memory at once. Re-entering this margin restores
// `src`, which is typically an instant, already-cached reload rather than a
// fresh download.
const RECYCLE_ROOT_MARGIN = '1200px 0px';

// Drop-in <img> used across product pages. Images are plain WebP/JPEG (or
// blob: previews); this wraps that passthrough with two behaviors so no
// call site has to think about them:
//
// 1. Shows a shimmering placeholder (via the img-loading-shimmer background,
//    defined in common.css) for as long as the image is still downloading,
//    and removes it the instant the browser finishes decoding it.
// 2. Recycles the underlying image data when scrolled far out of view (see
//    RECYCLE_ROOT_MARGIN) to bound memory use on long lists, the same way a
//    native list view recycles offscreen item views instead of keeping them
//    all alive.
export default function ProductImage({ src, alt = '', className, style, onLoad, onError, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [inRange, setInRange] = useState(true);
  const imgRef = useRef(null);

  const handleLoad = (event) => {
    setLoaded(true);
    onLoad?.(event);
  };

  const handleError = (event) => {
    // Stop shimmering on a broken image too — nothing is ever going to load.
    setLoaded(true);
    onError?.(event);
  };

  const setImgRef = useCallback((img) => {
    imgRef.current = img;
    if (isAlreadyLoaded(img)) setLoaded(true);
  }, []);

  useEffect(() => {
    const el = imgRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInRange(entry.isIntersecting);
        if (!entry.isIntersecting) setLoaded(false);
      },
      { rootMargin: RECYCLE_ROOT_MARGIN }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={setImgRef}
      src={inRange ? src : undefined}
      alt={alt}
      className={`${className || ''} ${loaded ? '' : 'img-loading-shimmer'}`}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  );
}
