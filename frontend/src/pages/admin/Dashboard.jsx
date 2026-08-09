import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiUsers,
    FiHome,
    FiTruck,
    FiShoppingCart,
    FiDollarSign,
    FiActivity,
    FiClock
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

// Safely parses timestamp strings appending 'Z' to naive UTC strings (fixes local time display bugs)
const ensureUTC = (dateValue) => {
    if (typeof dateValue !== 'string') return dateValue;
    if (!dateValue.endsWith('Z') && !/([+-]\d{2}:?\d{2})$/.test(dateValue)) {
        return `${dateValue}Z`;
    }
    return dateValue;
};

const formatDate = (dateString) => {
    if (!dateString) return 'Date unavailable';
    return new Date(ensureUTC(dateString)).toLocaleString('en-IN', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const getStatusConfig = (status) => {
    switch (status) {
        case 'PLACED': return 'bg-blue-50 text-blue-600 border-blue-200';
        case 'ACCEPTED': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
        case 'PREPARING': return 'bg-amber-50 text-amber-600 border-amber-200';
        case 'READY': return 'bg-purple-50 text-purple-600 border-purple-200';
        default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
};

// ---------- Loading Skeleton ----------
const DashboardSkeleton = () => (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-xl mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 sm:gap-6">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 h-32 flex flex-col justify-between">
                    <div className="flex items-center gap-3"><div className="h-10 w-10 bg-slate-100 rounded-xl"></div><div className="h-4 w-24 bg-slate-200 rounded-md"></div></div>
                    <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
                </div>
            ))}
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 h-96 p-6 mt-8"></div>
    </div>
);

// ---------- Main Component ----------
const AdminDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await api.get('/admin/dashboard/summary');
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <DashboardSkeleton />;
    if (!data) return null;

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                            Admin Dashboard
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 font-medium">
                            System overview and live platform metrics.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Live Sync
                    </div>
                </div>

                {/* ---------- Metric Cards ---------- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 sm:gap-6">

                    {/* Customers */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 flex flex-col justify-between group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FiUsers size={22} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customers</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{data.total_customers.toLocaleString()}</p>
                    </div>

                    {/* Restaurants */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 flex flex-col justify-between group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white transition-colors">
                                <FiHome size={22} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Restaurants</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{data.total_restaurants.toLocaleString()}</p>
                    </div>

                    {/* Delivery Partners */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 flex flex-col justify-between group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <FiTruck size={22} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1">Partners</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{data.total_delivery_partners.toLocaleString()}</p>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 flex flex-col justify-between group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <FiShoppingCart size={22} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{data.total_orders.toLocaleString()}</p>
                    </div>

                    {/* Revenue */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between xl:col-span-1 sm:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-400">
                                <FiDollarSign size={22} />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                        </div>
                        <p className="text-3xl font-black text-white truncate" title={formatCurrency(data.platform_revenue)}>
                            {formatCurrency(data.platform_revenue)}
                        </p>
                    </div>
                </div>

                {/* ---------- Live Orders Table ---------- */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden">

                    <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                <FiActivity size={20} />
                            </div>
                            Live Orders
                        </h2>
                        <span className="bg-blue-100 text-blue-700 px-3.5 py-1.5 rounded-full text-sm font-black tracking-wider">
                            {data.live_orders.length} Active
                        </span>
                    </div>

                    {data.live_orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4 text-slate-300">
                                <FiClock size={24} />
                            </div>
                            <p className="text-slate-900 font-bold text-lg">No live orders at the moment.</p>
                            <p className="text-slate-500 text-sm mt-1">New incoming orders will appear here automatically.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Order ID</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Restaurant</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Items</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Total</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Placed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.live_orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-900">#{order.id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-700">{order.customer_name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-700">{order.restaurant_name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[200px] truncate text-slate-500 text-sm" title={order.items}>
                                                    {order.items}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-900">{formatCurrency(order.total)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusConfig(order.status)}`}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                                                {formatDate(order.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default AdminDashboard;