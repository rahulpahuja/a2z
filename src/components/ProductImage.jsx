import { useCallback, useState } from 'react';

// A cached image can finish loading before React attaches the onLoad
// listener, which would otherwise leave it stuck shimmering forever.
function isAlreadyLoaded(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

// Drop-in <img> used across product pages. Images are now plain WebP/JPEG
// (or blob: previews) so this is just a passthrough — kept as one component
// so upload/render changes don't need to touch every call site.
//
// Shows a shimmering placeholder (via the img-loading-shimmer background,
// defined in common.css) for as long as the image is still downloading, and
// removes it the instant the browser finishes decoding it — no separate
// spinner element needed, so every existing caller's className/style
// (positioning, object-fit, hover transforms, etc.) keeps working untouched.
export default function ProductImage({ src, alt = '', className, style, onLoad, onError, ...rest }) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = (event) => {
    setLoaded(true);
    onLoad?.(event);
  };

  const handleError = (event) => {
    // Stop shimmering on a broken image too — nothing is ever going to load.
    setLoaded(true);
    onError?.(event);
  };

  const checkAlreadyLoaded = useCallback((img) => {
    if (isAlreadyLoaded(img)) setLoaded(true);
  }, []);

  return (
    <img
      ref={checkAlreadyLoaded}
      src={src}
      alt={alt}
      className={`${className || ''} ${loaded ? '' : 'img-loading-shimmer'}`}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  );
}
