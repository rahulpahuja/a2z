import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function MobileNavDrawer({ open, onClose, links }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-[80vw] max-w-[320px] bg-surface dark:bg-surface-container-highest shadow-2xl flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <span className="font-headline-md-mobile text-headline-md-mobile font-bold text-primary dark:text-primary-fixed-dim playfair">
            A2Z Collection
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="text-on-surface hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <nav className="flex flex-col">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={onClose}
              className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface py-4 border-b border-outline-variant/20 hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
