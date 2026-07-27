import { useNavigate } from 'react-router-dom';

export default function ShotsFab() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/shots')}
      aria-label="Watch Shots"
      className="md:hidden fixed bottom-6 left-6 z-[150] w-14 h-14 rounded-full bg-inverse-surface text-white flex flex-col items-center justify-center gap-0.5 shadow-lg hover:scale-105 transition-transform"
    >
      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        bolt
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Shots</span>
    </button>
  );
}
