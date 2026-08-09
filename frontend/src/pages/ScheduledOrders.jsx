import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiCalendar,
    FiClock,
    FiX,
    FiShoppingBag,
    FiRefreshCw,
    FiAlertTriangle,
    FiFileText
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

const formatDate = (dateString) => {
    if (!dateString) return '-';

    // Parse the date normally without forcing a UTC offset
    const date = new Date(dateString);

    // Fallback just in case the backend sends an unparseable string
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// ---------- Main Component ----------
const ScheduledOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        orderId: null
    });

    const fetchOrders = async () => {
        try {
            const res = await api.get('/scheduled-orders');
            // Keep only active schedules (not yet processed / cancelled)
            const activeOrders = res.data.filter(order => order.is_active);
            setOrders(activeOrders);
        } catch {
            toast.error('Failed to load scheduled orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // ---------- Modal Triggers ----------
    const handleCancelClick = (id) => {
        setConfirmModal({ isOpen: true, orderId: id });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, orderId: null });
    };

    // ---------- Action Execution ----------
    const executeCancel = async () => {
        const id = confirmModal.orderId;
        if (!id) return;

        setActionLoading(id);
        closeConfirmModal(); // Close modal immediately for snappy UI

        try {
            await api.put(`/scheduled-orders/${id}/cancel`);
            toast.success('Scheduled order cancelled successfully');
            fetchOrders();
        } catch {
            toast.error('Failed to cancel order');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading your scheduled orders...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiCalendar className="text-blue-500" /> Scheduled Orders
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Manage your upcoming deliveries and subscriptions.</p>
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                        {orders.length} Active {orders.length === 1 ? 'Schedule' : 'Schedules'}
                    </div>
                </div>

                {/* Content Area */}
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                        <div className="h-16 w-16 bg-blue-50 border border-blue-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-blue-500">
                            <FiCalendar size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">No Scheduled Orders</p>
                        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm">You don't have any upcoming scheduled deliveries. Plan your meals ahead to save time!</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all hover:shadow-md relative overflow-hidden">

                                {/* Top Banner for Recurrence */}
                                {order.recurrence_type && order.recurrence_type !== 'none' && (
                                    <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-bl-xl border-b border-l border-indigo-100 flex items-center gap-1.5">
                                        <FiRefreshCw size={12} /> {order.recurrence_type}
                                    </div>
                                )}

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-slate-100 pb-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                            <FiShoppingBag size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900">{order.restaurant_name || 'Restaurant'}</h3>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                                                <FiClock className="text-blue-500" /> Scheduled: <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{formatDate(order.scheduled_time)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-left md:text-right shrink-0 w-full md:w-auto">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Amount</p>
                                        <p className="text-2xl font-black text-slate-900">{formatCurrency(order.total_amount)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
                                    <div className="flex-1 w-full">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                            <FiFileText /> Items Included
                                        </p>
                                        <ul className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1.5">
                                            {order.items.map(item => (
                                                <li key={item.id} className="text-sm font-medium text-slate-700 flex justify-between items-center">
                                                    <span>{item.food_name}</span>
                                                    <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-500 shadow-sm">x{item.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="shrink-0 mt-4 md:mt-0 w-full md:w-auto">
                                        <button
                                            onClick={() => handleCancelClick(order.id)}
                                            disabled={actionLoading === order.id}
                                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold transition hover:bg-red-50 hover:border-red-300 shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                            {actionLoading === order.id ? (
                                                <><div className="h-4 w-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /> Cancelling...</>
                                            ) : (
                                                <><FiX size={16} /> Cancel Schedule</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ---------- Center Screen Modal ---------- */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-5 mb-8">
                            <div className="p-4 rounded-2xl shrink-0 bg-red-100 text-red-600">
                                <FiAlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    Cancel Scheduled Order?
                                </h3>
                                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                                    Are you sure you want to cancel this scheduled order? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={closeConfirmModal}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition active:scale-95"
                            >
                                Keep Order
                            </button>
                            <button
                                onClick={executeCancel}
                                className="flex-1 font-bold py-3.5 rounded-xl transition shadow-md active:scale-95 text-white bg-red-500 hover:bg-red-600 shadow-red-200"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ScheduledOrders;