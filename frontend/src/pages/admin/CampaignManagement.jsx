import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiSend,
    FiTrash2,
    FiEdit2,
    FiX,
    FiCalendar,
    FiVolume2,
    FiMail,
    FiMessageCircle,
    FiSmartphone,
    FiBell,
    FiUsers,
    FiFilter,
    FiAlignLeft,
    FiType,
    FiCheckCircle,
    FiClock
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

// Accurately converts a UTC or ISO string to local datetime for the HTML input
const getLocalDatetime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getChannelConfig = (channel) => {
    switch (channel) {
        case 'email': return { icon: FiMail, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Email' };
        case 'sms': return { icon: FiMessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'SMS' };
        case 'push': return { icon: FiSmartphone, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Push Notification' };
        case 'in_app': return { icon: FiBell, color: 'text-amber-600', bg: 'bg-amber-50', label: 'In-App' };
        default: return { icon: FiVolume2, color: 'text-slate-600', bg: 'bg-slate-50', label: channel };
    }
};

// ---------- Main Component ----------
const CampaignManagement = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [sending, setSending] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '', message: '', channel: 'in_app', audience_type: 'all', audience_filters: '', scheduled_at: ''
    });

    const fetchCampaigns = async () => {
        try {
            const res = await api.get('/admin/campaigns/');
            setCampaigns(res.data);
        } catch {
            toast.error('Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const resetForm = () => {
        setForm({ title: '', message: '', channel: 'in_app', audience_type: 'all', audience_filters: '', scheduled_at: '' });
        setShowForm(false);
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Clean payload
        const payload = { ...form };
        if (!payload.scheduled_at) payload.scheduled_at = null;
        if (payload.audience_type === 'all') payload.audience_filters = '';

        try {
            if (editingId) {
                await api.put(`/admin/campaigns/${editingId}/`, payload);
                toast.success('Campaign updated successfully');
            } else {
                await api.post('/admin/campaigns/', payload);
                toast.success('Campaign created successfully');
            }
            fetchCampaigns();
            resetForm();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save campaign');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSend = async (id) => {
        setSending(id);
        try {
            await api.post(`/admin/campaigns/${id}/send`);
            toast.success('Campaign sent to queue!');
            fetchCampaigns();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to send campaign');
        } finally {
            setSending(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
        try {
            await api.delete(`/admin/campaigns/${id}`);
            toast.success('Campaign deleted');
            fetchCampaigns();
        } catch {
            toast.error('Failed to delete campaign');
        }
    };

    const handleEdit = (c) => {
        setForm({
            title: c.title,
            message: c.message,
            channel: c.channel,
            audience_type: c.audience_type,
            audience_filters: c.audience_filters || '',
            scheduled_at: getLocalDatetime(c.scheduled_at)
        });
        setEditingId(c.id);
        setShowForm(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600 mb-4"></div>
                <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Loading Campaigns...</p>
            </div>
        );
    }

    return (
        <>
            <main className="min-h-[calc(100vh-64px)] bg-[#f8fafc] py-10 px-4 sm:px-6 relative overflow-hidden flex justify-center">

                {/* Ambient Background */}
                <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none" />
                <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="max-w-6xl w-full mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                        <div>
                            <div className="inline-flex items-center justify-center h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-600 mb-4">
                                <FiVolume2 size={28} />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">
                                Marketing Campaigns
                            </h1>
                            <p className="text-slate-500 font-medium">Create and send targeted promotions to your audience.</p>
                        </div>

                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-600/20 w-full md:w-auto shrink-0"
                        >
                            <FiPlus size={18} /> New Campaign
                        </button>
                    </div>

                    {/* Campaign List */}
                    {campaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-sm text-center">
                            <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100 text-indigo-400">
                                <FiVolume2 size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">No Campaigns Yet</h3>
                            <p className="text-slate-500 font-medium text-sm">Start reaching out to your customers by creating your first campaign.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5">
                            {campaigns.map(c => {
                                const channelObj = getChannelConfig(c.channel);
                                const ChannelIcon = channelObj.icon;
                                const isSent = c.status === 'sent';

                                return (
                                    <div key={c.id} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-0.5 group flex flex-col lg:flex-row gap-6 lg:items-center">

                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 border border-white/50 shadow-sm ${channelObj.bg} ${channelObj.color}`}>
                                            <ChannelIcon size={28} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${isSent ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                    {isSent ? <FiCheckCircle size={12} /> : <FiClock size={12} />}
                                                    {isSent ? 'Sent' : 'Draft'}
                                                </span>
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200`}>
                                                    {channelObj.label}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">
                                                    <FiUsers /> {c.audience_type === 'all' ? 'All Users' : 'Targeted Segment'}
                                                </span>
                                            </div>

                                            <h3 className="font-black text-xl text-slate-900 leading-tight mb-2 truncate">
                                                {c.title}
                                            </h3>
                                            <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed">
                                                {c.message}
                                            </p>

                                            <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {c.scheduled_at && !isSent && (
                                                    <span className="flex items-center gap-1.5 text-indigo-500">
                                                        <FiCalendar size={12} /> Scheduled: {formatDateTime(c.scheduled_at)}
                                                    </span>
                                                )}
                                                {isSent && c.sent_at && (
                                                    <span className="flex items-center gap-1.5">
                                                        <FiCheckCircle size={12} /> Sent: {formatDateTime(c.sent_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto">
                                            {!isSent && (
                                                <button
                                                    onClick={() => handleSend(c.id)}
                                                    disabled={sending === c.id}
                                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md active:scale-95 disabled:opacity-70"
                                                >
                                                    {sending === c.id ? (
                                                        <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                                                    ) : (
                                                        <><FiSend size={16} /> Send Now</>
                                                    )}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleEdit(c)}
                                                className="h-12 w-12 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200 shadow-sm"
                                                title="Edit Campaign"
                                            >
                                                <FiEdit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="h-12 w-12 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-200 shadow-sm"
                                                title="Delete Campaign"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* ---------- Modal Overlay for Form ---------- */}
            {showForm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-white/20">

                        {/* Fixed Header */}
                        <div className="flex justify-between items-center p-6 sm:p-8 sm:pb-6 border-b border-slate-100 shrink-0 bg-white z-10">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <FiVolume2 className="text-indigo-500" />
                                {editingId ? 'Edit Campaign' : 'Create New Campaign'}
                            </h2>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="h-8 w-8 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors shrink-0"
                            >
                                <FiX size={16} />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="overflow-y-auto p-6 sm:p-8 sm:py-6 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <form id="campaign-form" onSubmit={handleSubmit} className="space-y-6">

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FiType className="text-indigo-500" /> Campaign Title
                                    </label>
                                    <input
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white transition-all text-slate-900"
                                        placeholder="e.g., Summer Weekend Flash Sale"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <FiSmartphone className="text-indigo-500" /> Channel
                                        </label>
                                        <select
                                            value={form.channel}
                                            onChange={e => setForm({ ...form, channel: e.target.value })}
                                            className="h-12 w-full border border-slate-200 rounded-xl px-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white transition-all text-slate-700 cursor-pointer"
                                        >
                                            <option value="in_app">In-App Notification</option>
                                            <option value="push">Push Notification</option>
                                            <option value="email">Email</option>
                                            <option value="sms">SMS</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <FiUsers className="text-indigo-500" /> Target Audience
                                        </label>
                                        <select
                                            value={form.audience_type}
                                            onChange={e => setForm({ ...form, audience_type: e.target.value })}
                                            className="h-12 w-full border border-slate-200 rounded-xl px-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white transition-all text-slate-700 cursor-pointer"
                                        >
                                            <option value="all">All Customers</option>
                                            <option value="custom">Custom Segment</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Custom Filter Input (Animated drop down) */}
                                {form.audience_type === 'custom' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <FiFilter className="text-indigo-500" /> Audience Filters (JSON)
                                        </label>
                                        <input
                                            value={form.audience_filters}
                                            onChange={e => setForm({ ...form, audience_filters: e.target.value })}
                                            placeholder='e.g. {"min_orders": 5, "city": "Bangalore"}'
                                            className="h-11 w-full border border-slate-200 rounded-xl px-4 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-white transition-all text-slate-700"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FiAlignLeft className="text-indigo-500" /> Message Body
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={form.message}
                                        onChange={e => setForm({ ...form, message: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white transition-all text-slate-700 resize-none placeholder:text-slate-400"
                                        placeholder="Type your promotional message here..."
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FiCalendar className="text-indigo-500" /> Schedule Delivery <span className="text-slate-300 normal-case tracking-normal font-medium">(Optional)</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.scheduled_at}
                                        onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                                        className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 focus:bg-white transition-all text-slate-700"
                                    />
                                    <p className="text-xs text-slate-500 mt-2 font-medium">Leave blank to send immediately upon clicking "Send".</p>
                                </div>

                            </form>
                        </div>

                        {/* Fixed Footer Buttons */}
                        <div className="p-6 sm:p-8 sm:py-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-3 z-10">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex-1 bg-white border border-slate-200 text-slate-700 h-12 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="campaign-form"
                                disabled={submitting}
                                className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 text-white h-12 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
                            >
                                {submitting ? (
                                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                ) : (
                                    <><FiCheckCircle size={18} /> {editingId ? 'Update Campaign' : 'Save Campaign'}</>
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

export default CampaignManagement;