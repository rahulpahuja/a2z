import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

const VALUES = [
  {
    icon: 'diamond',
    title: 'Handcrafted Quality',
    body: 'Every piece passes through the hands of skilled artisans before it reaches you — no shortcuts, no mass production.',
  },
  {
    icon: 'eco',
    title: 'Sustainable Sourcing',
    body: 'We work directly with local weaving and printing units, keeping our supply chain short and our communities supported.',
  },
  {
    icon: 'auto_awesome',
    title: 'Vibrant Elegance',
    body: 'We bridge centuries-old craftsmanship with a modern, editorial sensibility, so heritage never feels dated.',
  },
];

export default function AboutUsPage() {
  return (
    <>
      <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          A2Z Collection
        </Link>
        <Link to="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">
          Back to Home
        </Link>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Our Story</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-4 playfair">
            About A2Z Collection
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            A2Z Collection brings traditional Indian craftsmanship to a modern, global wardrobe — one handcrafted
            saree, lehenga, and kurti at a time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto items-center mb-16">
          <div className="flex flex-col gap-4">
            <h2 className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md text-on-surface playfair">
              Where We're From
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              We're rooted in <strong className="text-on-surface font-semibold">Jaipur, Rajasthan</strong> — the
              historic "Pink City," renowned for centuries of hand-block printing, Kundan jewellery-making, and
              textile artistry. That heritage runs through every collection we design.
            </p>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              What began as a small family atelier has grown into a studio that partners with artisan clusters
              across Rajasthan and Gujarat, bringing their work to customers across India and beyond.
            </p>
          </div>
          <div className="bg-surface-container-low border border-tertiary-container/30 rounded-xl p-8 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">storefront</span>
              </span>
              <div>
                <p className="font-title-sm text-title-sm text-on-surface">Visit Our Studio</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">By appointment welcome</p>
              </div>
            </div>
            <div className="border-t border-outline-variant/30 pt-4 flex flex-col gap-1">
              <p className="font-body-sm text-body-sm text-on-surface">
                A2Z Collection Studio, Bapu Bazaar Road,
                <br />
                Jaipur, Rajasthan 302003, India
              </p>
            </div>
            <div className="border-t border-outline-variant/30 pt-4 flex flex-col gap-1">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">
                Studio Hours
              </p>
              <p className="font-body-sm text-body-sm text-on-surface">Mon – Sat, 10:00 AM – 8:00 PM IST</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Closed on Sundays &amp; public holidays</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {VALUES.map((value) => (
            <div key={value.title} className="flex flex-col items-center text-center gap-3 p-6">
              <span className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">{value.icon}</span>
              </span>
              <h3 className="font-title-sm text-title-sm text-on-surface">{value.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{value.body}</p>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
