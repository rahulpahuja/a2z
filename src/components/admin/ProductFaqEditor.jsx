import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { MAX_FAQS_PER_PRODUCT, saveProductFaqs, subscribeToProductFaqs } from '../../services/productFaqs.js';

let draftKeySeed = 0;
const newDraftRow = (faq = {}) => ({ key: ++draftKeySeed, question: faq.question ?? '', answer: faq.answer ?? '' });

const inputClass =
  'w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface';

export default function ProductFaqEditor({ productId }) {
  const { showToast } = useToast();
  // null until the first snapshot arrives. Only that snapshot seeds the rows, so a
  // live update from another admin can't wipe what this admin is typing.
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(
    () => subscribeToProductFaqs(productId, (faqs) => setRows((current) => current ?? faqs.map((faq) => newDraftRow(faq)))),
    [productId]
  );

  if (rows === null) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">Loading FAQs…</p>;
  }

  const updateRow = (key, field, value) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  const removeRow = (key) => setRows((current) => current.filter((row) => row.key !== key));
  const addRow = () => setRows((current) => [...current, newDraftRow()]);

  const handleSave = async () => {
    // sanitizeFaqs silently drops incomplete entries, so block the save instead of
    // letting a half-written FAQ disappear on the next load.
    if (rows.some((row) => !row.question.trim() || !row.answer.trim())) {
      showToast('Each FAQ needs both a question and an answer. Fill them in or remove the empty ones.');
      return;
    }
    setSaving(true);
    try {
      await saveProductFaqs(productId, rows);
      showToast('FAQs saved.');
    } catch {
      showToast('Could not save FAQs. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {rows.length === 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">No FAQs yet. Add one to answer common questions about this product.</p>
      )}
      {rows.map((row, index) => (
        <div key={row.key} className="flex flex-col gap-3 rounded-xl border border-outline-variant/40 p-4">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">FAQ {index + 1}</span>
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              className="font-label-caps text-label-caps text-error hover:underline"
            >
              Remove
            </button>
          </div>
          <input
            aria-label={`Question ${index + 1}`}
            placeholder="Question, e.g. Is this fabric breathable?"
            maxLength={200}
            value={row.question}
            onChange={(event) => updateRow(row.key, 'question', event.target.value)}
            className={inputClass}
          />
          <textarea
            aria-label={`Answer ${index + 1}`}
            placeholder="Answer"
            maxLength={1000}
            value={row.answer}
            onChange={(event) => updateRow(row.key, 'answer', event.target.value)}
            className={`${inputClass} min-h-20`}
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_FAQS_PER_PRODUCT}
          className="font-label-caps text-label-caps text-primary uppercase hover:underline disabled:opacity-40"
        >
          + Add FAQ ({rows.length}/{MAX_FAQS_PER_PRODUCT})
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save FAQs'}
        </button>
      </div>
    </div>
  );
}
