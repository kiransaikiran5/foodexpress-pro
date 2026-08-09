import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiInbox,
    FiAlertCircle,
    FiClock,
    FiCheckCircle,
    FiEdit2,
    FiX,
    FiFilter,
    FiMessageSquare,
    FiHash,
    FiUser,
    FiAlignLeft,
    FiCheck
} from 'react-icons/fi';

// ---------- Helpers ----------
const ensureUTC = (dateValue) => {
    if (typeof dateValue !== 'string') return dateValue;
    if (!dateValue.endsWith('Z') && !/([+-]\d{2}:?\d{2})$/.test(dateValue)) {
        return `${dateValue}Z`;
    }
    return dateValue;
};

const formatDateTime = (dateValue) => {
    if (!dateValue) return '-';
    const date = new Date(ensureUTC(dateValue));
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
            return { label: 'Open', style: 'bg-rose-50 text-rose-600 border-rose-200' };
        case 'in_progress':
            return { label: 'In Progress', style: 'bg-amber-50 text-amber-600 border-amber-200' };
        case 'resolved':
            return { label: 'Resolved', style: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
        case 'closed':
            return { label: 'Closed', style: 'bg-slate-100 text-slate-500 border-slate-200' };
        default:
            return { label: status, style: 'bg-slate-50 text-slate-600 border-slate-200' };
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
const SupportDashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
    const [statusFilter, setStatusFilter] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [updateForm, setUpdateForm] = useState({ status: '', assigned_to: '', resolution_notes: '' });

    const fetchTickets = async () => {
        try {
            const url = statusFilter ? `/support/admin/tickets?status_filter=${statusFilter}` : '/support/admin/tickets';
            const res = await api.get(url);
            setTickets(res.data);
        } catch {
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/support/admin/dashboard');
            setStats(res.data);
        } catch { }
    };

    useEffect(() => {
        fetchTickets();
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const handleUpdate = async () => {
        setSubmitting(true);
        try {
            await api.put(`/support/admin/tickets/${editingId}`, updateForm);
            toast.success('Ticket updated successfully');
            setEditingId(null);
            fetchTickets();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (ticket) => {
        setEditingId(ticket.id);
        setUpdateForm({
            status: ticket.status,
            assigned_to: ticket.assigned_to || '',
            resolution_notes: ticket.resolution_notes || ''
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading support dashboard...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 relative overflow-hidden">

            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiMessageSquare className="text-indigo-500" /> Support Desk
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Manage customer queries, complaints, and requests.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10">
                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                <FiInbox size={20} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                <FiAlertCircle size={20} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open</span>
                        </div>
                        <p className="text-3xl font-black text-rose-600">{stats.open}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <FiClock size={20} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Progress</span>
                        </div>
                        <p className="text-3xl font-black text-amber-500">{stats.in_progress}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <FiCheckCircle size={20} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolved</span>
                        </div>
                        <p className="text-3xl font-black text-emerald-500">{stats.resolved}</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">

                    {/* Toolbar */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-lg font-black text-slate-900">Ticket Directory</h2>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-auto">
                                <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="h-11 w-full sm:w-48 pl-10 pr-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 cursor-pointer transition-all"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {tickets.length === 0 ? (
                        <div className="p-10 text-center">
                            <FiCheckCircle className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No tickets found matching the selected criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="p-5">Ticket ID</th>
                                        <th className="p-5">Subject & Category</th>
                                        <th className="p-5">Priority</th>
                                        <th className="p-5">Status</th>
                                        <th className="p-5">Created At</th>
                                        <th className="p-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tickets.map(t => {
                                        const status = getStatusConfig(t.status);
                                        const priorityClass = getPriorityConfig(t.priority);

                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-5 font-bold text-slate-900">
                                                    #{t.id}
                                                </td>
                                                <td className="p-5">
                                                    <p className="font-bold text-slate-900 mb-1 max-w-xs truncate">{t.subject}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.category}</p>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${priorityClass}`}>
                                                        {t.priority}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${status.style}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-slate-500 font-medium whitespace-nowrap">
                                                    {formatDateTime(t.created_at)}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button
                                                        onClick={() => openEdit(t)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
                                                    >
                                                        <FiEdit2 size={12} /> Resolve
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ---------- Modal Overlay ---------- */}
            {editingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">

                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <FiEdit2 className="text-indigo-500" /> Manage Ticket #{editingId}
                            </h3>
                            <button
                                onClick={() => setEditingId(null)}
                                className="h-8 w-8 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                        Update Status
                                    </label>
                                    <select
                                        value={updateForm.status}
                                        onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
                                        className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white cursor-pointer transition-all"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <FiUser /> Assigned User ID
                                    </label>
                                    <input
                                        type="number"
                                        value={updateForm.assigned_to}
                                        onChange={e => setUpdateForm({ ...updateForm, assigned_to: e.target.value })}
                                        className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white transition-all"
                                        placeholder="e.g., 52"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <FiAlignLeft /> Resolution Notes
                                </label>
                                <textarea
                                    rows={4}
                                    value={updateForm.resolution_notes}
                                    onChange={e => setUpdateForm({ ...updateForm, resolution_notes: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white transition-all resize-none placeholder:text-slate-400"
                                    placeholder="Enter details about how this was resolved..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setEditingId(null)}
                                    disabled={submitting}
                                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition active:scale-95 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={submitting}
                                    className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-md active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                    ) : (
                                        <><FiCheck size={18} /> Save Changes</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default SupportDashboard;