import { useEffect, useState } from 'react';
import { subscribeToBillTemplate, saveBillTemplate, DEFAULT_BILL_TEMPLATE } from '../../services/billTemplate.js';
import { useToast } from '../../context/ToastContext.jsx';

const PAGE_SIZES = [
  { value: 'a4', label: 'A4 (standard printer)' },
  { value: 'a5', label: 'A5 (compact invoice)' },
  { value: 'letter', label: 'Letter (US standard)' },
  { value: 'thermal80', label: 'Thermal Receipt (80mm)' },
  { value: 'thermal58', label: 'Thermal Receipt (58mm)' },
];

const ALIGNMENTS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const PREVIEW_ROW = { item: 'Regal Rani Pink Anarkali', qty: '1', price: '₹12,499', total: '₹12,499' };

export default function AdminBillTemplatePage() {
  const { showToast } = useToast();
  const [template, setTemplate] = useState(DEFAULT_BILL_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBillTemplate((data, error) => {
      setTemplate(data);
      setLoading(false);
      if (error) showToast(`Couldn't load saved bill template (${error.message || 'permission denied'}). Showing defaults.`);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveColumn = (index, direction) => {
    setTemplate((prev) => {
      const columns = [...prev.columns];
      const target = index + direction;
      if (target < 0 || target >= columns.length) return prev;
      [columns[index], columns[target]] = [columns[target], columns[index]];
      return { ...prev, columns };
    });
  };

  const toggleColumn = (key) => {
    setTemplate((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBillTemplate(template);
      showToast('Bill template saved.');
    } catch (err) {
      showToast(err.message || 'Could not save bill template.');
    } finally {
      setSaving(false);
    }
  };

  const visibleColumns = template.columns.filter((col) => col.visible);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Bill Template</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Customize how the downloadable order receipt is laid out.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="flex flex-col gap-6">
          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Bill Position</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="page-size">
                  Page Size
                </label>
                <select
                  id="page-size"
                  value={template.pageSize}
                  onChange={(e) => setTemplate((prev) => ({ ...prev, pageSize: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                >
                  {PAGE_SIZES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="header-align">
                  Store Details Position (Header)
                </label>
                <select
                  id="header-align"
                  value={template.headerAlign}
                  onChange={(e) => setTemplate((prev) => ({ ...prev, headerAlign: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                >
                  {ALIGNMENTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-2">Item Table Columns</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
              Reorder to control where quantity, price, and item details are written on the bill. Toggle to
              show/hide a column.
            </p>
            <div className="flex flex-col gap-2">
              {template.columns.map((col, index) => (
                <div key={col.key} className="flex items-center gap-3 border border-outline-variant/30 rounded-lg px-4 py-2">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(col.key)}
                      className="w-5 h-5 rounded border-outline text-primary focus:ring-primary"
                    />
                    <span className="font-body-sm text-body-sm text-on-surface">{col.label}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => moveColumn(index, -1)}
                    disabled={index === 0}
                    className="text-on-surface-variant hover:text-primary disabled:opacity-30"
                    aria-label={`Move ${col.label} up`}
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(index, 1)}
                    disabled={index === template.columns.length - 1}
                    className="text-on-surface-variant hover:text-primary disabled:opacity-30"
                    aria-label={`Move ${col.label} down`}
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="footer-note">
              Footer Note
            </label>
            <input
              id="footer-note"
              value={template.footerNote}
              onChange={(e) => setTemplate((prev) => ({ ...prev, footerNote: e.target.value }))}
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
          </section>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="self-start bg-primary text-on-primary font-label-caps text-label-caps px-8 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>

        {/* Live preview */}
        <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 h-fit sticky top-6">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Preview</h2>
          <div className="bg-white text-black rounded-lg p-6 shadow-inner" style={{ textAlign: template.headerAlign }}>
            <p className="font-bold">A2Z Collection</p>
            <p className="text-xs">Order Receipt · {PAGE_SIZES.find((p) => p.value === template.pageSize)?.label}</p>
            <div className="h-px bg-gray-300 my-4" />
            <table className="w-full text-left text-xs" style={{ textAlign: 'left' }}>
              <thead>
                <tr className="border-b border-gray-300">
                  {visibleColumns.map((col) => (
                    <th key={col.key} className="py-1 pr-3">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="py-2 pr-3">
                      {col.key === 'item' ? PREVIEW_ROW.item : PREVIEW_ROW[col.key]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <div className="h-px bg-gray-300 my-4" />
            <p className="text-xs text-gray-500">{template.footerNote}</p>
          </div>
          {visibleColumns.length === 0 && (
            <p className="font-body-sm text-body-sm text-error mt-3">
              At least one column should stay visible or the bill will show no line-item details.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
