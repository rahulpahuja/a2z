import { useCallback, useEffect, useState } from 'react';
import { fetchDatabaseUsage } from '../../services/dbUsage.js';
import { formatMb, usageLevel, usedPercent } from '../../utils/dbUsage.js';

const BAR_COLOUR = { ok: 'bg-primary', warn: 'bg-secondary', critical: 'bg-error' };
const TOP_NODES = 8;

// How much of the Firebase Realtime Database's storage allowance is used, in MB, with the biggest areas.
export default function DatabaseUsageCard() {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh) => {
    setLoading(true);
    setError('');
    try {
      setUsage(await fetchDatabaseUsage({ refresh }));
    } catch (err) {
      setError(err.message || 'Could not load database usage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const percent = usage ? usedPercent(usage.totalBytes, usage.limitBytes) : 0;
  const level = usageLevel(percent);
  return (
    <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30" aria-labelledby="db-usage-title">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 id="db-usage-title" className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[1.25rem]">local_fire_department</span>
          Firebase database usage
        </h2>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="border border-primary text-primary font-label-caps text-label-caps px-4 py-2 rounded-lg uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50"
        >
          {loading ? 'Measuring…' : 'Measure again'}
        </button>
      </div>

      {error && <p role="alert" className="font-body-sm text-[0.75rem] text-error">{error}</p>}
      {!usage && loading && !error && <p className="font-body-sm text-[0.75rem] text-on-surface-variant">Measuring the database…</p>}

      {usage && (
        <>
          <p className="font-headline-md-mobile text-headline-md-mobile text-on-surface">
            {formatMb(usage.totalBytes)} <span className="text-on-surface-variant text-[1rem]">of {formatMb(usage.limitBytes)} used ({percent.toFixed(1)}%)</span>
          </p>
          <div
            className="h-3 w-full rounded-full bg-surface-variant overflow-hidden mt-3"
            role="progressbar"
            aria-label="Database storage used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <div className={`h-full rounded-full ${BAR_COLOUR[level]}`} style={{ width: `${percent}%` }} />
          </div>
          {level !== 'ok' && (
            <p className="font-body-sm text-[0.75rem] text-error mt-2">
              {level === 'critical' ? 'Almost full: ' : 'Getting full: '}
              {formatMb(usage.limitBytes - usage.totalBytes)} left. Clear old data or upgrade the Firebase plan before it runs out.
            </p>
          )}
          {usage.partial && (
            <p className="font-body-sm text-[0.75rem] text-on-surface-variant mt-2">
              The database took too long to measure, so these figures are a minimum. Not counted: {usage.skipped.join(', ')}.
            </p>
          )}

          <table className="w-full mt-5 text-[0.75rem]">
            <caption className="sr-only">Largest areas of the database</caption>
            <thead>
              <tr className="text-left text-on-surface-variant">
                <th className="font-normal pb-1">Area</th>
                <th className="font-normal pb-1 text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              {usage.nodes.slice(0, TOP_NODES).map((node) => (
                <tr key={node.name} className="border-t border-outline-variant/20">
                  <td className="py-1.5 font-mono text-on-surface">{node.name}</td>
                  <td className="py-1.5 font-mono text-on-surface text-right">{formatMb(node.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[0.625rem] text-on-surface-variant/70 mt-3">
            Measured {new Date(usage.measuredAt).toLocaleString('en-IN')}{usage.cached ? ' (saved result, press Measure again for a fresh one)' : ''}. This is
            an estimate from the size of the stored data; the Firebase console may show a slightly different figure. Images are not counted: they are stored in Cloudflare R2.
          </p>
        </>
      )}
    </section>
  );
}
