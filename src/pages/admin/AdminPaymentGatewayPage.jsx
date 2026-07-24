import { useEffect, useState } from 'react';
import { isFirebaseEnabled } from '../../firebase.js';
import { subscribeToPaymentGateways, savePaymentGateway, deletePaymentGateway } from '../../services/paymentGateway.js';
import { useToast } from '../../context/ToastContext.jsx';
import './AdminPaymentGatewayPage.css';

export default function AdminPaymentGatewayPage() {
  const { showToast } = useToast();
  const [gateways, setGateways] = useState([]);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToPaymentGateways((data, error) => {
      setGateways(data || []);
      setLoading(false);
      if (error) {
        showToast(`Failed to load payment gateways: ${error.message}`);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !apiKey.trim()) return;

    if (!isFirebaseEnabled) {
      showToast('Firebase is disabled. Gateway configurations must be saved in Firebase Realtime Database.');
      return;
    }

    setSaving(true);
    
    try {
      const targetId = editingId || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      await savePaymentGateway({
        id: targetId,
        name: name.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        isActive: isActive,
      });

      if (isActive) {
        const others = gateways.filter((g) => g.id !== targetId && g.isActive);
        for (const other of others) {
          await savePaymentGateway({
            ...other,
            isActive: false,
          });
        }
      }

      showToast(`Payment gateway "${name}" saved successfully.`);
      resetForm();
    } catch (err) {
      showToast(err.message || 'Could not save payment gateway.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (gateway) => {
    if (!isFirebaseEnabled) {
      showToast('Firebase integration required.');
      return;
    }
    setSaving(true);
    try {
      await savePaymentGateway({
        ...gateway,
        isActive: !gateway.isActive,
      });

      if (!gateway.isActive) {
        const others = gateways.filter((g) => g.id !== gateway.id && g.isActive);
        for (const other of others) {
          await savePaymentGateway({
            ...other,
            isActive: false,
          });
        }
        showToast(`Payment gateway "${gateway.name}" activated.`);
      } else {
        showToast(`Payment gateway "${gateway.name}" deactivated.`);
      }
    } catch (err) {
      showToast(err.message || 'Could not update gateway status.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (gateway) => {
    setEditingId(gateway.id);
    setName(gateway.name);
    setApiKey(gateway.apiKey);
    setApiSecret(gateway.apiSecret || '');
    setIsActive(gateway.isActive);
  };

  const handleDelete = async (gateway) => {
    if (!window.confirm(`Are you sure you want to delete payment gateway "${gateway.name}"?`)) {
      return;
    }

    setSaving(true);
    try {
      await deletePaymentGateway(gateway.id);
      showToast(`Removed payment gateway "${gateway.name}" successfully.`);
      if (editingId === gateway.id) {
        resetForm();
      }
    } catch (err) {
      showToast(err.message || 'Could not delete payment gateway.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setApiKey('');
    setApiSecret('');
    setIsActive(false);
  };

  const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '********';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
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
        <h1 className="admin-page-title">Payment Gateways</h1>
        <p className="admin-page-subtitle">
          Configure payment gateway partners and their API keys to handle online transactions.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        
        {/* Firebase Verification Warning */}
        {!isFirebaseEnabled && (
          <div className="alert-banner alert-banner-error">
            <span className="material-symbols-outlined text-[28px] shrink-0">database_off</span>
            <div>
              <p className="font-bold text-[15px]">Firebase Database Integration Required</p>
              <p className="text-[12px] opacity-90 mt-0.5">
                For security reasons, payment gateway keys can only be managed and saved directly in Firebase Realtime Database. 
                Please enter your Firebase Credentials in your environment `.env` configuration file to unlock this page.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add / Edit Gateway Form */}
          <section className="admin-card h-fit flex flex-col gap-5">
            <div>
              <h2 className="admin-card-title">
                {editingId ? 'Edit Gateway' : 'Add Gateway'}
              </h2>
              <p className="admin-card-subtitle">Enter API keys for integration with your gateway partner.</p>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="gateway-name">
                  Gateway Name / Partner
                </label>
                <input
                  id="gateway-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Razorpay, Stripe, PayPal"
                  required
                  disabled={saving || !isFirebaseEnabled}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="gateway-key">
                  API Key / Partner Key
                </label>
                <input
                  id="gateway-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g. pk_live_abc123"
                  required
                  disabled={saving || !isFirebaseEnabled}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="gateway-secret">
                  API Secret (Optional)
                </label>
                <input
                  id="gateway-secret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="e.g. sk_live_xyz789"
                  disabled={saving || !isFirebaseEnabled}
                  className="form-input"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  id="gateway-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={saving || !isFirebaseEnabled}
                  className="form-checkbox"
                />
                <label htmlFor="gateway-active" className="font-semibold text-on-surface text-[13px] cursor-pointer">
                  Activate this Payment Gateway
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-cancel flex-1"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !isFirebaseEnabled || !name.trim() || !apiKey.trim()}
                  className="btn btn-primary flex-1"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {saving ? 'Saving…' : editingId ? 'Save' : 'Add Gateway'}
                </button>
              </div>
            </form>
          </section>

          {/* Gateways List */}
          <section className="lg:col-span-2 admin-card flex flex-col gap-6">
            <div>
              <h2 className="admin-card-title">Registered Gateways</h2>
              <p className="admin-card-subtitle mt-1">
                A single active gateway will be integrated into the storefront checkout flow.
              </p>
            </div>

            {gateways.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant/60 flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/50 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-outline-variant">payments</span>
                <p className="font-body-lg font-semibold">No payment gateways configured</p>
                <p className="font-body-sm">Submit credentials in the form on the left to initialize.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {gateways.map((g) => (
                  <div
                    key={g.id}
                    className={`gateway-card-anim flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface-container-lowest border ${
                      g.isActive ? 'border-primary/45 ring-1 ring-primary/20' : 'border-outline-variant/20'
                    } rounded-xl p-5 transition-all shadow-sm hover:shadow gap-4`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full ${
                        g.isActive ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant'
                      } flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-[22px]">credit_card</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-on-surface text-[15px]">{g.name}</span>
                          {g.isActive && (
                            <span className="status-badge status-badge-primary">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5 font-mono">
                          <span className="font-sans font-semibold text-[10px] text-outline-variant">KEY:</span>
                          {maskKey(g.apiKey)}
                        </p>
                        {g.apiSecret && (
                          <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5 font-mono">
                            <span className="font-sans font-semibold text-[10px] text-outline-variant">SECRET:</span>
                            {maskKey(g.apiSecret)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(g)}
                        disabled={saving}
                        className={`btn ${g.isActive ? 'btn-cancel' : 'btn-primary'} py-1.5 px-3 rounded-lg`}
                        title={g.isActive ? 'Deactivate gateway' : 'Activate gateway'}
                      >
                        {g.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(g)}
                        disabled={saving}
                        className="w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
                        title="Edit config"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(g)}
                        disabled={saving}
                        className="w-8 h-8 rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
                        title="Delete gateway"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
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
