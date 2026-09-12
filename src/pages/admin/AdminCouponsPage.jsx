import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useProducts } from '../../context/ProductsContext.jsx';
import { subscribeToCategories } from '../../services/categories.js';
import { subscribeToSubcategories } from '../../services/subcategories.js';
import {
  subscribeToCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getServerNow,
} from '../../services/coupons.js';
import { formatCouponBadge, getCouponStatus, validateCouponInput } from '../../utils/coupons.js';
import './AdminCouponsPage.css';

const STATUS_BADGE_CLASS = {
  ACTIVE: 'status-badge-secondary',
  SCHEDULED: 'status-badge-tertiary',
  DISABLED: 'status-badge-error',
  EXPIRED: 'status-badge-neutral',
  USAGE_LIMIT_REACHED: 'status-badge-tertiary',
  DRAFT: 'status-badge-neutral',
};

const STATUS_LABEL = {
  ACTIVE: 'Active',
  SCHEDULED: 'Scheduled',
  DISABLED: 'Disabled',
  EXPIRED: 'Expired',
  USAGE_LIMIT_REACHED: 'Usage Limit Reached',
  DRAFT: 'Draft',
};

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maximumDiscountAmount: '',
  minimumOrderValue: '',
  durationMode: 'dates',
  startAt: '',
  endAt: '',
  durationDays: '30',
  usageLimit: '',
  // Defaults to one redemption per customer — every example coupon in the
  // spec this form implements uses 1, and an admin who never touches this
  // field should get "once per customer," not silently-unlimited reuse.
  // Still fully editable/clearable for a coupon that's meant to be reusable.
  maxUsesPerCustomer: '1',
  firstOrderOnly: false,
  isActive: true,
  targetType: 'ALL',
  targetIds: [],
};

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateRange(coupon) {
  if (!coupon.startAt || !coupon.endAt) return 'Not scheduled';
  const start = new Date(coupon.startAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(coupon.endAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

function couponToForm(coupon) {
  return {
    code: coupon.code,
    name: coupon.name || '',
    description: coupon.description || '',
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue ?? ''),
    maximumDiscountAmount: coupon.maximumDiscountAmount == null ? '' : String(coupon.maximumDiscountAmount),
    minimumOrderValue: coupon.minimumOrderValue == null ? '' : String(coupon.minimumOrderValue),
    durationMode: 'dates',
    startAt: coupon.startAt ? toDatetimeLocalValue(new Date(coupon.startAt)) : '',
    endAt: coupon.endAt ? toDatetimeLocalValue(new Date(coupon.endAt)) : '',
    durationDays: '30',
    usageLimit: coupon.usageLimit == null ? '' : String(coupon.usageLimit),
    maxUsesPerCustomer: coupon.maxUsesPerCustomer == null ? '' : String(coupon.maxUsesPerCustomer),
    firstOrderOnly: Boolean(coupon.firstOrderOnly),
    isActive: coupon.isActive !== false,
    targetType: coupon.targetType || 'ALL',
    targetIds: coupon.targetIds || [],
  };
}

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  const { products } = useProducts();
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editingCode, setEditingCode] = useState(null);
  const [targetSearch, setTargetSearch] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToCoupons((rows) => {
      setCoupons(rows || []);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCategories((rows) => setCategories(rows || []));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSubcategories((rows) => setSubcategories(rows || []));
    return unsubscribe;
  }, []);

  const targetOptions = useMemo(() => {
    if (form.targetType === 'PRODUCTS') {
      return products.map((p) => ({ id: p.id, label: p.title || p.name }));
    }
    if (form.targetType === 'CATEGORY') {
      return categories.map((c) => ({ id: c.id, label: c.title }));
    }
    if (form.targetType === 'SUBCATEGORY') {
      return subcategories.map((s) => ({ id: s.id, label: `${s.title} (${s.categoryTitle || ''})` }));
    }
    return [];
  }, [form.targetType, products, categories, subcategories]);

  const filteredTargetOptions = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return targetOptions.slice(0, 50);
    return targetOptions.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
  }, [targetOptions, targetSearch]);

  const updateField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleTargetId = (id) => {
    setForm((prev) => ({
      ...prev,
      targetIds: prev.targetIds.includes(id) ? prev.targetIds.filter((t) => t !== id) : [...prev.targetIds, id],
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingCode(null);
    setTargetSearch('');
  };

  const startEdit = (coupon) => {
    setForm(couponToForm(coupon));
    setEditingCode(coupon.code);
    setErrors({});
    setTargetSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let startAt;
    let endAt;
    if (form.durationMode === 'duration') {
      const now = await getServerNow();
      startAt = now.toISOString();
      const days = Math.max(1, Number(form.durationDays) || 0);
      endAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    } else {
      startAt = form.startAt ? new Date(form.startAt).toISOString() : null;
      endAt = form.endAt ? new Date(form.endAt).toISOString() : null;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maximumDiscountAmount: form.maximumDiscountAmount === '' ? null : Number(form.maximumDiscountAmount),
      minimumOrderValue: form.minimumOrderValue === '' ? null : Number(form.minimumOrderValue),
      startAt,
      endAt,
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      maxUsesPerCustomer: form.maxUsesPerCustomer === '' ? null : Number(form.maxUsesPerCustomer),
      firstOrderOnly: form.firstOrderOnly,
      isActive: form.isActive,
      targetType: form.targetType,
      targetIds: form.targetType === 'ALL' ? [] : form.targetIds,
    };

    const validationErrors = validateCouponInput(payload);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      if (editingCode) {
        await updateCoupon(editingCode, payload);
        showToast(`Updated coupon "${payload.code}".`);
      } else {
        await createCoupon(payload);
        showToast(`Created coupon "${payload.code}".`);
      }
      resetForm();
    } catch (err) {
      showToast(err.message || 'Could not save this coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await updateCoupon(coupon.code, { isActive: !coupon.isActive });
      showToast(coupon.isActive ? `Disabled "${coupon.code}".` : `Activated "${coupon.code}".`);
    } catch (err) {
      showToast(err.message || 'Could not update this coupon.');
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      await deleteCoupon(coupon.code);
      showToast(`Deleted "${coupon.code}".`);
      if (editingCode === coupon.code) resetForm();
    } catch (err) {
      showToast(err.message || 'Could not delete this coupon.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Coupons</h1>
        <p className="admin-page-subtitle">
          Create percentage or fixed-amount discount codes with spend caps, validity windows, and usage limits.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <section className="admin-card h-fit flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="admin-card-title">{editingCode ? `Editing ${editingCode}` : 'New Coupon'}</h2>
              {editingCode && (
                <button type="button" className="coupon-link-btn" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="coupon-code">
                  Coupon Code
                </label>
                <input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE50"
                  disabled={Boolean(editingCode)}
                  className="form-input"
                />
                {errors.code && <p className="coupon-error-text">{errors.code}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="coupon-name">
                  Coupon Name
                </label>
                <input id="coupon-name" value={form.name} onChange={updateField('name')} className="form-input" />
                {errors.name && <p className="coupon-error-text">{errors.name}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="coupon-description">
                  Description
                </label>
                <textarea
                  id="coupon-description"
                  value={form.description}
                  onChange={updateField('description')}
                  rows={2}
                  className="form-textarea"
                />
              </div>

              <div className="coupon-field-row">
                <div className="form-group admin-form-group--tight">
                  <label className="form-label" htmlFor="discount-type">
                    Discount Type
                  </label>
                  <select id="discount-type" value={form.discountType} onChange={updateField('discountType')} className="form-select">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div className="form-group admin-form-group--tight">
                  <label className="form-label" htmlFor="discount-value">
                    {form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount ₹'}
                  </label>
                  <input
                    id="discount-value"
                    type="number"
                    min="0"
                    value={form.discountValue}
                    onChange={updateField('discountValue')}
                    className="form-input"
                  />
                </div>
              </div>
              {errors.discountType && <p className="coupon-error-text">{errors.discountType}</p>}
              {errors.discountValue && <p className="coupon-error-text">{errors.discountValue}</p>}

              {form.discountType === 'PERCENTAGE' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="max-discount">
                    Maximum Discount (₹, blank = unlimited)
                  </label>
                  <input
                    id="max-discount"
                    type="number"
                    min="0"
                    value={form.maximumDiscountAmount}
                    onChange={updateField('maximumDiscountAmount')}
                    placeholder="e.g. 100"
                    className="form-input"
                  />
                  {errors.maximumDiscountAmount && <p className="coupon-error-text">{errors.maximumDiscountAmount}</p>}
                </div>
              )}

              {(form.discountValue || form.discountType === 'FIXED') && (
                <div className="coupon-badge-preview">
                  {formatCouponBadge({
                    discountType: form.discountType,
                    discountValue: form.discountValue,
                    maximumDiscountAmount: form.maximumDiscountAmount === '' ? null : form.maximumDiscountAmount,
                  })}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="min-order">
                  Minimum Order Value (₹, blank = none)
                </label>
                <input
                  id="min-order"
                  type="number"
                  min="0"
                  value={form.minimumOrderValue}
                  onChange={updateField('minimumOrderValue')}
                  className="form-input"
                />
                {errors.minimumOrderValue && <p className="coupon-error-text">{errors.minimumOrderValue}</p>}
              </div>

              <div className="form-group">
                <span className="form-label">Duration</span>
                <div className="coupon-toggle-row">
                  <button
                    type="button"
                    className={`coupon-toggle-btn ${form.durationMode === 'dates' ? 'coupon-toggle-btn--active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, durationMode: 'dates' }))}
                  >
                    Explicit Dates
                  </button>
                  <button
                    type="button"
                    className={`coupon-toggle-btn ${form.durationMode === 'duration' ? 'coupon-toggle-btn--active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, durationMode: 'duration' }))}
                  >
                    Start Immediately + Duration
                  </button>
                </div>
              </div>

              {form.durationMode === 'dates' ? (
                <div className="coupon-field-row">
                  <div className="form-group admin-form-group--tight">
                    <label className="form-label" htmlFor="start-at">
                      Starts
                    </label>
                    <input id="start-at" type="datetime-local" value={form.startAt} onChange={updateField('startAt')} className="form-input" />
                  </div>
                  <div className="form-group admin-form-group--tight">
                    <label className="form-label" htmlFor="end-at">
                      Ends
                    </label>
                    <input id="end-at" type="datetime-local" value={form.endAt} onChange={updateField('endAt')} className="form-input" />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="duration-days">
                    Duration (days) — starts at the moment it's saved
                  </label>
                  <input
                    id="duration-days"
                    type="number"
                    min="1"
                    value={form.durationDays}
                    onChange={updateField('durationDays')}
                    className="form-input"
                  />
                </div>
              )}
              {errors.endAt && <p className="coupon-error-text">{errors.endAt}</p>}

              <div className="coupon-field-row">
                <div className="form-group admin-form-group--tight">
                  <label className="form-label" htmlFor="usage-limit">
                    Maximum Total Uses (blank = unlimited)
                  </label>
                  <input
                    id="usage-limit"
                    type="number"
                    min="0"
                    value={form.usageLimit}
                    onChange={updateField('usageLimit')}
                    className="form-input"
                  />
                </div>
                <div className="form-group admin-form-group--tight">
                  <label className="form-label" htmlFor="max-per-customer">
                    Max Uses / Customer (blank = unlimited)
                  </label>
                  <input
                    id="max-per-customer"
                    type="number"
                    min="0"
                    value={form.maxUsesPerCustomer}
                    onChange={updateField('maxUsesPerCustomer')}
                    className="form-input"
                  />
                </div>
              </div>
              {errors.usageLimit && <p className="coupon-error-text">{errors.usageLimit}</p>}
              {errors.maxUsesPerCustomer && <p className="coupon-error-text">{errors.maxUsesPerCustomer}</p>}

              <label className="coupon-checkbox-row">
                <input type="checkbox" checked={form.firstOrderOnly} onChange={updateField('firstOrderOnly')} className="form-checkbox" />
                First order only
              </label>

              <label className="coupon-checkbox-row">
                <input type="checkbox" checked={form.isActive} onChange={updateField('isActive')} className="form-checkbox" />
                Active
              </label>

              <div className="form-group">
                <label className="form-label" htmlFor="target-type">
                  Applies To
                </label>
                <select
                  id="target-type"
                  value={form.targetType}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetType: e.target.value, targetIds: [] }))}
                  className="form-select"
                >
                  <option value="ALL">All Products</option>
                  <option value="PRODUCTS">Specific Products</option>
                  <option value="CATEGORY">Category</option>
                  <option value="SUBCATEGORY">Subcategory</option>
                </select>
              </div>

              {form.targetType !== 'ALL' && (
                <div className="form-group">
                  <input
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    placeholder="Search…"
                    className="form-input mb-2"
                  />
                  <div className="coupon-target-list">
                    {filteredTargetOptions.length === 0 && <p className="coupon-error-text">Nothing found.</p>}
                    {filteredTargetOptions.map((option) => (
                      <label key={option.id} className="coupon-target-chip">
                        <input
                          type="checkbox"
                          checked={form.targetIds.includes(option.id)}
                          onChange={() => toggleTargetId(option.id)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={saving} className="btn btn-primary w-full">
                {saving ? 'Saving…' : editingCode ? 'Save Changes' : 'Create Coupon'}
              </button>
            </form>
          </section>

          {/* List */}
          <section className="lg:col-span-2 admin-card flex flex-col gap-6">
            <div>
              <h2 className="admin-card-title">All Coupons</h2>
              <p className="admin-card-subtitle mt-1">{coupons.length} coupon{coupons.length === 1 ? '' : 's'} configured.</p>
            </div>

            {coupons.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant/60 flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/50 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-outline-variant">sell</span>
                <p className="font-body-lg font-semibold">No coupons yet</p>
                <p className="font-body-sm">Create one in the form on the left to get started.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Discount</th>
                      <th>Status</th>
                      <th>Usage</th>
                      <th>Valid</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => {
                      const status = getCouponStatus(coupon);
                      return (
                        <tr key={coupon.code}>
                          <td>
                            <p className="font-semibold text-on-surface">{coupon.code}</p>
                            <p className="admin-card-subtitle">{coupon.name}</p>
                          </td>
                          <td>{formatCouponBadge(coupon)}</td>
                          <td>
                            <span className={`status-badge ${STATUS_BADGE_CLASS[status] || 'status-badge-neutral'}`}>
                              {STATUS_LABEL[status] || status}
                            </span>
                          </td>
                          <td>
                            {coupon.usageCount ?? 0} / {coupon.usageLimit ?? '∞'}
                            {coupon.maxUsesPerCustomer != null && (
                              <p className="admin-card-subtitle">{coupon.maxUsesPerCustomer}/customer</p>
                            )}
                          </td>
                          <td>{formatDateRange(coupon)}</td>
                          <td>
                            <div className="coupon-row-actions">
                              <button type="button" className="coupon-link-btn" onClick={() => startEdit(coupon)}>
                                Edit
                              </button>
                              <button type="button" className="coupon-link-btn" onClick={() => handleToggleActive(coupon)}>
                                {coupon.isActive ? 'Disable' : 'Activate'}
                              </button>
                              <button type="button" className="coupon-link-btn coupon-link-btn--danger" onClick={() => handleDelete(coupon)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
