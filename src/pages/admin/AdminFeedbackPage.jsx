import { useEffect, useState } from 'react';
import { subscribeToFeedback } from '../../services/feedback.js';

function Stars({ rating }) {
  if (!rating) return <span className="font-body-sm text-body-sm text-on-surface-variant/60 italic">No rating</span>;
  return (
    <div className="flex gap-0.5 text-tertiary">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: rating >= star ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToFeedback((rows, error) => {
      setEntries(rows);
      setLoadError(error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Customer Feedback</h1>
        <p className="admin-page-subtitle">
          Submissions from the public Feedback form. Only signed-in admins can view this list.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-4">
        {loading ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
        ) : loadError ? (
          <p className="font-body-sm text-body-sm text-error">
            Couldn't load feedback ({loadError.message || 'permission denied'}).
          </p>
        ) : entries.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">No feedback submitted yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {entries.map((entry) => (
              <li key={entry.id} className="admin-card">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div>
                    <p className="font-title-sm text-title-sm text-on-surface">
                      {entry.name || 'Anonymous'}
                    </p>
                    {entry.email && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{entry.email}</p>
                    )}
                  </div>
                  <Stars rating={entry.rating} />
                </div>
                <p className="font-body-lg text-body-lg text-on-surface-variant">{entry.message}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
