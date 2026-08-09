import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiSearch,
    FiDatabase,
    FiFilter,
    FiClock,
    FiUser,
    FiFileText
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatDate = (dateString) => {
    if (!dateString) return '-';

    // Parse the date normally without forcing the UTC 'Z' offset
    const date = new Date(dateString);

    // Fallback just in case the backend sends an unparseable string
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

const ActionBadge = ({ action }) => {
    let colorClass = 'bg-slate-50 text-slate-600 border-slate-200';
    const act = action?.toUpperCase() || '';

    if (act.includes('CREATE') || act.includes('ADD') || act.includes('REGISTER') || act.includes('APPROVE')) {
        colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    } else if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY')) {
        colorClass = 'bg-amber-50 text-amber-600 border-amber-200';
    } else if (act.includes('DELETE') || act.includes('REMOVE') || act.includes('REJECT')) {
        colorClass = 'bg-red-50 text-red-600 border-red-200';
    } else if (act.includes('LOGIN') || act.includes('SUCCESS') || act.includes('AUTH')) {
        colorClass = 'bg-blue-50 text-blue-600 border-blue-200';
    }

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${colorClass}`}>
            {action?.replace(/_/g, ' ')}
        </span>
    );
};

// ---------- Main Component ----------
const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        user_id: '',
        action: '',
        table_name: '',
        start_date: '',
        end_date: '',
    });

    const fetchLogs = async () => {
        try {
            const params = {};
            if (filters.user_id) params.user_id = filters.user_id;
            if (filters.action) params.action = filters.action;
            if (filters.table_name) params.table_name = filters.table_name;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;

            const res = await api.get('/admin/audit-logs/', { params });
            setLogs(res.data);
        } catch (err) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApplyFilters = (e) => {
        e.preventDefault();
        setLoading(true);
        fetchLogs();
    };

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiDatabase className="text-blue-500" /> System Audit Logs
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Track and monitor all administrative and system actions.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                        <FiFilter className="text-slate-400" />
                        <h2 className="font-bold text-slate-800">Filter Records</h2>
                    </div>

                    <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">User ID</label>
                            <input
                                type="number"
                                value={filters.user_id}
                                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                                placeholder="E.g. 42"
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Action</label>
                            <input
                                type="text"
                                value={filters.action}
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                                placeholder="E.g. LOGIN_SUCCESS"
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Table</label>
                            <input
                                type="text"
                                value={filters.table_name}
                                onChange={(e) => handleFilterChange('table_name', e.target.value)}
                                placeholder="E.g. orders"
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                            <input
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                            <input
                                type="date"
                                value={filters.end_date}
                                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                className="h-12 w-full bg-blue-600 text-white px-6 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FiSearch size={18} /> Apply
                            </button>
                        </div>
                    </form>
                </div>

                {/* Logs Table Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-slate-500 font-medium text-sm">Fetching audit logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-center shadow-sm">
                        <div className="h-16 w-16 bg-slate-50 border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <FiFileText size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">No Logs Found</p>
                        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm">No audit records match the current filter criteria.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-lg text-slate-900">Results</h3>
                            <span className="text-xs font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-lg">{logs.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Log ID</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Action</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Table / Context</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                #{log.id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-slate-100 text-slate-400 p-1.5 rounded-md">
                                                        <FiUser size={14} />
                                                    </div>
                                                    <span className="font-semibold text-slate-700">{log.user_name || 'System'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <ActionBadge action={log.action} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{log.table_name || '-'}</span>
                                                    {log.record_id && (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Rec ID: {log.record_id}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[250px] truncate text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100" title={log.details}>
                                                    {log.details || 'No additional details provided'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500">
                                                    <FiClock size={12} className="text-slate-400" />
                                                    {formatDate(log.created_at)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default AuditLogs;