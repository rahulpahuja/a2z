import { useEffect, useState } from 'react';
import { subscribeToJobs, createJob, updateJob, deleteJob } from '../../services/jobs.js';
import { useToast } from '../../context/ToastContext.jsx';

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract'];

const EMPTY_FORM = { title: '', location: '', type: JOB_TYPES[0], description: '' };

export default function AdminJobsPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToJobs((rows, error) => {
      setJobs(rows);
      setLoadError(error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.location.trim()) return;
    setSaving(true);
    try {
      await createJob(form);
      setForm(EMPTY_FORM);
      showToast('Job posted — it will now show up on the Careers page.');
    } catch (err) {
      showToast(err.message || 'Could not post the job.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteJob(id);
      showToast('Job posting removed.');
    } catch (err) {
      showToast(err.message || 'Could not remove the job.');
    }
  };

  const startEdit = (job) => {
    setEditingId(job.id);
    setEditForm({ title: job.title, location: job.location, type: job.type, description: job.description });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const saveEdit = async (id) => {
    if (!editForm.title.trim() || !editForm.location.trim()) return;
    setUpdating(true);
    try {
      await updateJob(id, editForm);
      showToast('Job posting updated.');
      cancelEdit();
    } catch (err) {
      showToast(err.message || 'Could not update the job.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Job Portal</h1>
        <p className="admin-page-subtitle">
          Post openings here — they appear automatically on the public Careers page. An empty list shows "No
          openings currently" to visitors.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        <section className="admin-card">
          <h2 className="admin-card-title mb-4">Post a New Opening</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group !mb-0">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Textile Sourcing Associate"
                />
              </div>
              <div className="form-group !mb-0">
                <label className="form-label">Location</label>
                <input
                  className="form-input"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Jaipur, Rajasthan"
                />
              </div>
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">Employment Type</label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {JOB_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group !mb-0">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Responsibilities, requirements, how to apply…"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !form.title.trim() || !form.location.trim()}
              className="btn btn-primary self-start"
            >
              Post Job
            </button>
          </form>
        </section>

        <section className="admin-card">
          <h2 className="admin-card-title mb-4">Open Positions ({jobs.length})</h2>
          {loading ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
          ) : loadError ? (
            <p className="font-body-sm text-body-sm text-error">
              Couldn't load jobs ({loadError.message || 'permission denied'}).
            </p>
          ) : jobs.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No openings posted yet. The Careers page will show "No openings currently" until you add one above.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-outline-variant/20">
              {jobs.map((job) => {
                const isEditing = editingId === job.id;
                return (
                  <li key={job.id} className="py-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            className="form-input"
                            value={editForm.title}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                            disabled={updating}
                          />
                          <input
                            className="form-input"
                            value={editForm.location}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                            disabled={updating}
                          />
                        </div>
                        <select
                          className="form-select"
                          value={editForm.type}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                          disabled={updating}
                        >
                          {JOB_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <textarea
                          className="form-textarea"
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          disabled={updating}
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => saveEdit(job.id)}
                            disabled={updating || !editForm.title.trim() || !editForm.location.trim()}
                            className="text-primary font-label-caps text-label-caps hover:underline disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={updating}
                            className="text-on-surface-variant font-label-caps text-label-caps hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">{job.title}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                            {job.location} · {job.type}
                          </p>
                          {job.description && (
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 max-w-2xl">{job.description}</p>
                          )}
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(job)}
                            className="text-primary font-label-caps text-label-caps hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(job.id)}
                            className="text-error font-label-caps text-label-caps hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
