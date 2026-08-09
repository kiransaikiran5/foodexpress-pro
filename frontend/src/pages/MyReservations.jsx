import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiCalendar,
    FiClock,
    FiX,
    FiCheckCircle,
    FiXCircle,
    FiMapPin,
    FiUsers,
    FiFileText,
    FiAlertTriangle
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatDate = (dateString) => {
    if (!dateString) return '-';

    // Parse the date normally without forcing a UTC offset
    const date = new Date(dateString);

    // Fallback just in case the backend sends an unparseable string
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// ---------- Status Config ----------
const statusConfig = {
    PENDING: { label: 'Pending', style: 'bg-amber-50 text-amber-600 border-amber-200', icon: FiClock },
    CONFIRMED: { label: 'Confirmed', style: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: FiCheckCircle },
    CANCELLED: { label: 'Cancelled', style: 'bg-red-50 text-red-600 border-red-200', icon: FiXCircle },
};

// ---------- Main Component ----------
const MyReservations = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        reservationId: null
    });

    const fetchReservations = async () => {
        try {
            const res = await api.get('/reservations/my');
            setReservations(res.data);
        } catch (err) {
            toast.error('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    // ---------- Modal Triggers ----------
    const handleCancelClick = (id) => {
        setConfirmModal({ isOpen: true, reservationId: id });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, reservationId: null });
    };

    // ---------- Action Execution ----------
    const executeCancel = async () => {
        const id = confirmModal.reservationId;
        if (!id) return;

        setActionLoading(id);
        closeConfirmModal(); // Close modal immediately for snappy UI

        try {
            await api.put(`/reservations/${id}/cancel`);
            toast.success('Reservation cancelled successfully');
            fetchReservations();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Cancel failed');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading your reservations...</p>
            </div>
        );
    }

    // Sort reservations: upcoming first, then past/cancelled
    const sortedReservations = [...reservations].sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date));

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiCalendar className="text-blue-500" /> My Reservations
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Track and manage your upcoming dining experiences.</p>
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                        {reservations.filter(r => r.status !== 'CANCELLED').length} Active
                    </div>
                </div>

                {/* Content Area */}
                {reservations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                        <div className="h-16 w-16 bg-blue-50 border border-blue-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-blue-500">
                            <FiCalendar size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">No Reservations Yet</p>
                        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm">You haven't booked any tables. Find a great restaurant and book your first table!</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {sortedReservations.map((r) => {
                            const config = statusConfig[r.status] || statusConfig.PENDING;
                            const StatusIcon = config.icon;
                            const isCancelled = r.status === 'CANCELLED';

                            return (
                                <div key={r.id} className={`bg-white rounded-3xl p-6 border transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md relative overflow-hidden ${isCancelled ? 'border-slate-200 opacity-75' : 'border-slate-100'}`}>

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-slate-100 pb-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${isCancelled ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                <FiMapPin size={20} />
                                            </div>
                                            <div>
                                                <h3 className={`text-lg font-black ${isCancelled ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                                    {r.restaurant_name}
                                                </h3>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                                                    <FiClock className={isCancelled ? 'text-slate-400' : 'text-blue-500'} />
                                                    <span className={isCancelled ? '' : 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md'}>
                                                        {formatDate(r.reservation_date)}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 w-full md:w-auto flex justify-start md:justify-end">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${config.style}`}>
                                                <StatusIcon className="w-4 h-4" />
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
                                        <div className="flex-1 w-full space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                                    <FiUsers className="text-slate-400" />
                                                    <span className="text-sm font-bold text-slate-700">{r.guests} Guest{r.guests > 1 ? 's' : ''}</span>
                                                </div>
                                            </div>

                                            {r.notes && (
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mt-2">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <FiFileText /> Special Request
                                                    </p>
                                                    <p className="text-sm font-medium text-slate-700">"{r.notes}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {!isCancelled && (
                                            <div className="shrink-0 mt-4 md:mt-0 w-full md:w-auto">
                                                <button
                                                    onClick={() => handleCancelClick(r.id)}
                                                    disabled={actionLoading === r.id}
                                                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold transition hover:bg-red-50 hover:border-red-300 shadow-sm active:scale-95 disabled:opacity-50"
                                                >
                                                    {actionLoading === r.id ? (
                                                        <><div className="h-4 w-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /> Cancelling...</>
                                                    ) : (
                                                        <><FiX size={16} /> Cancel Reservation</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
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
                                    Cancel Reservation?
                                </h3>
                                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                                    Are you sure you want to cancel this reservation? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={closeConfirmModal}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition active:scale-95"
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={executeCancel}
                                className="flex-1 font-bold py-3.5 rounded-xl transition shadow-md active:scale-95 text-white bg-red-500 hover:bg-red-600 shadow-red-200 flex justify-center items-center gap-2"
                            >
                                <FiX size={18} /> Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default MyReservations;