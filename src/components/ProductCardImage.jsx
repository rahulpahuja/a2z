import { useEffect, useRef, useState } from 'react';
import ProductImage from './ProductImage.jsx';
import { useStorefrontTheme } from '../context/StorefrontThemeContext.jsx';

export default function ProductCardImage({ images, alt, className = '', loading = 'lazy', activeIndex = 0 }) {
  const { theme } = useStorefrontTheme();
  // After this many ms of continuous hover, start auto-sliding through the
  // product's other images (one slide in from the right per interval).
  const startDelayMs = Number(theme?.productHoverSlideDelayMs) || 1000;
  const slideIntervalMs = Number(theme?.productHoverSlideIntervalMs) || 1800;
  const list = (images ?? []).filter(Boolean);
  const [index, setIndex] = useState(activeIndex);
  const startTimeout = useRef(null);
  const slideInterval = useRef(null);
  const leaveTimeout = useRef(null);
  const isHovering = useRef(false);

  const clearTimers = () => {
    clearTimeout(startTimeout.current);
    clearInterval(slideInterval.current);
    clearTimeout(leaveTimeout.current);
    startTimeout.current = null;
    slideInterval.current = null;
    leaveTimeout.current = null;
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
    isHovering.current = true;
    // Cancel a pending "actually left" reset from a just-prior blip instead
    // of restarting the whole cycle — a scroll or edge-jitter mouseleave
    // immediately followed by re-enter shouldn't interrupt an in-progress
    // slide, or it gets stuck oscillating between the first two images.
    clearTimeout(leaveTimeout.current);
    leaveTimeout.current = null;
    if (startTimeout.current || slideInterval.current) return;
    startTimeout.current = setTimeout(() => {
      slideInterval.current = setInterval(() => {
        setIndex((prev) => (prev + 1) % list.length);
      }, slideIntervalMs);
    }, startDelayMs);
  };

  const handleMouseLeave = () => {
    isHovering.current = false;
    leaveTimeout.current = setTimeout(() => {
      if (isHovering.current) return;
      clearTimers();
      setIndex(activeIndex);
    }, 250);
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
