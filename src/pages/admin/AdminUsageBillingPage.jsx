import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';

const SESSION_KEY = 'a2z_usage_billing_key';
const apiUrl = import.meta.env.VITE_USAGE_BILLING_API_URL;

const usd = (value) => (typeof value === 'number' ? `$${value.toFixed(2)}` : '—');

function StatCard({ title, icon, data }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-3">
      <h3 className="font-title-sm text-[14px] text-on-surface font-semibold flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
        {title}
      </h3>
      {data?.error ? (
        <p className="font-body-sm text-[12px] text-error">{data.error}</p>
      ) : data?.status === 'pending' ? (
        <p className="font-body-sm text-[12px] text-on-surface-variant italic">{data.note || 'Not yet integrated.'}</p>
      ) : (
        <dl className="flex flex-col gap-1.5">
          {Object.entries(data ?? {})
            .filter(([key]) => key !== 'note' && key !== 'ops_by_action')
            .map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 text-[12px]">
                <dt className="text-on-surface-variant capitalize">{key.replace(/_/g, ' ')}</dt>
                <dd className="text-on-surface font-mono text-right">
                  {typeof value === 'number' && /cost|price/.test(key)
                    ? usd(value)
                    : typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                </dd>
              </div>
            ))}
          {data?.note && <p className="text-[10px] text-on-surface-variant/60 mt-1">{data.note}</p>}
        </dl>
      )}
    </div>
  );
}

export default function AdminUsageBillingPage() {
  const { showToast } = useToast();
  const [sharedKey, setSharedKey] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    if (!apiUrl) {
      setError('VITE_USAGE_BILLING_API_URL is not set — the worker has not been deployed/configured yet.');
      return;
    }
    if (!sharedKey.trim()) {
      showToast('Enter the shared key first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${sharedKey.trim()}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      setReport(data);
      sessionStorage.setItem(SESSION_KEY, sharedKey.trim());
    } catch (err) {
      setError(err.message || 'Could not load usage/billing data.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sharedKey.trim() && apiUrl) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Usage & Billing</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Live usage/estimated cost across R2, MSG91, Firebase, Netlify, and ShipPrime — served by the{' '}
          <code className="font-mono text-[12px]">usage-billing-worker</code>.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        {!apiUrl && (
          <section className="bg-error/10 border border-error/30 rounded-xl p-6">
            <p className="font-body-md text-body-md text-error">
              <code className="font-mono text-[12px]">VITE_USAGE_BILLING_API_URL</code> isn't set. Deploy{' '}
              <code className="font-mono text-[12px]">usage-billing-worker</code> (fill in real values in its{' '}
              <code className="font-mono text-[12px]">wrangler.toml</code> and secrets, then <code className="font-mono text-[12px]">wrangler deploy</code>),
              then add its URL to <code className="font-mono text-[12px]">.env</code> as{' '}
              <code className="font-mono text-[12px]">VITE_USAGE_BILLING_API_URL</code>.
            </p>
          </section>
        )}

        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Access</h2>
          <p className="font-body-sm text-[12px] text-on-surface-variant mb-4">
            The shared key is never bundled into the site's public code — it's only kept in this browser tab's session
            storage, sent straight to the worker as an auth header.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchReport();
            }}
            className="flex items-center gap-3 flex-wrap"
          >
            <input
              type="password"
              value={sharedKey}
              onChange={(e) => setSharedKey(e.target.value)}
              placeholder="APP_SHARED_KEY"
              className="flex-1 min-w-[240px] bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-2.5 font-mono text-body-sm text-on-surface transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !apiUrl}
              className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-2.5 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Fetch Report'}
            </button>
          </form>
          {error && <p className="font-body-sm text-[12px] text-error mt-3">{error}</p>}
        </section>

        {report && (
          <section className="flex flex-col gap-4">
            <p className="font-body-sm text-[11px] text-on-surface-variant">
              Generated {new Date(report.generated_at).toLocaleString('en-IN')} · Period{' '}
              {new Date(report.period.start).toLocaleDateString('en-IN')} –{' '}
              {new Date(report.period.end).toLocaleDateString('en-IN')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <StatCard title="Cloudflare R2" icon="database" data={report.r2} />
              <StatCard title="MSG91" icon="sms" data={report.msg91} />
              <StatCard title="Firebase" icon="local_fire_department" data={report.firebase} />
              <StatCard title="Netlify" icon="cloud" data={report.netlify} />
              <StatCard title="ShipPrime" icon="local_shipping" data={report.shipprime} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
