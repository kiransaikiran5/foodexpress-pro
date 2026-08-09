import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiClock,
    FiAlertCircle,
    FiCheckCircle,
    FiHelpCircle,
    FiMessageSquare,
    FiTag,
    FiHash,
    FiAlignLeft,
    FiX,
    FiInbox,
    FiAlertTriangle,
    FiInfo,
    FiLifeBuoy,
    FiSend
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatDateTime = (dateValue) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const getStatusConfig = (status) => {
    switch (status) {
        case 'open':
            return { label: 'Open', style: 'bg-rose-50 text-rose-600 border-rose-200', icon: FiAlertCircle };
        case 'in_progress':
            return { label: 'In Progress', style: 'bg-amber-50 text-amber-600 border-amber-200', icon: FiClock };
        case 'resolved':
            return { label: 'Resolved', style: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: FiCheckCircle };
        case 'closed':
            return { label: 'Closed', style: 'bg-slate-100 text-slate-500 border-slate-200', icon: FiX };
        default:
            return { label: status, style: 'bg-slate-50 text-slate-600 border-slate-200', icon: FiInfo };
    }
};

const getPriorityConfig = (priority) => {
    switch (priority) {
        case 'urgent': return 'text-rose-600 bg-rose-50 border-rose-200';
        case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'low': return 'text-slate-600 bg-slate-50 border-slate-200';
        default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
};

// ---------- Main Component ----------
const MyTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        subject: '', description: '', category: 'order', priority: 'medium', order_id: ''
    });

    const fetchTickets = async () => {
        try {
            const res = await api.get('/support/tickets');
            setTickets(res.data);
        } catch {
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/support/tickets', form);
            toast.success('Ticket raised successfully!');
            setShowForm(false);
            setForm({ subject: '', description: '', category: 'order', priority: 'medium', order_id: '' });
            fetchTickets();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to submit ticket');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 mb-4"></div>
                <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Loading support...</p>
            </div>
        );
    }

    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    return (
        <>
            <main className="min-h-[calc(100vh-64px)] bg-[#f8fafc] py-10 px-4 sm:px-6 relative overflow-hidden flex justify-center">

                {/* Ambient Background */}
                <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50/80 to-transparent pointer-events-none" />
                <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="max-w-6xl w-full mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* ---------- Left Column: Control Panel ---------- */}
                    <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8 space-y-6">

                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

                            <div className="relative z-10">
                                <div className="inline-flex items-center justify-center h-14 w-14 bg-white/10 rounded-2xl border border-white/10 text-blue-400 mb-6 backdrop-blur-md">
                                    <FiLifeBuoy size={28} />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight mb-3">
                                    Support Center
                                </h1>
                                <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
                                    Need help? Raise a ticket and our dedicated support team will get back to you shortly.
                                </p>

                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center justify-center gap-2 bg-blue-600 text-white w-full py-4 rounded-xl font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-md shadow-blue-900/20"
                                >
                                    <FiPlus size={20} /> Raise a Ticket
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                                <div className="flex items-center gap-2 mb-2 text-rose-500">
                                    <FiAlertCircle size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Open</span>
                                </div>
                                <p className="text-3xl font-black text-slate-900">{openTickets}</p>
                            </div>
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                                <div className="flex items-center gap-2 mb-2 text-emerald-500">
                                    <FiCheckCircle size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Resolved</span>
                                </div>
                                <p className="text-3xl font-black text-slate-900">{resolvedTickets}</p>
                            </div>
                        </div>
                    </div>

                    {/* ---------- Right Column: Ticket List ---------- */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Your Tickets</h2>
                        </div>

                        {tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-sm text-center">
                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 text-slate-300">
                                    <FiInbox size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 mb-1">No Tickets Found</h3>
                                <p className="text-slate-500 font-medium text-sm">You haven't raised any support requests yet.</p>
                            </div>
                        ) : (
                            tickets.map(ticket => {
                                const status = getStatusConfig(ticket.status);
                                const StatusIcon = status.icon;

                                return (
                                    <div key={ticket.id} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_15px_rgb(0,0,0,0.02)] border border-slate-200 transition-all hover:shadow-md hover:border-slate-300 group">

                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 border-b border-slate-100 pb-5">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${status.style}`}>
                                                        <StatusIcon size={12} /> {status.label}
                                                    </span>
                                                    <span className={`inline-flex px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getPriorityConfig(ticket.priority)}`}>
                                                        {ticket.priority} Priority
                                                    </span>
                                                    <span className="inline-flex px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                                        {ticket.category}
                                                    </span>
                                                </div>
                                                <h3 className="font-black text-xl text-slate-900 leading-tight">
                                                    {ticket.subject}
                                                </h3>
                                            </div>
                                            <div className="shrink-0 text-left sm:text-right">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Ticket ID</p>
                                                <p className="text-base font-black text-slate-900">#{ticket.id}</p>
                                            </div>
                                        </div>

                                        <div className="bg-[#f8fafc] rounded-2xl p-5 border border-slate-100 mb-5 relative">
                                            <div className="absolute -left-2 top-6 bottom-6 w-1 bg-slate-200 rounded-r-md" />
                                            <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                {ticket.description}
                                            </p>
                                            {ticket.order_id && (
                                                <div className="mt-4 pt-4 border-t border-slate-200/60 inline-flex">
                                                    <p className="text-xs font-bold text-blue-600 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                                        <FiHash /> Related Order: #{ticket.order_id}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {ticket.resolution_notes && (
                                            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 mb-5 relative">
                                                <div className="absolute -left-2 top-6 bottom-6 w-1 bg-emerald-300 rounded-r-md" />
                                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1.5">
                                                    <FiCheckCircle /> Support Team Resolution
                                                </p>
                                                <p className="text-sm font-medium text-emerald-800 whitespace-pre-wrap leading-relaxed">
                                                    {ticket.resolution_notes}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <span className="flex items-center gap-1.5"><FiClock size={12} /> Opened {formatDateTime(ticket.created_at)}</span>
                                            {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                                                <span>Updated {formatDateTime(ticket.updated_at)}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* ---------- React Portal Modal for New Ticket ---------- */}
            {showForm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">

                        {/* Fixed Header */}
                        <div className="flex justify-between items-center p-6 sm:p-8 sm:pb-6 border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <FiMessageSquare className="text-blue-500" /> New Support Request
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="h-8 w-8 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                            >
                                <FiX size={16} />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="overflow-y-auto p-6 sm:p-8 sm:py-6 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <form id="ticket-form" onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <FiTag className="text-blue-500" /> Subject
                                    </label>
                                    <input
                                        value={form.subject}
                                        onChange={e => setForm({ ...form, subject: e.target.value })}
                                        className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-slate-700"
                                        placeholder="Brief summary..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <FiHelpCircle className="text-blue-500" /> Category
                                        </label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm({ ...form, category: e.target.value })}
                                            className="h-12 w-full border border-slate-200 rounded-xl px-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-slate-700 cursor-pointer"
                                        >
                                            <option value="order">Order</option>
                                            <option value="delivery">Delivery</option>
                                            <option value="refund">Refund</option>
                                            <option value="account">Account</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <FiAlertTriangle className="text-blue-500" /> Priority
                                        </label>
                                        <select
                                            value={form.priority}
                                            onChange={e => setForm({ ...form, priority: e.target.value })}
                                            className="h-12 w-full border border-slate-200 rounded-xl px-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-slate-700 cursor-pointer"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <FiHash className="text-blue-500" /> Order ID <span className="text-slate-300 normal-case tracking-normal font-medium">(Optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.order_id}
                                        onChange={e => setForm({ ...form, order_id: e.target.value })}
                                        className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-slate-700"
                                        placeholder="e.g., 1042"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <FiAlignLeft className="text-blue-500" /> Description
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-slate-700 resize-none placeholder:text-slate-400"
                                        placeholder="Describe your issue..."
                                        required
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Fixed Footer Buttons */}
                        <div className="p-6 sm:p-8 sm:py-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex-1 bg-white border border-slate-200 text-slate-700 h-12 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="ticket-form"
                                disabled={submitting}
                                className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 text-white h-12 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70"
                            >
                                {submitting ? (
                                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                                ) : (
                                    <><FiSend size={16} /> Submit Ticket</>
                                )}
                            </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default MyTickets;