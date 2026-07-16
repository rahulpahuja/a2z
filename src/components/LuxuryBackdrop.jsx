import { useState, useEffect } from 'react';

export default function LuxuryBackdrop() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseenter', handleMouseEnter);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
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
            linear-gradient(to right, rgba(172, 36, 113, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(172, 36, 113, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Thin elegant vertical architectural layout lines */}
      <div className="absolute left-[10%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute right-[10%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      {/* Floating Animated Mesh Gradient Blobs */}
      {/* Pink/Rani Pink Glow */}
      <div className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[120px] animate-float-slow-1" />

      {/* Sage Green Glow */}
      <div className="absolute bottom-[10%] right-[-5%] w-[650px] h-[650px] rounded-full bg-secondary/[0.05] blur-[140px] animate-float-slow-2" />

      {/* Terracotta/Peach Glow */}
      <div className="absolute top-[35%] right-[15%] w-[500px] h-[500px] rounded-full bg-[#ecbda4]/[0.12] blur-[100px] animate-float-slow-3" />

      {/* Interactive Cursor Spotlight */}
      {isHovered && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,176,208,0.08)_0%,rgba(201,238,169,0.04)_50%,transparent_100%)] blur-[50px] transition-opacity duration-300 pointer-events-none"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
        />
      )}

      {/* SVG Fine-grain Film Noise Overlay */}
      <svg className="absolute inset-0 opacity-[0.015] mix-blend-overlay w-full h-full">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
}
