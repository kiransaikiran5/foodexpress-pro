import { useState, useEffect } from 'react';
import api from '../services/api'; // <-- Changed from "../../" to "../"
import toast from 'react-hot-toast';
import {
    FiDollarSign,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiAlertCircle,
    FiRefreshCcw,
    FiFileText
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

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
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

// ---------- Status Config ----------
const statusConfig = {
    PENDING: { label: 'Pending', style: 'bg-amber-50 text-amber-600 border-amber-200', icon: FiClock },
    APPROVED: { label: 'Approved', style: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: FiCheckCircle },
    REJECTED: { label: 'Rejected', style: 'bg-red-50 text-red-600 border-red-200', icon: FiXCircle },
};

// ---------- Main Component ----------
const MyRefunds = () => {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRefunds = async () => {
            try {
                const res = await api.get('/refunds/my');
                setRefunds(res.data);
            } catch {
                toast.error('Failed to load refund history');
            } finally {
                setLoading(false);
            }
        };
        fetchRefunds();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading your refund history...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiRefreshCcw className="text-blue-500" /> My Refunds
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Track the status of your refund requests.</p>
                    </div>
                </div>

                {/* Content Area */}
                {refunds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                        <div className="h-16 w-16 bg-slate-50 border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-slate-300">
                            <FiDollarSign size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">No Refunds Requested</p>
                        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm">You haven't submitted any refund requests yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {refunds.map(refund => {
                            const config = statusConfig[refund.status] || statusConfig.PENDING;
                            const StatusIcon = config.icon;

                            return (
                                <div key={refund.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all hover:shadow-md group">

                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-slate-100 pb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <FiRefreshCcw size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900">Order #{refund.order_id}</h3>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                                                    <FiClock /> {formatDate(refund.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:items-end w-full sm:w-auto">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Amount</p>
                                            <p className="text-2xl font-black text-slate-900">{formatCurrency(refund.amount)}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
                                        <div className="flex-1 space-y-3">
                                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                    <FiFileText /> Your Reason
                                                </p>
                                                <p className="text-sm font-medium text-slate-700">"{refund.reason}"</p>
                                            </div>

                                            {refund.status === 'REJECTED' && refund.rejection_reason && (
                                                <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-1.5 flex items-center gap-1.5">
                                                        <FiAlertCircle /> Rejection Reason
                                                    </p>
                                                    <p className="text-sm font-medium text-red-700">"{refund.rejection_reason}"</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="shrink-0 mt-2 md:mt-0 w-full md:w-auto flex justify-start md:justify-end">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${config.style}`}>
                                                <StatusIcon className="w-4 h-4" />
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
};

export default MyRefunds;