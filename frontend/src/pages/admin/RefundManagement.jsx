import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiRefreshCcw,
    FiCheck,
    FiX,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiUser,
    FiFileText,
    FiAlertTriangle
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

// Safely parses timestamp strings appending 'Z' to naive UTC strings
const ensureUTC = (dateValue) => {
    if (typeof dateValue !== 'string') return dateValue;
    if (!dateValue.endsWith('Z') && !/([+-]\d{2}:?\d{2})$/.test(dateValue)) {
        return `${dateValue}Z`;
    }
    return dateValue;
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(ensureUTC(dateString)).toLocaleString('en-IN', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

// ---------- Status Badge Component ----------
const StatusBadge = ({ status }) => {
    const config = {
        PENDING: { style: 'bg-amber-50 text-amber-600 border-amber-200', icon: FiClock },
        APPROVED: { style: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: FiCheckCircle },
        REJECTED: { style: 'bg-red-50 text-red-600 border-red-200', icon: FiXCircle },
    };

    const StatusIcon = config[status]?.icon || FiClock;
    const styleStr = config[status]?.style || 'bg-slate-50 text-slate-600 border-slate-200';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${styleStr}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status}
        </span>
    );
};

// ---------- Main Component ----------
const RefundManagement = () => {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectionReason, setRejectionReason] = useState({});
    const [actionLoading, setActionLoading] = useState(null);

    // Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: '', // 'APPROVE' or 'REJECT'
        refundId: null,
        reason: ''
    });

    const fetchRefunds = async () => {
        try {
            const res = await api.get('/admin/refunds/');
            setRefunds(res.data);
        } catch (err) {
            toast.error('Failed to load refund requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefunds();
    }, []);

    // ---------- Modal Triggers ----------
    const handleApproveClick = (id) => {
        setConfirmModal({ isOpen: true, type: 'APPROVE', refundId: id, reason: '' });
    };

    const handleRejectClick = (id) => {
        const reason = rejectionReason[id] || '';
        if (!reason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        setConfirmModal({ isOpen: true, type: 'REJECT', refundId: id, reason: reason.trim() });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, type: '', refundId: null, reason: '' });
    };

    // ---------- Action Execution ----------
    const executeAction = async () => {
        const { type, refundId, reason } = confirmModal;

        setActionLoading(refundId);
        closeConfirmModal(); // Close modal immediately to show loading state on the button

        try {
            if (type === 'APPROVE') {
                await api.put(`/admin/refunds/${refundId}/approve`);
                toast.success('Refund approved successfully');
            } else if (type === 'REJECT') {
                await api.put(`/admin/refunds/${refundId}/reject`, { rejection_reason: reason });
                toast.success('Refund request rejected');
                setRejectionReason(prev => ({ ...prev, [refundId]: '' }));
            }
            fetchRefunds();
        } catch (err) {
            toast.error(err.response?.data?.detail || `${type === 'APPROVE' ? 'Approval' : 'Rejection'} failed`);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading refund requests...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiRefreshCcw className="text-blue-500" /> Refund Management
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Review and process customer refund requests.</p>
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                        {refunds.filter(r => r.status === 'PENDING').length} Pending Requests
                    </div>
                </div>

                {/* Content Area */}
                {refunds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-center shadow-sm">
                        <div className="h-16 w-16 bg-slate-50 border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-emerald-500">
                            <FiCheckCircle size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">All caught up!</p>
                        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm">There are no pending refund requests at the moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {refunds.map(refund => (
                            <div key={refund.id} className={`bg-white rounded-3xl p-6 border transition-all shadow-sm ${refund.status === 'PENDING' ? 'border-amber-200 shadow-amber-500/5 hover:shadow-md' : 'border-slate-100'}`}>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${refund.status === 'PENDING' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                                            refund.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                                'bg-red-50 text-red-500 border-red-100'
                                            }`}>
                                            <FiRefreshCcw size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-black text-slate-900">Order #{refund.order_id}</h3>
                                                <StatusBadge status={refund.status} />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5"><FiUser /> {refund.customer_name}</span>
                                                <span className="flex items-center gap-1.5"><FiClock /> {formatDate(refund.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right shrink-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Refund Amount</p>
                                        <p className="text-2xl font-black text-slate-900">{formatCurrency(refund.amount)}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5"><FiFileText /> Customer Reason</p>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed">"{refund.reason}"</p>
                                </div>

                                {refund.status === 'REJECTED' && refund.rejection_reason && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1.5"><FiAlertTriangle /> Admin Rejection Note</p>
                                        <p className="text-sm font-medium text-red-700 leading-relaxed">"{refund.rejection_reason}"</p>
                                    </div>
                                )}

                                {refund.status === 'PENDING' && (
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-2">
                                        <button
                                            onClick={() => handleApproveClick(refund.id)}
                                            disabled={actionLoading === refund.id}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                            <FiCheck size={16} /> {actionLoading === refund.id ? 'Processing...' : 'Approve Refund'}
                                        </button>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                            <input
                                                type="text"
                                                placeholder="Provide reason to reject..."
                                                value={rejectionReason[refund.id] || ''}
                                                onChange={(e) => setRejectionReason(prev => ({ ...prev, [refund.id]: e.target.value }))}
                                                className="w-full sm:w-64 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition bg-white"
                                            />
                                            <button
                                                onClick={() => handleRejectClick(refund.id)}
                                                disabled={actionLoading === refund.id}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
                                            >
                                                <FiX size={16} /> {actionLoading === refund.id ? 'Processing...' : 'Reject'}
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                            <div className={`p-4 rounded-2xl shrink-0 ${confirmModal.type === 'APPROVE' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                <FiAlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {confirmModal.type === 'APPROVE' ? 'Approve Refund?' : 'Reject Refund?'}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                                    {confirmModal.type === 'APPROVE'
                                        ? 'Are you sure you want to approve this refund? The amount will be returned to the customer. This action cannot be undone.'
                                        : 'Are you sure you want to reject this refund request? This action cannot be undone.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={closeConfirmModal}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeAction}
                                className={`flex-1 font-bold py-3.5 rounded-xl transition shadow-md active:scale-95 text-white ${confirmModal.type === 'APPROVE' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                    }`}
                            >
                                {confirmModal.type === 'APPROVE' ? 'Yes, Approve' : 'Yes, Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default RefundManagement;