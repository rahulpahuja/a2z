import { useEffect, useRef } from 'react';

export default function LuxuryBackdrop() {
  const spotlightRef = useRef(null);

  useEffect(() => {
    let animationFrameId = null;

    const handleMouseMove = (e) => {
      if (animationFrameId) return;
      animationFrameId = requestAnimationFrame(() => {
        if (spotlightRef.current) {
          spotlightRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
        }
        animationFrameId = null;
      });
    };

    const handleMouseEnter = () => {
      if (spotlightRef.current) spotlightRef.current.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      if (spotlightRef.current) spotlightRef.current.style.opacity = '0';
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.body.addEventListener('mouseenter', handleMouseEnter);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-[#fefcfb]">
      {/* Repeating fine luxury grid lines */}
      <div
        className="absolute inset-0 opacity-[0.25] transition-opacity duration-500"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(var(--color-primary-rgb, 172, 36, 113), 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(var(--color-primary-rgb, 172, 36, 113), 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Thin elegant vertical architectural layout lines */}
      <div className="absolute left-[10%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute right-[10%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      {/* Floating Animated Mesh Gradient Blobs */}
      {/* Primary Brand Color Glow */}
      <div className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[100px] animate-float-slow-1 will-change-transform transform-gpu" />

      {/* Sage Green Glow */}
      <div className="absolute bottom-[10%] right-[-5%] w-[650px] h-[650px] rounded-full bg-secondary/[0.05] blur-[120px] animate-float-slow-2 will-change-transform transform-gpu" />

      {/* Terracotta/Peach Glow */}
      <div className="absolute top-[35%] right-[15%] w-[500px] h-[500px] rounded-full bg-[#ecbda4]/[0.12] blur-[90px] animate-float-slow-3 will-change-transform transform-gpu" />

      {/* Interactive Cursor Spotlight (zero React re-renders) */}
      <div
        ref={spotlightRef}
        className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb,172,36,113),0.07)_0%,rgba(201,238,169,0.03)_50%,transparent_100%)] blur-[40px] opacity-0 transition-opacity duration-300 pointer-events-none will-change-transform transform-gpu"
        style={{ transform: 'translate3d(-1000px, -1000px, 0)' }}
      />
    </div>
  );
}
