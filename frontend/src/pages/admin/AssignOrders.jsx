import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiPackage,
    FiMapPin,
    FiTruck,
    FiAlertCircle,
    FiCheckCircle,
    FiClock,
    FiZap,
    FiRefreshCw,
} from 'react-icons/fi';

const AssignOrders = () => {
    const [orders, setOrders] = useState([]);               // all READY orders
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [smartAssigningId, setSmartAssigningId] = useState(null);

    // selected partner for each order (for manual assign / reassign)
    const [selectedPartners, setSelectedPartners] = useState({});

    const fetchData = async () => {
        try {
            const [ordersRes, partnersRes] = await Promise.all([
                api.get('/admin/orders/ready'),            // ← new endpoint
                api.get('/admin/delivery-partners'),
            ]);
            setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);

            const availablePartners = partnersRes.data.filter(p => p.is_verified && p.is_available);
            setPartners(availablePartners);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectChange = (orderId, partnerId) => {
        setSelectedPartners(prev => ({ ...prev, [orderId]: partnerId }));
    };

    // ----- Manual Assign (unchanged) -----
    const handleAssign = async (orderId) => {
        const partnerId = selectedPartners[orderId];
        if (!partnerId) {
            toast.error('Please select a delivery partner first');
            return;
        }
        setProcessingId(orderId);
        try {
            await api.post(`/admin/orders/${orderId}/assign?partner_id=${partnerId}`);
            toast.success('Order assigned successfully! 🚚');
            setSelectedPartners(prev => {
                const newState = { ...prev };
                delete newState[orderId];
                return newState;
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Assignment failed');
        } finally {
            setProcessingId(null);
        }
    };

    // ----- Smart Assign -----
    const handleSmartAssign = async (orderId) => {
        setSmartAssigningId(orderId);
        try {
            const res = await api.post(`/admin/orders/${orderId}/assign-smart`);
            toast.success(res.data.message || 'Smart assignment completed ⚡');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Smart assignment failed');
        } finally {
            setSmartAssigningId(null);
        }
    };

    // ----- Reassign (for already assigned orders) -----
    const handleReassign = async (orderId, deliveryId) => {
        const newPartnerId = selectedPartners[orderId];
        if (!newPartnerId) {
            toast.error('Please select a new partner');
            return;
        }
        setProcessingId(orderId);
        try {
            await api.put(`/admin/orders/${orderId}/reassign?partner_id=${newPartnerId}`);
            toast.success('Order reassigned');
            setSelectedPartners(prev => {
                const newState = { ...prev };
                delete newState[orderId];
                return newState;
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Reassignment failed');
        } finally {
            setProcessingId(null);
        }
    };

    // ---------- Loading State ----------
    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading orders...</p>
            </div>
        );
    }

    const unassignedOrders = orders.filter(o => !o.delivery);
    const assignedOrders = orders.filter(o => o.delivery);

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Assign Deliveries</h1>
                    <p className="mt-1 text-sm text-slate-500">Match pending orders with active delivery partners.</p>
                </div>

                {!loading && partners.length === 0 && orders.length > 0 && (
                    <div className="mb-8 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl shadow-sm">
                        <FiAlertCircle className="mt-0.5 shrink-0 h-5 w-5" />
                        <div>
                            <h4 className="font-bold text-sm">No Delivery Partners Available</h4>
                            <p className="text-sm mt-1 opacity-90">There are currently no verified and online delivery partners.</p>
                        </div>
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-5">
                            <FiCheckCircle className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">All Caught Up!</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm">
                            No orders requiring assignment at the moment.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* ---------- Unassigned Orders ---------- */}
                        {unassignedOrders.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <FiClock className="text-amber-500" /> Unassigned Orders ({unassignedOrders.length})
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {unassignedOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            partners={partners}
                                            selectedPartner={selectedPartners[order.id] || ''}
                                            onSelectChange={handleSelectChange}
                                            onAssign={handleAssign}
                                            onSmartAssign={handleSmartAssign}
                                            isProcessing={processingId === order.id}
                                            isSmartAssigning={smartAssigningId === order.id}
                                            showSmartAssign
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ---------- Assigned Orders (for reassignment) ---------- */}
                        {assignedOrders.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <FiTruck className="text-blue-500" /> Assigned Orders ({assignedOrders.length})
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {assignedOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            partners={partners}
                                            selectedPartner={selectedPartners[order.id] || ''}
                                            onSelectChange={handleSelectChange}
                                            onAssign={null}                         // no manual assign for assigned orders
                                            onSmartAssign={null}                   // no smart assign for assigned orders
                                            onReassign={(orderId, deliveryId) => handleReassign(orderId, deliveryId)}
                                            isProcessing={processingId === order.id}
                                            isSmartAssigning={false}
                                            showReassign                                      // show reassign dropdown
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
};

// ---------- Reusable Order Card ----------
const OrderCard = ({
    order,
    partners,
    selectedPartner,
    onSelectChange,
    onAssign,
    onSmartAssign,
    onReassign,
    isProcessing,
    isSmartAssigning,
    showSmartAssign,
    showReassign,
}) => {
    const currentPartnerName = order.delivery?.partner_name || 'N/A';

    return (
        <div className="flex flex-col bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-md">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500 font-bold shrink-0">
                        <FiPackage size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg truncate">
                            Order #{order.id}
                        </h3>
                        {order.delivery ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 mt-1">
                                <FiTruck size={12} /> {currentPartnerName}
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 mt-1">
                                <FiClock size={12} /> Pending Assignment
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Value</p>
                    <p className="font-black text-slate-900 text-lg">₹{(order.total_amount || 0).toFixed(2)}</p>
                </div>
            </div>

            {/* Details */}
            <div className="p-6 flex-1 space-y-5">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-slate-400"><FiMapPin size={18} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pickup Location</p>
                        <p className="font-semibold text-slate-900">{order.restaurant_name}</p>
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Items</p>
                    <div className="flex flex-wrap gap-2">
                        {order.items?.map((item, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                <span className="text-slate-400">{item.qty}x</span> {item.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-5 mt-auto bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <FiTruck size={16} />
                    </div>
                    <select
                        value={selectedPartner}
                        onChange={(e) => onSelectChange(order.id, e.target.value)}
                        className="block w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all appearance-none"
                    >
                        <option value="" disabled>Select a partner...</option>
                        {partners.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.user?.full_name || `Partner #${p.id}`} ({p.vehicle_type})
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                {/* Manual Assign (only for unassigned) */}
                {onAssign && (
                    <button
                        onClick={() => onAssign(order.id)}
                        disabled={!selectedPartner || isProcessing}
                        className={`flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all sm:w-auto w-full ${!selectedPartner
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-4 focus:ring-slate-200'
                            }`}
                    >
                        {isProcessing ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            'Assign'
                        )}
                    </button>
                )}

                {/* Smart Assign (only for unassigned) */}
                {showSmartAssign && (
                    <button
                        onClick={() => onSmartAssign(order.id)}
                        disabled={isSmartAssigning}
                        className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm transition-all hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Auto-assign based on distance & load"
                    >
                        {isSmartAssigning ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                        ) : (
                            <>
                                <FiZap size={16} /> Smart
                            </>
                        )}
                    </button>
                )}

                {/* Reassign (only for assigned orders) */}
                {showReassign && (
                    <button
                        onClick={() => onReassign(order.id, order.delivery?.delivery_id)}
                        disabled={!selectedPartner || isProcessing}
                        className={`flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-sm font-bold text-orange-700 bg-orange-50 border border-orange-200 shadow-sm transition-all hover:bg-orange-100 hover:border-orange-300 disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {isProcessing ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" />
                        ) : (
                            <>
                                <FiRefreshCw size={16} /> Reassign
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AssignOrders;