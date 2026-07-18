import { useEffect, useRef, useState } from 'react';
import ProductImage from './ProductImage.jsx';

// After this many ms of continuous hover, start auto-sliding through the
// product's other images (one slide in from the right per interval).
const START_DELAY_MS = 1500;
const SLIDE_INTERVAL_MS = 1800;

export default function ProductCardImage({ images, alt, className = '', loading = 'lazy', activeIndex = 0 }) {
  const list = (images ?? []).filter(Boolean);
  const [index, setIndex] = useState(activeIndex);
  const startTimeout = useRef(null);
  const slideInterval = useRef(null);

  const clearTimers = () => {
    clearTimeout(startTimeout.current);
    clearInterval(slideInterval.current);
    startTimeout.current = null;
    slideInterval.current = null;
  };

  useEffect(() => clearTimers, []);

  // Stay in sync with an externally-selected image (e.g. a thumbnail/color
  // pick) whenever we're not mid-hover-slide.
  useEffect(() => {
    setIndex(activeIndex);
  }, [activeIndex]);

  if (list.length === 0) return null;

  if (list.length === 1) {
    return <ProductImage src={list[0]} alt={alt} className={className} loading={loading} />;
  }

  const handleMouseEnter = () => {
    clearTimers();
    startTimeout.current = setTimeout(() => {
      slideInterval.current = setInterval(() => {
        setIndex((prev) => (prev + 1) % list.length);
      }, SLIDE_INTERVAL_MS);
    }, START_DELAY_MS);
  };

  const handleMouseLeave = () => {
    clearTimers();
    setIndex(activeIndex);
  };

  return (
    <div className="absolute inset-0" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {list.map((src, i) => (
        <ProductImage
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          loading={loading}
          className={`absolute inset-0 ${className}`}
          style={{ transform: `translateX(${(i - index) * 100}%)`, transition: 'transform 700ms ease-in-out' }}
        />
      ))}
    </div>
  );
}
