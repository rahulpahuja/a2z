import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-hidden relative">
      <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto relative z-10">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim playfair">
          A2Z Collection
        </Link>
        <Link to="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">
          Back to Home
        </Link>
      </header>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="notfound-blob absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary-container/30 blur-3xl" />
        <div className="notfound-blob absolute bottom-0 -right-16 w-96 h-96 rounded-full bg-tertiary-container/30 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="notfound-blob absolute top-1/3 right-1/4 w-56 h-56 rounded-full bg-secondary-container/20 blur-3xl" style={{ animationDelay: '4s' }} />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-16 text-center">
        <span className="material-symbols-outlined notfound-float text-primary dark:text-primary-fixed-dim text-5xl mb-4">
          styler
        </span>

        <h1 className="notfound-digits playfair font-display-lg text-[96px] md:text-[160px] leading-none font-bold tracking-tight">
          404
        </h1>

        <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-outline mt-2 mb-4">
          Page Not Found
        </p>

        <h2 className="font-headline-md text-headline-md-mobile md:text-headline-md text-on-surface mb-4 max-w-xl">
          This piece isn't in our collection.
        </h2>

        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mb-10">
          The page you're looking for may have been moved, renamed, or never existed.
          Let's get you back to browsing.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/"
            className="bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
          <Link
            to="/products"
            className="bg-transparent border border-outline text-on-surface font-label-caps text-label-caps px-8 py-4 rounded-lg uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
          >
            Browse Collection
          </Link>
        </div>

        <span className="material-symbols-outlined notfound-float-delayed text-tertiary/60 text-3xl mt-14">
          diamond
        </span>
      </main>
    </div>
  );
}
