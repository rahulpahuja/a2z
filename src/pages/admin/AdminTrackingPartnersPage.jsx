import { useEffect, useMemo, useState } from 'react';
import { subscribeToTrackingPartners, saveTrackingPartners } from '../../services/trackingPartners.js';
import { subscribeToOrders } from '../../services/orders.js';
import { formatCurrency } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import './AdminTrackingPartnersPage.css';

const currentMonthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function AdminTrackingPartnersPage() {
  const { showToast } = useToast();
  const [partners, setPartners] = useState([]);
  const [newPartner, setNewPartner] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [spendMonth, setSpendMonth] = useState(currentMonthValue);

  useEffect(() => {
    const unsubscribe = subscribeToTrackingPartners((data, error) => {
      setPartners(data || []);
      setLoading(false);
      if (error) {
        showToast(`Failed to load tracking partners: ${error.message}`);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((rows) => setOrders(rows));
    return unsubscribe;
  }, []);

  // Spend tracked from our own shipment records — ShipPrime has no public
  // billing API we could find, so this sums whatever cost their
  // forward-create response happened to return (see extractShipmentCost in
  // services/shipprime.js), not a live wallet balance from ShipPrime itself.
  const shipmentStats = useMemo(() => {
    const [year, month] = spendMonth.split('-').map(Number);
    const shipped = orders.filter((o) => {
      if (!o.shipment?.awb) return false;
      const d = new Date(o.shipment.createdAt || o.placedAt);
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
    const withCost = shipped.filter((o) => typeof o.shipment.cost === 'number');
    return {
      count: shipped.length,
      totalCost: withCost.reduce((sum, o) => sum + o.shipment.cost, 0),
      missingCostCount: shipped.length - withCost.length,
    };
  }, [orders, spendMonth]);

  const handleAddPartner = async (e) => {
    e.preventDefault();
    if (!newPartner.trim()) return;

    const trimmedName = newPartner.trim();
    if (partners.some((p) => p.toLowerCase() === trimmedName.toLowerCase())) {
      showToast('This tracking partner already exists.');
      return;
    }

    setSaving(true);
    const updatedPartners = [...partners, trimmedName];
    try {
      await saveTrackingPartners(updatedPartners);
      setNewPartner('');
      showToast(`Added tracking partner "${trimmedName}" successfully.`);
    } catch (err) {
      showToast(err.message || 'Could not add tracking partner.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePartner = async (partnerToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${partnerToDelete}"?`)) {
      return;
    }

    setSaving(true);
    const updatedPartners = partners.filter((p) => p !== partnerToDelete);
    try {
      await saveTrackingPartners(updatedPartners);
      showToast(`Removed tracking partner "${partnerToDelete}" successfully.`);
    } catch (err) {
      showToast(err.message || 'Could not delete tracking partner.');
    } finally {
      setSaving(false);
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
        <h1 className="admin-page-title">Tracking Partners</h1>
        <p className="admin-page-subtitle">
          Manage the list of courier and delivery partners used for order shipping and tracking.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        {/* ShipPrime Spend */}
        <section className="admin-card flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="admin-card-title">ShipPrime Spend</h2>
              <p className="admin-card-subtitle">
                Tracked from our own shipment records, not a live ShipPrime balance — ShipPrime has no public billing
                API, so this sums whatever cost their response returned per shipment.
              </p>
            </div>
            <div className="form-group admin-form-group--tight">
              <label className="form-label" htmlFor="spend-month">
                Month
              </label>
              <input
                id="spend-month"
                type="month"
                value={spendMonth}
                onChange={(e) => setSpendMonth(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">
              <p className="admin-card-subtitle">Shipments</p>
              <p className="font-title-sm text-title-sm text-on-surface mt-1">{shipmentStats.count}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">
              <p className="admin-card-subtitle">Recorded Spend</p>
              <p className="font-title-sm text-title-sm text-on-surface mt-1">{formatCurrency(shipmentStats.totalCost)}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">
              <p className="admin-card-subtitle">Missing Cost Data</p>
              <p className="font-title-sm text-title-sm text-on-surface mt-1">{shipmentStats.missingCostCount}</p>
            </div>
          </div>
          {shipmentStats.missingCostCount > 0 && (
            <p className="text-[11px] text-on-surface-variant">
              {shipmentStats.missingCostCount} shipment{shipmentStats.missingCostCount === 1 ? '' : 's'} this month had
              no cost figure in ShipPrime's response — check the ShipPrime dashboard directly for the true total.
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Partner Form */}
        <section className="admin-card h-fit flex flex-col gap-5">
          <div>
            <h2 className="admin-card-title">Add Tracking Partner</h2>
            <p className="admin-card-subtitle">Create a new partner to make it available in the order details view.</p>
          </div>
          <form onSubmit={handleAddPartner} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="partner-name">
                Partner Name
              </label>
              <input
                id="partner-name"
                value={newPartner}
                onChange={(e) => setNewPartner(e.target.value)}
                placeholder="e.g. BlueDart Express, DHL Express"
                required
                disabled={saving}
                className="form-input"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !newPartner.trim()}
              className="btn btn-primary w-full"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {saving ? 'Adding…' : 'Add Partner'}
            </button>
          </form>
        </section>

        {/* Partners List */}
        <section className="lg:col-span-2 admin-card flex flex-col gap-6">
          <div>
            <h2 className="admin-card-title">Registered Partners</h2>
            <p className="admin-card-subtitle mt-1">
              Currently, there are {partners.length} active tracking partners configured.
            </p>
          </div>

          {partners.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant/60 flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/50 rounded-xl">
              <span className="material-symbols-outlined text-4xl text-outline-variant">local_shipping</span>
              <p className="font-body-lg font-semibold">No tracking partners found</p>
              <p className="font-body-sm">Add one in the form on the left to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partners.map((partner) => (
                <div
                  key={partner}
                  className="partner-card-anim flex justify-between items-center bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/30 rounded-xl p-4 transition-all shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                    </div>
                    <span className="font-semibold text-on-surface text-[14px]">{partner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePartner(partner)}
                    disabled={saving}
                    className="w-8 h-8 rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors disabled:opacity-50"
                    title={`Delete ${partner}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
