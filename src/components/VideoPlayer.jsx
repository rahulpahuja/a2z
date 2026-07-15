import { useState } from 'react';
import { getVideoMimeType } from '../utils/videoMime.js';

// A <video> that plays MP4 (our transcoded storage format) and also gives
// raw .mov/.webm/etc a fair shot — Safari can play HEVC .mov natively when
// the source is correctly typed video/quicktime, and other browsers fail
// fast into the fallback message instead of showing a stuck black box.
export default function VideoPlayer({ src, className, autoPlay, loop, muted }) {
  const [unsupported, setUnsupported] = useState(false);

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
    <video
      key={src}
      controls
      playsInline
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      className={className}
      onError={() => setUnsupported(true)}
    >
      <source src={src} type={getVideoMimeType(src)} />
      Your browser doesn't support embedded video playback.
    </video>
  );
}
