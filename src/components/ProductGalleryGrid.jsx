import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ProductImage from './ProductImage.jsx';
import VideoPlayer from './VideoPlayer.jsx';
import { aspectToRatio, getGridTiles, stepIndex } from '../utils/productGallery.js';
import './ProductGalleryGrid.css';

function MediaView({ item, alt, className }) {
  if (item.type === 'video') return <VideoPlayer src={item.src} className={className} />;
  return <ProductImage src={item.src} alt={alt} className={className} />;
}

// Full-screen viewer for every image/video of the product, reachable from the grid tiles.
function GalleryLightbox({ media, index, name, onClose, onChange }) {
  const closeRef = useRef(null);
  const item = media[index];

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') onChange(stepIndex(index, -1, media.length));
      else if (event.key === 'ArrowRight') onChange(stepIndex(index, 1, media.length));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, media.length, onChange, onClose]);

  if (!item) return null;
  // Rendered into <body>: an ancestor with a filter, transform or backdrop-filter (the product page
  // has one) would otherwise become the containing block of this fixed overlay and trap it inside
  // the page content instead of covering the window.
  return createPortal(
    <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${name} photos`} onClick={onClose}>
      <button ref={closeRef} type="button" className="gallery-lightbox__close" onClick={onClose} aria-label="Close gallery">
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <div className="gallery-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <MediaView item={item} alt={item.alt || `${name} ${index + 1}`} className="gallery-lightbox__media" />
      </div>
      {media.length > 1 && (
        <>
          <button
            type="button"
            className="gallery-lightbox__nav gallery-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              onChange(stepIndex(index, -1, media.length));
            }}
            aria-label="Previous"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <button
            type="button"
            className="gallery-lightbox__nav gallery-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              onChange(stepIndex(index, 1, media.length));
            }}
            aria-label="Next"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </>
      )}
      <p className="gallery-lightbox__count" aria-live="polite">
        {index + 1} / {media.length}
      </p>
    </div>,
    document.body
  );
}

// Four equal tiles, two across and two down. With more than four items the last tile shows
// "+N"; tapping any tile opens the viewer on that item.
export default function ProductGalleryGrid({ media, leadIndex = 0, name, dimmed = false, aspect }) {
  const [openIndex, setOpenIndex] = useState(null);
  const { tiles, extra } = getGridTiles(media, leadIndex);
  const close = useCallback(() => setOpenIndex(null), []);

  return (
    <>
      <div className="gallery-grid" role="list" aria-label={`${name} photos`} style={{ '--gallery-ratio': aspectToRatio(aspect) }}>
        {tiles.map(({ item, index }, position) => {
          const showExtra = extra > 0 && position === tiles.length - 1;
          return (
            <button
              key={index}
              type="button"
              role="listitem"
              className={`gallery-grid__tile${dimmed ? ' gallery-grid__tile--dimmed' : ''}`}
              onClick={() => setOpenIndex(index)}
              aria-label={`${item.type === 'video' ? 'Play video' : 'View photo'} ${index + 1} of ${media.length}${showExtra ? `, plus ${extra} more` : ''}`}
            >
              {item.type === 'video' ? (
                <span className="gallery-grid__video">
                  <span className="material-symbols-outlined" aria-hidden="true">play_circle</span>
                </span>
              ) : (
                <ProductImage src={item.src} alt={item.alt || `${name} ${index + 1}`} className="gallery-grid__img" />
              )}
              {showExtra && <span className="gallery-grid__more">+{extra}</span>}
            </button>
          );
        })}
      </div>
      {openIndex !== null && <GalleryLightbox media={media} index={openIndex} name={name} onClose={close} onChange={setOpenIndex} />}
    </>
  );
}
