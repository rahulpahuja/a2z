import { useCallback, useState } from 'react';
import { getVideoMimeType } from '../utils/videoMime.js';

// A cached video can already have data by the time React attaches the
// onLoadedData listener, which would otherwise leave it stuck shimmering.
function isAlreadyPlayable(video) {
  return !!video && video.readyState >= 2; // HAVE_CURRENT_DATA or higher
}

// A <video> that plays MP4 (our transcoded storage format) and also gives
// raw .mov/.webm/etc a fair shot — Safari can play HEVC .mov natively when
// the source is correctly typed video/quicktime, and other browsers fail
// fast into the fallback message instead of showing a stuck black box.
export default function VideoPlayer({ src, className, autoPlay, loop, muted }) {
  const [unsupported, setUnsupported] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);

  // Reset the shimmer/error state synchronously when the src prop changes,
  // so switching videos (e.g. a product's video list) shimmers again
  // instead of showing the previous video's stale loaded/error state.
  if (src !== lastSrc) {
    setLastSrc(src);
    setLoaded(false);
    setUnsupported(false);
  }

  const checkAlreadyLoaded = useCallback((video) => {
    if (isAlreadyPlayable(video)) setLoaded(true);
  }, []);

  if (!src) return null;

  if (unsupported) {
    return (
      <div className={`${className ?? ''} flex flex-col items-center justify-center text-center p-6 bg-surface-container-high`}>
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">error</span>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          This video format isn't supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 img-loading-shimmer" />}
      <video
        ref={checkAlreadyLoaded}
        key={src}
        controls
        playsInline
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        className={className}
        onLoadedData={() => setLoaded(true)}
        onError={() => {
          setLoaded(true);
          setUnsupported(true);
        }}
      >
        <source src={src} type={getVideoMimeType(src)} />
        Your browser doesn't support embedded video playback.
      </video>
    </div>
  );
}
