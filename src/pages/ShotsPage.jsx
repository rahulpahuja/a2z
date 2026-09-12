import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';

const SHOTS_TUTORIAL_KEY = 'a2z_shots_tutorial_seen';

function hasSeenShotsTutorial() {
  try {
    return Boolean(localStorage.getItem(SHOTS_TUTORIAL_KEY));
  } catch {
    return false;
  }
}

function markShotsTutorialSeen() {
  try {
    localStorage.setItem(SHOTS_TUTORIAL_KEY, '1');
  } catch {
    // ignore storage failures (e.g. private mode)
  }
}

function ShotSlide({ shot, product, active, isNear, muted, onToggleMute }) {
  const videoRef = useRef(null);
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
        // Only the active slide and its immediate neighbors get a real src —
        // every shot mounting a video at once was what made the feed so slow
        // to load, since the browser tried to fetch every clip immediately.
        src={isNear ? shot.videoUrl : undefined}
        preload={active ? 'auto' : isNear ? 'metadata' : 'none'}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted={muted}
        onClick={onToggleMute}
      />
      <button
        type="button"
        onClick={onToggleMute}
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
            onClick={() => navigate(`/products/${product.id}`)}
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenShotsTutorial());
  const containerRef = useRef(null);
  const { products } = useProducts();
  const navigate = useNavigate();

  const dismissTutorial = () => {
    setShowTutorial(false);
    markShotsTutorialSeen();
  };

  // Dismiss the instant the visitor actually scrolls the reel — a direct
  // native scroll event, rather than the derived `activeIndex` state, since
  // the IntersectionObserver driving that also fires while it's still
  // settling right after mount, which dismissed this before it was ever seen.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !showTutorial) return undefined;
    const handleScroll = () => dismissTutorial();
    container.addEventListener('scroll', handleScroll, { once: true, passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTutorial]);

  // Otherwise auto-dismiss after a few seconds so it never lingers over the video.
  useEffect(() => {
    if (!showTutorial) return undefined;
    const timeout = setTimeout(dismissTutorial, 3500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTutorial]);

  // Auto-populated from every product that has a video uploaded (via Product
  // Videos) — no separate admin curation step, so newly uploaded product
  // videos show up here automatically.
  const shots = useMemo(() => {
    const rows = [];
    products.forEach((product) => {
      (product.videos ?? []).forEach((videoUrl, index) => {
        rows.push({ id: `${product.id}_${index}`, productId: product.id, videoUrl });
      });
    });
    return rows;
  }, [products]);

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

      {showTutorial && shots.length > 0 && (
        // pointer-events-none: purely a visual hint, so a real swipe reaches
        // the scroll container underneath instead of being absorbed here.
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm pointer-events-none">
          <span className="material-symbols-outlined text-white text-6xl animate-bounce">swipe_up</span>
          <p className="font-label-caps text-label-caps text-white uppercase tracking-widest">Swipe up for more</p>
        </div>
      )}

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
            <ShotSlide
              key={shot.id}
              shot={shot}
              product={productsById.get(shot.productId)}
              active={index === activeIndex}
              isNear={Math.abs(index - activeIndex) <= 1}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
