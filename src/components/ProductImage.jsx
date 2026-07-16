// Drop-in <img> used across product pages. Images are now plain WebP/JPEG
// (or blob: previews) so this is just a passthrough — kept as one component
// so upload/render changes don't need to touch every call site.
export default function ProductImage({ src, alt = '', className, style, onLoad, ...rest }) {
  return <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} {...rest} />;
}
