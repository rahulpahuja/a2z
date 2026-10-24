import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext.jsx';
import { formatCurrency } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { readLikedShots, recordShotView, setShotLiked, subscribeToShotStats } from '../services/shotStats.js';
import { formatCount } from '../utils/formatCount.js';
import { buildShotUrl, parseShotParam, shareLink } from '../utils/shotShare.js';
import { logSelectItem, logShotDeepLink, logShotLike, logShotMuteToggle, logShotShare, logShotSwipe, logShotView } from '../services/analytics.js';
import './ShotsPage.css';

const SHOTS_TUTORIAL_KEY = 'a2z_shots_tutorial_seen';
// A view only counts once the shot has stayed on screen this long, so scrolling past does not.
const VIEW_AFTER_MS = 2000;

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

function ShotSlide({ shot, product, active, isNear, muted, onToggleMute, stats, liked, onLike, onShare, onView }) {
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => onView(shot), VIEW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [active, shot, onView]);

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

      <div className="shot-actions">
        <button
          type="button"
          className={`shot-actions__btn${liked ? ' shot-actions__btn--liked' : ''}`}
          onClick={() => onLike(shot)}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike this short' : 'Like this short'}
        >
          <span className={`material-symbols-outlined shot-actions__icon${liked ? ' shot-actions__icon--filled' : ''}`} aria-hidden="true">favorite</span>
          <span className="shot-actions__count" data-testid="shot-likes">{formatCount(stats.likes)}</span>
        </button>
        <div className="shot-actions__btn shot-actions__btn--static" role="img" aria-label={`${stats.views} views`}>
          <span className="material-symbols-outlined shot-actions__icon" aria-hidden="true">visibility</span>
          <span className="shot-actions__count" data-testid="shot-views">{formatCount(stats.views)}</span>
        </div>
        <button type="button" className="shot-actions__btn" onClick={() => onShare(shot, product)} aria-label="Share this short">
          <span className="material-symbols-outlined shot-actions__icon" aria-hidden="true">share</span>
          <span className="shot-actions__count">Share</span>
        </button>
      </div>

      {product && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-6 pb-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-headline-md text-headline-md text-white truncate">{product.title || product.name}</p>
            <p className="font-price-display text-price-display text-white/90 mt-1">{formatCurrency(product.price)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logSelectItem(product, 'Shots');
              navigate(`/products/${product.id}`);
            }}
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
  const location = useLocation();
  const { showToast } = useToast();
  const [stats, setStats] = useState({});
  const [likedShots, setLikedShots] = useState(readLikedShots);
  const requestedShotId = parseShotParam(location.search);
  const deepLinkHandled = useRef(null);
  const lastIndexRef = useRef(null);
  const shotsRef = useRef([]);

  useEffect(() => subscribeToShotStats(setStats), []);

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

  shotsRef.current = shots;

  const productsById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Opens the shot named in /shots?v=<id>. If it no longer exists (the video was removed or the
  // product's videos were reordered) the feed starts at the first shot and says so, once.
  useEffect(() => {
    if (!requestedShotId || shots.length === 0 || deepLinkHandled.current === requestedShotId) return;
    deepLinkHandled.current = requestedShotId;
    const index = shots.findIndex((shot) => shot.id === requestedShotId);
    logShotDeepLink(requestedShotId, index !== -1);
    if (index === -1) {
      showToast('That short is no longer available.');
      return;
    }
    setActiveIndex(index);
    containerRef.current?.children[index]?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedShotId, shots]);

  const handleView = useCallback(async (shot) => {
    const counted = await recordShotView(shot.id);
    logShotView(shot, counted);
  }, []);

  const handleLike = useCallback(
    async (shot) => {
      const shotId = shot.id;
      const next = !readLikedShots().has(shotId);
      setLikedShots((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(shotId);
        else copy.delete(shotId);
        return copy;
      });
      try {
        await setShotLiked(shotId, next);
        logShotLike(shot, next);
      } catch {
        setLikedShots(readLikedShots());
        showToast('Could not save your like. Please try again.');
      }
    },
    [showToast]
  );

  const handleShare = useCallback(
    async (shot, product) => {
      const name = product?.title || product?.name || 'this product';
      const result = await shareLink({
        title: `${name} | A2Z Collection`,
        text: `Watch ${name} on A2Z Collection`,
        url: buildShotUrl(shot.id, window.location.origin),
      });
      logShotShare(shot, result);
      if (result === 'copied') showToast('Link copied.');
      else if (result === 'failed') showToast('Could not share this short.');
    },
    [showToast]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const sections = Array.from(container.children);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const next = sections.indexOf(entry.target);
            setActiveIndex(next);
            // Only a real change of short counts as a swipe, not the first one shown on load.
            if (lastIndexRef.current !== null && lastIndexRef.current !== next) logShotSwipe(shotsRef.current[next] ?? { id: String(next) }, next);
            lastIndexRef.current = next;
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
              onToggleMute={() => {
                logShotMuteToggle(shot, !muted);
                setMuted((m) => !m);
              }}
              stats={stats[shot.id] ?? { views: 0, likes: 0 }}
              liked={likedShots.has(shot.id)}
              onLike={handleLike}
              onShare={handleShare}
              onView={handleView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
