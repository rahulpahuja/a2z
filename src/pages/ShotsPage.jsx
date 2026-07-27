import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToShots } from '../services/shots.js';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';

function ShotSlide({ shot, product, active }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  return (
    <section className="relative w-full h-full snap-start snap-always shrink-0 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={shot.videoUrl}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted={muted}
        onClick={() => setMuted((m) => !m)}
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute top-4 right-4 z-10 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-colors"
      >
        <span className="material-symbols-outlined">{muted ? 'volume_off' : 'volume_up'}</span>
      </button>

      {product && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-6 pb-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-headline-md text-headline-md text-white truncate">{product.title || product.name}</p>
            <p className="font-price-display text-price-display text-white/90 mt-1">{formatCurrency(product.price)}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/product/${product.id}`)}
            className="shrink-0 bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-full uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg"
          >
            Buy Now
          </button>
        </div>
      )}
    </section>
  );
}

export default function ShotsPage() {
  const [shots, setShots] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const { products } = useProducts();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToShots((rows) => setShots(rows.filter((s) => s.enabled)));
    return unsub;
  }, []);

  const productsById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const sections = Array.from(container.children);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(sections.indexOf(entry.target));
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [shots.length]);

  return (
    <div className="fixed inset-0 bg-black z-[100]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Close"
        className="absolute top-4 left-4 z-20 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-colors"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      {shots.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          <p className="font-body-lg text-body-lg text-white/70">No shots yet — check back soon.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth hide-scrollbar"
        >
          {shots.map((shot, index) => (
            <ShotSlide key={shot.id} shot={shot} product={productsById.get(shot.productId)} active={index === activeIndex} />
          ))}
        </div>
      )}
    </div>
  );
}
