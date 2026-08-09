import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiShield, FiUsers, FiHome, FiTruck, FiDollarSign,
    FiShoppingCart, FiAlertCircle, FiCheckCircle, FiClock,
    FiSettings, FiDatabase, FiServer, FiActivity,
    FiTrendingUp, FiList, FiChevronLeft, FiChevronRight,
    FiUserCheck, FiCpu
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

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

// ---------- Main Component ----------
const SuperAdmin = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pagination State for Logs
    const [logsPage, setLogsPage] = useState(1);
    const LOGS_PER_PAGE = 5;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/admin/super-admin/dashboard');
                setData(res.data);
            } catch (err) {
                toast.error('Failed to load Super Admin dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600 mb-4"></div>
                <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Initializing Control Center...</p>
            </div>
        );
    }

    if (!data) return null;

    const counts = data.counts;
    const today = data.today;

    // --- Pagination Logic ---
    const totalLogPages = Math.max(1, Math.ceil((data.recent_logs?.length || 0) / LOGS_PER_PAGE));
    const paginatedLogs = (data.recent_logs || []).slice(
        (logsPage - 1) * LOGS_PER_PAGE,
        logsPage * LOGS_PER_PAGE
    );

    return (
        <main className="min-h-[calc(100vh-64px)] bg-[#f8fafc] py-10 px-4 sm:px-6 relative overflow-hidden flex justify-center">

            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none" />
            <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] bg-purple-400/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="max-w-7xl w-full mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="inline-flex items-center justify-center h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-600 shrink-0">
                            <FiShield size={28} />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                            Super Admin Control Center
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium sm:ml-[72px]">
                        Complete platform administration, monitoring, and verification.
                    </p>
                </div>

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-8">

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FiUsers size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customers</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{counts.customers.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <FiHome size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restaurants</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{counts.restaurants.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <FiTruck size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partners</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{counts.delivery_partners.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-indigo-900 transform -rotate-12 pointer-events-none">
                            <FiShoppingCart size={130} />
                        </div>
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <FiShoppingCart size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Today's Pulse</span>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl font-black text-slate-900 mb-1">{today.orders.toLocaleString()} <span className="text-sm text-slate-400 font-bold">Orders</span></p>
                            <p className="text-sm font-black text-emerald-500">{formatCurrency(today.revenue)} <span className="text-xs text-emerald-600/70 font-bold">Revenue</span></p>
                        </div>
                    </div>
                </div>

                {/* Verification & System Monitoring */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                    {/* Pending Verifications */}
                    <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiAlertCircle className="text-amber-500" /> Pending Verifications
                            </h3>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                            <Link to="/admin/restaurants" className="group flex justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                        <FiHome size={18} />
                                    </div>
                                    <span className="font-bold text-slate-700">Restaurant Approvals</span>
                                </div>
                                <span className="bg-amber-100 text-amber-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                                    {counts.pending_restaurants} Pending
                                </span>
                            </Link>

                            <Link to="/admin/delivery-partners" className="group flex justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                        <FiUserCheck size={18} />
                                    </div>
                                    <span className="font-bold text-slate-700">Partner Verification</span>
                                </div>
                                <span className="bg-amber-100 text-amber-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                                    {counts.unverified_partners} Unverified
                                </span>
                            </Link>
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiCpu className="text-blue-500" /> System Monitoring
                            </h3>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-white text-slate-600 rounded-full flex items-center justify-center shadow-sm">
                                        <FiServer size={18} />
                                    </div>
                                    <span className="font-bold text-slate-700">Backend API</span>
                                </div>
                                <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {data.system_status.backend}
                                </span>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-white text-slate-600 rounded-full flex items-center justify-center shadow-sm">
                                        <FiDatabase size={18} />
                                    </div>
                                    <span className="font-bold text-slate-700">Database</span>
                                </div>
                                <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {data.system_status.database}
                                </span>
                            </div>

                            <div className="pt-2 text-center">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                    <FiClock /> Last Activity: {data.system_status.last_audit_entry ? formatDateTime(data.system_status.last_audit_entry) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lower Grid: Quick Actions & Audit Logs */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

                    {/* Quick Actions */}
                    <div className="lg:col-span-5 bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden h-fit">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiActivity className="text-indigo-500" /> Quick Actions
                            </h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Link to="/admin/restaurants" className="group bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-slate-700">
                                <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-indigo-600"><FiHome size={16} /></div> Restaurants
                            </Link>
                            <Link to="/admin/delivery-partners" className="group bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-slate-700">
                                <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-indigo-600"><FiTruck size={16} /></div> Partners
                            </Link>
                            <Link to="/admin/coupons" className="group bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-slate-700">
                                <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-indigo-600"><FiDollarSign size={16} /></div> Coupons
                            </Link>
                            <Link to="/admin/settings" className="group bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-slate-700">
                                <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-indigo-600"><FiSettings size={16} /></div> Settings
                            </Link>
                            <Link to="/admin/reports" className="group bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-slate-700">
                                <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-indigo-600"><FiTrendingUp size={16} /></div> Reports
                            </Link>
                            <Link to="/admin/refunds" className="group bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-slate-700">
                                <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-indigo-600"><FiList size={16} /></div> Refunds
                            </Link>
                            <Link to="/admin/audit-logs" className="sm:col-span-2 group bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:shadow-md p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all text-white">
                                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center"><FiActivity size={16} /></div> View Full Audit Logs
                            </Link>
                        </div>
                    </div>

                    {/* Paginated Audit Logs */}
                    <div className="lg:col-span-7 bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden flex flex-col h-full min-h-[450px]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiList className="text-slate-500" /> Recent System Logs
                            </h3>
                        </div>
                        <div className="flex-1 p-2 sm:p-4">
                            {paginatedLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                    <FiActivity className="h-10 w-10 text-slate-200 mb-3" />
                                    <p className="text-slate-400 font-medium text-sm">No recent activity found.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {paginatedLogs.map(log => (
                                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
                                                    <FiActivity size={14} />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 block sm:inline">{log.action}</span>
                                                    {log.details && <span className="text-slate-500 text-sm sm:ml-2 block sm:inline mt-1 sm:mt-0">{log.details}</span>}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 sm:text-right">
                                                {formatDateTime(log.created_at)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        {totalLogPages > 1 && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                                <button
                                    onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                                    disabled={logsPage === 1}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    <FiChevronLeft size={14} /> Prev
                                </button>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Page {logsPage} of {totalLogPages}
                                </span>
                                <button
                                    onClick={() => setLogsPage(p => Math.min(totalLogPages, p + 1))}
                                    disabled={logsPage === totalLogPages}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    Next <FiChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
};

export default SuperAdmin;