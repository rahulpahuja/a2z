import { useEffect, useMemo, useState, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { subscribeToOrders, updateFirebaseOrder } from '../../services/orders.js';
import { subscribeToTrackingPartners } from '../../services/trackingPartners.js';
import { MOCK_ORDERS } from '../../data/mockOrders.js';
import { formatCurrency } from '../../context/CartContext.jsx';
import { generateReceiptPdf } from '../../utils/generateReceipt.js';
import { useToast } from '../../context/ToastContext.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { getStoreSettingsOnce } from '../../services/storeSettings.js';
import { createForwardShipment, trackShipment, cancelShipment, buildDeliveryAddress } from '../../services/shipprime.js';
import { INDIAN_STATES_AND_UT } from '../../data/indiaData.js';
import './AdminSalesPage.css';

export default function AdminSalesPage() {
  const [liveOrders, setLiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Charts references
  const dailyChartRef = useRef(null);
  const monthlyChartRef = useRef(null);
  const quarterlyChartRef = useRef(null);

  // Active chart instances
  const dailyChartInst = useRef(null);
  const monthlyChartInst = useRef(null);
  const quarterlyChartInst = useRef(null);

  // Drill-down state
  const [drillDownType, setDrillDownType] = useState('all'); // 'all', 'daily', 'monthly', 'quarterly'
  const [drillDownLabel, setDrillDownLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null); // For detail view modal

  const { showToast } = useToast();
  const [trackingPartners, setTrackingPartners] = useState([]);
  const [orderStatus, setOrderStatus] = useState('Processing');
  const [trackingId, setTrackingId] = useState('');
  const [trackingPartner, setTrackingPartner] = useState('');
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [shipmentBusy, setShipmentBusy] = useState(false);

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Shipped');
  const [bulkPartner, setBulkPartner] = useState('');
  const [bulkTrackingIds, setBulkTrackingIds] = useState({});

  const handleOpenBulkModal = () => {
    const initialIds = {};
    selectedOrderIds.forEach(id => {
      const order = allOrders.find(o => o.id === id);
      initialIds[id] = order?.trackingId || '';
    });
    setBulkTrackingIds(initialIds);
    const firstOrder = allOrders.find(o => o.id === selectedOrderIds[0]);
    setBulkPartner(firstOrder?.trackingPartner || '');
    setBulkStatus('Shipped');
    setBulkModalOpen(true);
  };

  const handleSaveBulkTracking = async () => {
    setIsSavingTracking(true);
    try {
      let dispatched = false;
      for (const id of selectedOrderIds) {
        const originalOrder = allOrders.find(o => o.id === id);
        if (originalOrder) {
          const updatedOrder = {
            ...originalOrder,
            status: bulkStatus,
            trackingPartner: bulkPartner || null,
            trackingId: bulkTrackingIds[id] || null,
          };
          await updateFirebaseOrder(updatedOrder);
          
          if (updatedOrder.trackingId) {
            const smsMessage = `Hi ${originalOrder.shippingDetails?.firstName || 'Customer'}, your order ${id} has been shipped via ${updatedOrder.trackingPartner}. Track it here: ${window.location.origin}/orders/tracking`;
            const notifications = JSON.parse(localStorage.getItem('simulated_sms') || '[]');
            notifications.push({
              id: `${id}-${Date.now()}`,
              orderId: id,
              phone: originalOrder.shippingDetails?.phone || '',
              message: smsMessage,
              timestamp: Date.now(),
              read: false,
            });
            localStorage.setItem('simulated_sms', JSON.stringify(notifications));
            dispatched = true;
          }
        }
      }
      if (dispatched) {
        window.dispatchEvent(new Event('new-sms'));
      }
      showToast(`Successfully updated status & tracking for ${selectedOrderIds.length} orders.`);
      setSelectedOrderIds([]);
      setBulkModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Could not save bulk tracking details.');
    } finally {
      setIsSavingTracking(false);
    }
  };

  // Subscribe to tracking partners
  useEffect(() => {
    const unsubPartners = subscribeToTrackingPartners((data) => {
      setTrackingPartners(data || []);
    });
    return unsubPartners;
  }, []);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setOrderStatus(order.status || 'Processing');
    setTrackingId(order.trackingId || '');
    setTrackingPartner(order.trackingPartner || '');
  };

  const handleSaveTracking = async () => {
    if (!selectedOrder) return;
    setIsSavingTracking(true);
    const updatedOrder = {
      ...selectedOrder,
      status: orderStatus,
      trackingPartner: trackingPartner || null,
      trackingId: trackingId || null,
    };
    try {
      await updateFirebaseOrder(updatedOrder);
      setSelectedOrder(updatedOrder);
      
      if (updatedOrder.trackingId) {
        const smsMessage = `Hi ${selectedOrder.shippingDetails?.firstName || 'Customer'}, your order ${selectedOrder.id} has been shipped via ${updatedOrder.trackingPartner}. Track it here: ${window.location.origin}/orders/tracking`;
        const notifications = JSON.parse(localStorage.getItem('simulated_sms') || '[]');
        notifications.push({
          id: `${selectedOrder.id}-${Date.now()}`,
          orderId: selectedOrder.id,
          phone: selectedOrder.shippingDetails?.phone || '',
          message: smsMessage,
          timestamp: Date.now(),
          read: false,
        });
        localStorage.setItem('simulated_sms', JSON.stringify(notifications));
        window.dispatchEvent(new Event('new-sms'));
      }

      showToast(`Order ${selectedOrder.id} status & tracking details updated.`);
    } catch (err) {
      showToast(err.message || 'Could not update order details.');
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedOrder) return;
    setShipmentBusy(true);
    try {
      const storeSettings = await getStoreSettingsOnce();
      const pickupAddress = storeSettings.pickupAddress;
      if (!pickupAddress?.address1 || !pickupAddress?.pincode) {
        throw new Error('Store pickup address is not set up (Store Settings > Pickup Address).');
      }
      const stateName = INDIAN_STATES_AND_UT.find((s) => s.code === selectedOrder.shippingDetails?.state)?.name;
      const deliveryAddress = buildDeliveryAddress(selectedOrder.shippingDetails, stateName);
      const result = await createForwardShipment({ order: selectedOrder, pickupAddress, deliveryAddress });
      const updatedOrder = {
        ...selectedOrder,
        shipment: {
          status: 'created',
          awb: result.awb,
          courier: result.courier,
          labelUrl: result.labelUrl,
          createdAt: new Date().toISOString(),
        },
      };
      await updateFirebaseOrder(updatedOrder);
      setSelectedOrder(updatedOrder);
      showToast('Shipment created.');
    } catch (err) {
      const updatedOrder = { ...selectedOrder, shipment: { status: 'failed', error: err.message } };
      await updateFirebaseOrder(updatedOrder).catch(() => {});
      setSelectedOrder(updatedOrder);
      showToast(err.message || 'Could not create shipment.');
    } finally {
      setShipmentBusy(false);
    }
  };

  const handleRefreshTracking = async () => {
    if (!selectedOrder?.shipment?.awb) return;
    setShipmentBusy(true);
    try {
      const result = await trackShipment(selectedOrder.shipment.awb);
      const updatedOrder = {
        ...selectedOrder,
        shipment: {
          ...selectedOrder.shipment,
          currentStatus: result?.currentStatus,
          history: result?.history || [],
          lastTrackedAt: new Date().toISOString(),
        },
      };
      await updateFirebaseOrder(updatedOrder);
      setSelectedOrder(updatedOrder);
    } catch (err) {
      showToast(err.message || 'Could not refresh tracking.');
    } finally {
      setShipmentBusy(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!selectedOrder?.shipment?.awb) return;
    if (!window.confirm(`Cancel shipment ${selectedOrder.shipment.awb}? This cannot be undone.`)) return;
    setShipmentBusy(true);
    try {
      await cancelShipment(selectedOrder.shipment.awb);
      const updatedOrder = {
        ...selectedOrder,
        shipment: { ...selectedOrder.shipment, status: 'cancelled' },
      };
      await updateFirebaseOrder(updatedOrder);
      setSelectedOrder(updatedOrder);
      showToast('Shipment cancelled.');
    } catch (err) {
      showToast(err.message || 'Could not cancel shipment.');
    } finally {
      setShipmentBusy(false);
    }
  };

  // Subscribe to live orders
  useEffect(() => {
    const unsub = subscribeToOrders((loadedOrders) => {
      setLiveOrders(loadedOrders);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Merge live and mock orders
  const allOrders = useMemo(() => {
    const merged = [...liveOrders];
    MOCK_ORDERS.forEach((mockOrd) => {
      if (!merged.some((o) => o.id === mockOrd.id)) {
        merged.push(mockOrd);
      }
    });
    // Sort by timestamp, newest first
    return merged.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  }, [liveOrders]);

  // Aggregate stats
  const stats = useMemo(() => {
    // Cancelled orders never generated revenue, so they're excluded from
    // revenue/AOV — but still counted in "Total Orders" since they did happen.
    const revenueOrders = allOrders.filter((o) => o.status !== 'Cancelled');
    const totalRev = revenueOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = allOrders.length;
    const aov = revenueOrders.length > 0 ? totalRev / revenueOrders.length : 0;
    
    // Find top category by units sold in orders
    const categorySales = {};
    allOrders.forEach((o) => {
      o.items.forEach((item) => {
        // Mock items don't have category but we can guess or use fallback
        const cat = item.category || 'Apparel';
        categorySales[cat] = (categorySales[cat] || 0) + item.quantity;
      });
    });
    
    let topCat = 'N/A';
    let maxQty = 0;
    Object.entries(categorySales).forEach(([cat, qty]) => {
      if (qty > maxQty) {
        maxQty = qty;
        topCat = cat;
      }
    });

    return { totalRev, totalOrders, aov, topCat };
  }, [allOrders]);

  // 1. Daily Sales Aggr (Last 14 days to keep it readable, configurable)
  const dailyData = useMemo(() => {
    const data = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      data[dateStr] = { revenue: 0, orders: [] };
    }

    allOrders.forEach((order) => {
      const date = new Date(order.placedAt);
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (data[dateStr] !== undefined) {
        if (order.status !== 'Cancelled') data[dateStr].revenue += order.total;
        data[dateStr].orders.push(order);
      }
    });

    return Object.entries(data).map(([label, val]) => ({
      label,
      revenue: val.revenue,
      orders: val.orders,
    }));
  }, [allOrders]);

  // 2. Monthly Sales Aggr (For year 2026)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = {};
    months.forEach((m) => {
      data[m] = { revenue: 0, orders: [] };
    });

    allOrders.forEach((order) => {
      const date = new Date(order.placedAt);
      if (date.getFullYear() === 2026) {
        const monthLabel = months[date.getMonth()];
        if (order.status !== 'Cancelled') data[monthLabel].revenue += order.total;
        data[monthLabel].orders.push(order);
      }
    });

    return months.map((m) => ({
      label: m,
      revenue: data[m].revenue,
      orders: data[m].orders,
    }));
  }, [allOrders]);

  // 3. Quarterly Sales Aggr (For year 2026)
  const quarterlyData = useMemo(() => {
    const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
    const data = {
      'Q1 (Jan-Mar)': { revenue: 0, orders: [] },
      'Q2 (Apr-Jun)': { revenue: 0, orders: [] },
      'Q3 (Jul-Sep)': { revenue: 0, orders: [] },
      'Q4 (Oct-Dec)': { revenue: 0, orders: [] },
    };

    allOrders.forEach((order) => {
      const date = new Date(order.placedAt);
      if (date.getFullYear() === 2026) {
        const month = date.getMonth();
        let qKey = 'Q1 (Jan-Mar)';
        if (month >= 3 && month <= 5) qKey = 'Q2 (Apr-Jun)';
        else if (month >= 6 && month <= 8) qKey = 'Q3 (Jul-Sep)';
        else if (month >= 9 && month <= 11) qKey = 'Q4 (Oct-Dec)';

        if (order.status !== 'Cancelled') data[qKey].revenue += order.total;
        data[qKey].orders.push(order);
      }
    });

    return quarters.map((q) => ({
      label: q,
      revenue: data[q].revenue,
      orders: data[q].orders,
    }));
  }, [allOrders]);

  // Handle chart click to drill-down
  const handleDrillDown = (type, label) => {
    setDrillDownType(type);
    setDrillDownLabel(label);
    setSearchQuery('');
  };

  // Filtered orders list based on drill-down selection and search query
  const displayOrders = useMemo(() => {
    let list = allOrders;
    
    if (drillDownType === 'daily') {
      list = allOrders.filter((order) => {
        const date = new Date(order.placedAt);
        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return dateStr === drillDownLabel;
      });
    } else if (drillDownType === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      list = allOrders.filter((order) => {
        const date = new Date(order.placedAt);
        return date.getFullYear() === 2026 && months[date.getMonth()] === drillDownLabel;
      });
    } else if (drillDownType === 'quarterly') {
      list = allOrders.filter((order) => {
        const date = new Date(order.placedAt);
        if (date.getFullYear() !== 2026) return false;
        const month = date.getMonth();
        let qLabel = 'Q1 (Jan-Mar)';
        if (month >= 3 && month <= 5) qLabel = 'Q2 (Apr-Jun)';
        else if (month >= 6 && month <= 8) qLabel = 'Q3 (Jul-Sep)';
        else if (month >= 9 && month <= 11) qLabel = 'Q4 (Oct-Dec)';
        return qLabel === drillDownLabel;
      });
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      list = list.filter((o) => {
        const customerName = `${o.shippingDetails?.firstName || ''} ${o.shippingDetails?.lastName || ''}`.toLowerCase();
        const orderId = o.id.toLowerCase();
        const payment = (o.paymentMethod || '').toLowerCase();
        return customerName.includes(term) || orderId.includes(term) || payment.includes(term);
      });
    }

    return list;
  }, [allOrders, drillDownType, drillDownLabel, searchQuery]);

  // Render Charts
  useEffect(() => {
    if (loading) return;

    const brandPink = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#ac2471';
    const brandGreen = '#486730';
    const brandRose = '#7a5642';
    const chartGridColor = '#e5e2e1';

    // Helper to destroy existing chart instances
    const destroyChart = (instRef) => {
      if (instRef.current) {
        instRef.current.destroy();
        instRef.current = null;
      }
    };

    // 1. Daily Chart (Line Chart)
    destroyChart(dailyChartInst);
    if (dailyChartRef.current) {
      const ctx = dailyChartRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, 'rgba(172, 36, 113, 0.2)');
      gradient.addColorStop(1, 'rgba(172, 36, 113, 0.02)');

      dailyChartInst.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dailyData.map((d) => d.label),
          datasets: [
            {
              label: 'Revenue',
              data: dailyData.map((d) => d.revenue),
              borderColor: brandPink,
              backgroundColor: gradient,
              borderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: brandPink,
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Revenue: ${formatCurrency(ctx.parsed.y)}`,
              },
            },
          },
          onClick: (e, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              const point = dailyData[idx];
              handleDrillDown('daily', point.label, point.orders);
            }
          },
          scales: {
            y: {
              grid: { color: chartGridColor, drawBorder: false },
              ticks: {
                font: { family: 'Montserrat', size: 10 },
                color: '#564149',
                callback: (val) => `₹${val / 1000}k`,
              },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Montserrat', size: 9 }, color: '#564149' },
            },
          },
        },
      });
    }

    // 2. Monthly Chart (Bar Chart)
    destroyChart(monthlyChartInst);
    if (monthlyChartRef.current) {
      const ctx = monthlyChartRef.current.getContext('2d');
      monthlyChartInst.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyData.map((d) => d.label),
          datasets: [
            {
              label: 'Revenue',
              data: monthlyData.map((d) => d.revenue),
              backgroundColor: brandGreen,
              borderRadius: 4,
              hoverBackgroundColor: brandPink,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Revenue: ${formatCurrency(ctx.parsed.y)}`,
              },
            },
          },
          onClick: (e, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              const bar = monthlyData[idx];
              handleDrillDown('monthly', bar.label, bar.orders);
            }
          },
          scales: {
            y: {
              grid: { color: chartGridColor, drawBorder: false },
              ticks: {
                font: { family: 'Montserrat', size: 10 },
                color: '#564149',
                callback: (val) => `₹${val / 1000}k`,
              },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Montserrat', size: 10 }, color: '#564149' },
            },
          },
        },
      });
    }

    // 3. Quarterly Chart (Doughnut Chart)
    destroyChart(quarterlyChartInst);
    if (quarterlyChartRef.current) {
      const ctx = quarterlyChartRef.current.getContext('2d');
      quarterlyChartInst.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: quarterlyData.map((d) => d.label),
          datasets: [
            {
              data: quarterlyData.map((d) => d.revenue),
              backgroundColor: [brandPink, brandGreen, brandRose, '#c1967f'],
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'Montserrat', size: 10 },
                boxWidth: 10,
                padding: 10,
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `Revenue: ${formatCurrency(ctx.parsed)}`,
              },
            },
          },
          onClick: (e, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              const slice = quarterlyData[idx];
              handleDrillDown('quarterly', slice.label, slice.orders);
            }
          },
        },
      });
    }

    // Clean up instances on unmount
    return () => {
      destroyChart(dailyChartInst);
      destroyChart(monthlyChartInst);
      destroyChart(quarterlyChartInst);
    };
  }, [loading, dailyData, monthlyData, quarterlyData]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Sales Management</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Principal executive dashboard offering multi-cyclical revenue charts and interactive transactional drill-downs.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        
        {/* KPI Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/35 shadow-sm hover:shadow transition-shadow">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[10px]">Total Revenue</span>
            <p className="font-headline-md text-headline-md text-primary mt-2">{formatCurrency(stats.totalRev)}</p>
            <div className="h-1 bg-primary/20 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-primary rounded-full w-[80%]"></div>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/35 shadow-sm hover:shadow transition-shadow">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[10px]">Total Orders</span>
            <p className="font-headline-md text-headline-md text-secondary mt-2">{stats.totalOrders}</p>
            <div className="h-1 bg-secondary/20 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-secondary rounded-full w-[65%]"></div>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/35 shadow-sm hover:shadow transition-shadow">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[10px]">Average Order Value</span>
            <p className="font-headline-md text-headline-md text-tertiary mt-2">{formatCurrency(stats.aov)}</p>
            <div className="h-1 bg-tertiary/20 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-tertiary rounded-full w-[72%]"></div>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/35 shadow-sm hover:shadow transition-shadow">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[10px]">Top Category</span>
            <p className="font-headline-md text-headline-md text-on-surface mt-2 truncate">{stats.topCat}</p>
            <div className="h-1 bg-on-surface/10 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-outline rounded-full w-[90%]"></div>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily line chart */}
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/35 flex flex-col min-h-[340px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-title-sm text-[15px] text-on-surface font-semibold">Daily Sales Trend</h3>
                <p className="text-[11px] text-on-surface-variant/75">Revenue progression (Last 14 Days)</p>
              </div>
              <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">Interactive</span>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant">Loading chart...</div>
            ) : (
              <div className="flex-1 relative">
                <canvas ref={dailyChartRef}></canvas>
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/65 text-center mt-3">Click on points to drill down to daily logs.</p>
          </div>

          {/* Monthly bar chart */}
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/35 flex flex-col min-h-[340px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-title-sm text-[15px] text-on-surface font-semibold">Monthly Sales breakdown</h3>
                <p className="text-[11px] text-on-surface-variant/75">Revenue by Calendar Month (2026)</p>
              </div>
              <span className="text-[10px] bg-secondary/10 text-secondary font-semibold px-2 py-0.5 rounded-full">Interactive</span>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant">Loading chart...</div>
            ) : (
              <div className="flex-1 relative">
                <canvas ref={monthlyChartRef}></canvas>
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/65 text-center mt-3">Click on bars to drill down to monthly logs.</p>
          </div>

          {/* Quarterly doughnut chart */}
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/35 flex flex-col min-h-[340px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-title-sm text-[15px] text-on-surface font-semibold">Quarterly Sales Distribution</h3>
                <p className="text-[11px] text-on-surface-variant/75">Revenue percentage share (2026)</p>
              </div>
              <span className="text-[10px] bg-tertiary/10 text-tertiary font-semibold px-2 py-0.5 rounded-full">Interactive</span>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant">Loading chart...</div>
            ) : (
              <div className="flex-1 relative min-h-[220px]">
                <canvas ref={quarterlyChartRef}></canvas>
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/65 text-center mt-3">Click on segments to drill down to quarterly logs.</p>
          </div>
        </section>

        {/* Drill-down Transactions Section */}
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/20 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-title-sm text-title-sm text-on-surface">Transactions Log</h2>
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full font-label-caps text-[10px] uppercase font-bold tracking-wider">
                  {drillDownType === 'all' ? 'All Sales' : `Filtered: ${drillDownLabel}`}
                </span>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant mt-1">
                Showing {displayOrders.length} transactions {drillDownType !== 'all' && `for ${drillDownLabel}`}.
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, customers, payment..."
                className="flex-1 sm:w-64 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3.5 py-2 font-body-sm text-body-sm text-on-surface transition-colors placeholder:text-on-surface-variant/50"
              />
              {drillDownType !== 'all' && (
                <button
                  onClick={() => handleDrillDown('all', '', [])}
                  className="bg-outline-variant hover:bg-outline/20 text-on-surface-variant font-label-caps text-[10px] px-4 py-2 rounded-lg flex items-center gap-1.5 uppercase transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {selectedOrderIds.length > 0 && (
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center animate-fade-in mb-4">
              <span className="font-body-sm text-[13px] text-on-surface font-semibold">
                Selected <span className="text-primary">{selectedOrderIds.length}</span> orders
              </span>
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="btn btn-primary py-2 px-4 text-[11px] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                Bulk Update Tracking
              </button>
            </div>
          )}

          {displayOrders.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant/60 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-4xl">search_off</span>
              <p className="font-body-lg font-semibold">No transactions found</p>
              <p className="font-body-sm">Try resetting your filters or adjusting your search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-outline-variant/20 rounded-lg">
              <table className="w-full border-collapse text-left bg-surface-container-lowest">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/30 text-on-surface font-label-caps text-[10px] uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={displayOrders.length > 0 && selectedOrderIds.length === displayOrders.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(displayOrders.map((o) => o.id));
                          } else {
                            setSelectedOrderIds([]);
                          }
                        }}
                        className="form-checkbox"
                      />
                    </th>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Exact Date &amp; Time (Timestamp)</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Items / Details</th>
                    <th className="p-4 text-right">Revenue</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                  {displayOrders.map((order) => {
                    const customer = [order.shippingDetails?.firstName, order.shippingDetails?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Guest Customer';
                    const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                    const formattedTime = new Date(order.placedAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    });

                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => handleSelectOrder(order)}
                      >
                        <td className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds((prev) => [...prev, order.id]);
                              } else {
                                setSelectedOrderIds((prev) => prev.filter((id) => id !== order.id));
                              }
                            }}
                            className="form-checkbox"
                          />
                        </td>
                        <td className="p-4 font-mono font-bold text-[12px] text-primary">{order.id}</td>
                        <td className="p-4 text-on-surface font-semibold whitespace-nowrap text-[12px]">{formattedTime}</td>
                        <td className="p-4 text-on-surface font-semibold">{customer}</td>
                        <td className="p-4 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className="flex shrink-0 -space-x-2 overflow-hidden">
                              {order.items.slice(0, 3).map((item, i) => (
                                <div key={i} className="inline-block h-7 w-6 rounded-md ring-2 ring-surface overflow-hidden bg-surface-container">
                                  <ProductImage src={item.image} alt={item.title} className="h-full w-full object-cover" />
                                </div>
                              ))}
                            </div>
                            <span className="text-[11px] text-on-surface-variant truncate">
                              {order.items[0]?.title} {itemsCount > 1 ? `+${itemsCount - 1} items` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-semibold text-on-surface">{formatCurrency(order.total)}</td>
                        <td className="p-4 text-on-surface-variant text-[11px] whitespace-nowrap">{order.paymentMethod}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap uppercase tracking-wider ${
                            order.status === 'Delivered' 
                              ? 'bg-secondary/15 text-secondary' 
                              : order.status === 'Cancelled'
                              ? 'bg-error/15 text-error'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateReceiptPdf(order);
                            }}
                            className="w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
                            title="Download Receipt"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Transaction Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant/35 flex justify-between items-center">
              <div>
                <span className="font-label-caps text-[10px] text-primary uppercase font-bold tracking-widest">Order Detail lookup</span>
                <h3 className="font-headline-md text-[20px] text-on-surface font-bold mt-1">Transaction {selectedOrder.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-6">
              {/* Order Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 text-xs">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Timestamp</p>
                  <p className="font-semibold text-on-surface mt-1">
                    {new Date(selectedOrder.placedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Payment Status</p>
                  <p className="font-semibold text-on-surface mt-1">{selectedOrder.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Log Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-1 ${
                    selectedOrder.status === 'Delivered' 
                      ? 'bg-secondary/15 text-secondary' 
                      : selectedOrder.status === 'Cancelled'
                      ? 'bg-error/15 text-error'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Grand Total</p>
                  <p className="font-bold text-[14px] text-primary mt-0.5">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>

              {/* Order Status & Tracking Configuration */}
              <div className="admin-card flex flex-col gap-4">
                <h4 className="font-title-sm text-[13px] text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                  Manage Order Status &amp; Tracking
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1.5">
                      Order Status
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="form-select text-[12px] py-1.5 px-3"
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Tracking Partner Dropdown */}
                  <div>
                    <label className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1.5">
                      Tracking Partner
                    </label>
                    <select
                      value={trackingPartner}
                      onChange={(e) => setTrackingPartner(e.target.value)}
                      className="form-select text-[12px] py-1.5 px-3"
                    >
                      <option value="">Select Partner</option>
                      {trackingPartners.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tracking ID Input */}
                  <div>
                    <label className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1.5">
                      Tracking ID
                    </label>
                    <input
                      type="text"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      placeholder="e.g. 123456789"
                      className="form-input text-[12px] py-1.5 px-3"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSavingTracking}
                  onClick={handleSaveTracking}
                  className="btn btn-primary self-end py-1.5 px-4 text-[10px]"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  {isSavingTracking ? 'Saving…' : 'Save Status & Tracking'}
                </button>
              </div>

              {/* Shipping (ShipPrime) */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-4">
                <h4 className="font-title-sm text-[13px] text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                  Shipping (ShipPrime)
                </h4>

                {(!selectedOrder.shipment || selectedOrder.shipment.status === 'failed') && (
                  <div className="flex flex-col gap-3">
                    {selectedOrder.shipment?.status === 'failed' && (
                      <p className="text-[12px] text-error">
                        Automatic shipment creation failed: {selectedOrder.shipment.error}
                      </p>
                    )}
                    {!selectedOrder.shipment && (
                      <p className="text-[12px] text-on-surface-variant">No shipment created yet.</p>
                    )}
                    <button
                      type="button"
                      disabled={shipmentBusy}
                      onClick={handleCreateShipment}
                      className="btn btn-primary self-start py-1.5 px-4 text-[10px]"
                    >
                      {shipmentBusy ? 'Creating…' : 'Create Shipment'}
                    </button>
                  </div>
                )}

                {selectedOrder.shipment && selectedOrder.shipment.status !== 'failed' && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <span className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1">AWB</span>
                        <span className="font-mono text-on-surface">{selectedOrder.shipment.awb}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1">Courier</span>
                        <span className="text-on-surface">{selectedOrder.shipment.courier}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1">Status</span>
                        <span className="text-on-surface">
                          {selectedOrder.shipment.status === 'cancelled' ? 'Cancelled' : (selectedOrder.shipment.currentStatus || 'Created')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.shipment.labelUrl && (
                        <a
                          href={selectedOrder.shipment.labelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary py-1.5 px-4 text-[10px]"
                        >
                          Print Label
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={shipmentBusy}
                        onClick={handleRefreshTracking}
                        className="btn btn-secondary py-1.5 px-4 text-[10px]"
                      >
                        {shipmentBusy ? 'Refreshing…' : 'Refresh Tracking'}
                      </button>
                      {selectedOrder.shipment.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={shipmentBusy}
                          onClick={handleCancelShipment}
                          className="btn py-1.5 px-4 text-[10px] text-error border border-error/30 hover:bg-error/10"
                        >
                          Cancel Shipment
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-title-sm text-[13px] text-on-surface font-semibold mb-3">Line Items</h4>
                <div className="flex flex-col gap-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest items-center">
                      <div className="w-12 h-16 rounded overflow-hidden shrink-0 border border-outline-variant/20 bg-surface-container">
                        <ProductImage className="w-full h-full object-cover" alt={item.title} src={item.image} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-title-sm text-[13px] text-on-surface truncate">{item.title}</h5>
                        <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                          {item.color || 'Default Color'} · {item.size || 'Default Size'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-on-surface">{formatCurrency(item.price)}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Details */}
              {selectedOrder.shippingDetails && (
                <div>
                  <h4 className="font-title-sm text-[13px] text-on-surface font-semibold mb-3">Shipping &amp; Delivery Details</h4>
                  <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface-variant space-y-1">
                    <p className="font-bold text-on-surface text-[13px] mb-1">
                      {[selectedOrder.shippingDetails.firstName, selectedOrder.shippingDetails.lastName].filter(Boolean).join(' ')}
                    </p>
                    <p>{selectedOrder.shippingDetails.address}</p>
                    {selectedOrder.shippingDetails.apartment && <p>{selectedOrder.shippingDetails.apartment}</p>}
                    <p>
                      {[selectedOrder.shippingDetails.city, selectedOrder.shippingDetails.state, selectedOrder.shippingDetails.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {selectedOrder.shippingDetails.phone && (
                      <p className="text-on-surface mt-2 font-mono">Phone: {selectedOrder.shippingDetails.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Total Details */}
              <div className="border-t border-outline-variant/35 pt-4 text-xs space-y-2">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Estimated Tax (18% GST)</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-[14px] font-bold text-on-surface pt-2 border-t border-dashed border-outline-variant/30">
                  <span>Total Amount Paid</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant/35 bg-surface-container flex gap-3 justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-lg border border-outline text-on-surface font-label-caps text-[10px] uppercase hover:bg-surface-container-high transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  generateReceiptPdf(selectedOrder);
                }}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-caps text-[10px] uppercase hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Tracking Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant/35 flex justify-between items-center">
              <div>
                <span className="font-label-caps text-[10px] text-primary uppercase font-bold tracking-widest">Batch Processing</span>
                <h3 className="font-headline-md text-[20px] text-on-surface font-bold mt-1">Bulk Update Tracking Details</h3>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-6">
              {/* Batch Configuration */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1.5">
                    Batch Order Status
                  </label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="form-select text-[12px] py-1.5 px-3"
                  >
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-on-surface-variant uppercase font-semibold mb-1.5">
                    Batch Tracking Partner
                  </label>
                  <select
                    value={bulkPartner}
                    onChange={(e) => setBulkPartner(e.target.value)}
                    className="form-select text-[12px] py-1.5 px-3"
                  >
                    <option value="">Select Partner</option>
                    {trackingPartners.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Individual Tracking IDs List */}
              <div>
                <h4 className="font-title-sm text-[13px] text-on-surface font-semibold mb-3">Individual Tracking IDs</h4>
                <div className="flex flex-col gap-3 max-h-[35vh] overflow-y-auto pr-1">
                  {selectedOrderIds.map((id) => {
                    const order = allOrders.find((o) => o.id === id);
                    const customer = [order?.shippingDetails?.firstName, order?.shippingDetails?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Guest Customer';
                    return (
                      <div key={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest">
                        <div className="flex-1">
                          <p className="font-mono font-bold text-[12px] text-primary">{id}</p>
                          <p className="text-[11px] text-on-surface-variant/80 mt-0.5">{customer}</p>
                        </div>
                        <div className="w-full sm:w-64">
                          <input
                            type="text"
                            value={bulkTrackingIds[id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBulkTrackingIds((prev) => ({ ...prev, [id]: val }));
                            }}
                            placeholder="Enter unique Tracking ID"
                            className="form-input text-[12px] py-1 px-3"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant/35 bg-surface-container flex gap-3 justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="btn btn-cancel text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingTracking}
                onClick={handleSaveBulkTracking}
                className="btn btn-primary text-[10px]"
              >
                {isSavingTracking ? 'Saving…' : 'Save Batch Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
