import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToJobs } from '../services/jobs.js';
import SiteFooter from '../components/SiteFooter.jsx';

export default function CareersPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToJobs((rows) => {
      setJobs(rows);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

      <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="text-center mb-12">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Join Us</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-4 playfair">
            Careers at A2Z Collection
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            We're a small team obsessed with craftsmanship. Here's what we're hiring for right now.
          </p>
        </div>

        {loading ? (
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">Loading openings…</p>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center bg-surface-container-low border border-tertiary-container/30 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant">work_off</span>
            <p className="font-title-sm text-title-sm text-on-surface">No Openings Currently</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              We don't have any open positions at the moment, but check back soon — or{' '}
              <Link to="/contact-us" className="text-primary hover:underline">reach out</Link> if you think you'd
              be a great fit anyway.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map((job) => (
              <div key={job.id} className="p-6 bg-surface-container-low border border-tertiary-container/30 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h2 className="font-title-sm text-title-sm text-on-surface">{job.title}</h2>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-label-caps text-[10px] uppercase tracking-wider">
                    {job.type}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mb-3">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {job.location}
                </p>
                {job.description && (
                  <p className="font-body-lg text-body-lg text-on-surface-variant">{job.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
