import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiMapPin,
    FiDollarSign,
    FiStar,
    FiTruck,
    FiNavigation,
    FiClock,
    FiBarChart2,
    FiCheckCircle,
    FiMap,
    FiPackage,
    FiCalendar,
    FiCreditCard
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
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

const StatusBadge = ({ status }) => {
    const config = {
        ASSIGNED: 'bg-blue-50 text-blue-600 border-blue-200',
        PICKED_UP: 'bg-amber-50 text-amber-600 border-amber-200',
        DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    };
    return (
        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${config[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {status?.replace('_', ' ')}
        </span>
    );
};

// ---------- Main Component ----------
const DeliveryDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [routeUrl, setRouteUrl] = useState(null);
    const [optimizing, setOptimizing] = useState(false);
    const [routeResult, setRouteResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [traffic, setTraffic] = useState('moderate');

    // ---- Module 41: Earnings state ----
    const [earningsTab, setEarningsTab] = useState('daily');
    const [dailyData, setDailyData] = useState(null);
    const [weeklyData, setWeeklyData] = useState(null);
    const [payments, setPayments] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        try {
            const res = await api.get('/delivery/dashboard/summary');
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/delivery/dashboard/route-history');
            setHistory(res.data);
        } catch { }
    };

    // ---- Earnings fetch functions ----
    const fetchDailyEarnings = async (date) => {
        try {
            const res = await api.get(`/delivery/earnings/daily?date=${date}`);
            setDailyData(res.data);
        } catch { }
    };

    const fetchWeeklyEarnings = async () => {
        try {
            const res = await api.get('/delivery/earnings/weekly');
            setWeeklyData(res.data);
        } catch { }
    };

    const fetchPayments = async () => {
        try {
            const res = await api.get('/delivery/earnings/payments');
            setPayments(res.data);
        } catch { }
    };

    useEffect(() => {
        fetchData();
        fetchHistory();
        fetchDailyEarnings(selectedDate);
        fetchWeeklyEarnings();
        fetchPayments();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Re-fetch daily earnings when date changes
    useEffect(() => {
        fetchDailyEarnings(selectedDate);
    }, [selectedDate]);

    const handleOptimizeRoute = async () => {
        setOptimizing(true);
        try {
            const res = await api.get('/delivery/dashboard/optimize-route', {
                params: { traffic },
            });
            setRouteUrl(res.data.google_maps_url);
            setRouteResult({
                distance: res.data.total_distance_km,
                eta: res.data.estimated_time_min,
                stops: res.data.optimized_stops,
            });
            if (res.data.optimized_stops.length === 0) {
                toast.error('No active stops to optimize', { icon: 'ℹ️' });
            } else {
                toast.success('Route optimized successfully!');
                fetchHistory();
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Could not optimize route');
        } finally {
            setOptimizing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading your dashboard...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiTruck className="text-blue-500" /> Delivery Portal
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Manage your active runs and optimize your routes.</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FiNavigation size={24} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active</span>
                        </div>
                        <p className="text-3xl lg:text-4xl font-black text-slate-900">{data.active_count}</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <FiCheckCircle size={24} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                        </div>
                        <p className="text-3xl lg:text-4xl font-black text-slate-900">{data.completed_count}</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <FiDollarSign size={24} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Earnings</span>
                        </div>
                        <p className="text-3xl lg:text-4xl font-black text-green-600">{formatCurrency(data.total_earnings)}</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <FiStar size={24} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Rating</span>
                        </div>
                        <p className="text-3xl lg:text-4xl font-black text-amber-500 flex items-baseline gap-1">
                            {data.avg_rating.toFixed(1)} <span className="text-xl">★</span>
                        </p>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column (Larger) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Route Optimization */}
                        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                                <h2 className="text-xl font-black flex items-center gap-2 text-slate-900">
                                    <FiMap className="text-blue-500" /> Route Optimizer
                                </h2>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                    <select
                                        value={traffic}
                                        onChange={(e) => setTraffic(e.target.value)}
                                        className="h-12 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all cursor-pointer"
                                    >
                                        <option value="light">Light Traffic</option>
                                        <option value="moderate">Moderate Traffic</option>
                                        <option value="heavy">Heavy Traffic</option>
                                    </select>
                                    <button
                                        onClick={handleOptimizeRoute}
                                        disabled={optimizing}
                                        className="h-12 bg-blue-600 text-white px-6 rounded-xl font-bold shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        {optimizing ? (
                                            <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Computing...</>
                                        ) : (
                                            <><FiNavigation /> Optimize Route</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {routeResult ? (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Distance</p>
                                            <p className="text-xl font-black text-slate-900">{routeResult.distance} km</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Estimated Time</p>
                                            <p className="text-xl font-black text-slate-900">{routeResult.eta} mins</p>
                                        </div>
                                    </div>

                                    {routeResult.stops.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                                <FiMapPin /> Optimized Itinerary
                                            </p>
                                            <div className="space-y-2">
                                                {routeResult.stops.map((stop, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                        <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm text-slate-800">{stop.name}</p>
                                                        </div>
                                                        <div className="shrink-0">
                                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${stop.type === 'pickup' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                {stop.type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {routeUrl && (
                                        <a
                                            href={routeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center justify-center gap-2 bg-emerald-500 text-white h-12 rounded-xl hover:bg-emerald-600 transition shadow-md shadow-emerald-200 font-bold active:scale-[0.99]"
                                        >
                                            <FiMap size={18} /> Open Itinerary in Google Maps
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <FiMap className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                                    <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto">
                                        Select traffic conditions and click "Optimize Route" to calculate the most efficient path for your current deliveries.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Active Deliveries */}
                        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black flex items-center gap-2 text-slate-900">
                                    <FiPackage className="text-indigo-500" /> Active Deliveries
                                </h2>
                                <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1 rounded-lg">
                                    {data.active_count}
                                </span>
                            </div>

                            {data.active_deliveries.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <p className="text-slate-500 font-medium text-sm">No active deliveries at the moment. Wait for new assignments.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {data.active_deliveries.map((d) => (
                                        <div key={d.delivery_id} className="border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all">
                                            <div className="flex-1 w-full">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-black text-lg text-slate-900">#{d.order_id}</span>
                                                    <StatusBadge status={d.status} />
                                                </div>
                                                {d.order_summary && (
                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <p className="text-sm font-bold text-slate-800 mb-1">
                                                            {d.order_summary.restaurant_name}
                                                        </p>
                                                        <p className="text-xs font-medium text-slate-500 mb-2 truncate">
                                                            {d.order_summary.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                                                        </p>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {formatCurrency(d.order_summary.total)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                                                <Link
                                                    to="/delivery/assigned"
                                                    className="flex w-full sm:w-auto items-center justify-center bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition active:scale-95 text-sm"
                                                >
                                                    Manage Run
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        {/* Recent Completed */}
                        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                            <h2 className="text-lg font-black flex items-center gap-2 text-slate-900 mb-6">
                                <FiCheckCircle className="text-emerald-500" /> Recent Completes
                            </h2>
                            {data.recent_completed.length === 0 ? (
                                <p className="text-slate-500 font-medium text-sm">No completed deliveries yet today.</p>
                            ) : (
                                <div className="space-y-4">
                                    {data.recent_completed.map((d) => (
                                        <div key={d.delivery_id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-slate-900">#{d.order_id}</span>
                                                <span className="font-black text-emerald-600">{formatCurrency(d.total)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                <FiClock /> {formatDate(d.actual_delivery)}
                                            </div>
                                            <p className="text-xs font-medium text-slate-500 truncate bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                {d.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Route History Table */}
                <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-black flex items-center gap-2 text-slate-900">
                            <FiBarChart2 className="text-purple-500" /> Route History
                        </h2>
                    </div>

                    {history.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-500 font-medium text-sm">No previous routes recorded.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date Computed</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Waypoints</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Dist (km)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">ETA (min)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Traffic</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.map((h) => (
                                        <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {formatDate(h.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[200px] truncate text-xs font-medium text-slate-500" title={h.optimized_stops.map((s) => s.name).join(' → ')}>
                                                    {h.optimized_stops.map((s) => s.name).join(' → ')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900">
                                                {h.total_distance_km}
                                            </td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900">
                                                {h.estimated_time_min}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${h.traffic_condition === 'light' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                    h.traffic_condition === 'heavy' ? 'bg-red-50 text-red-600 border-red-200' :
                                                        'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                    {h.traffic_condition || 'moderate'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {h.google_maps_url ? (
                                                    <a
                                                        href={h.google_maps_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                                                    >
                                                        <FiMap /> Map
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ======================= MODULE 41: EARNINGS SECTION ======================= */}
                <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xl font-black flex items-center gap-2 text-slate-900">
                            <FiDollarSign className="text-green-500" /> Earnings Breakdown
                        </h2>
                        {/* Earnings Sub-Tabs */}
                        <div className="flex gap-6 mt-4">
                            {['daily', 'weekly', 'history'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setEarningsTab(tab)}
                                    className={`text-sm font-bold uppercase tracking-wide pb-1 border-b-2 transition ${earningsTab === tab
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {tab === 'history' ? 'Payment History' : tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        {/* Daily Earnings */}
                        {earningsTab === 'daily' && (
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <label className="text-sm font-semibold text-slate-600">Select Date:</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-green-500"
                                    />
                                </div>
                                {dailyData ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div className="bg-blue-50 p-5 rounded-2xl">
                                            <p className="text-sm text-slate-500">Deliveries</p>
                                            <p className="text-3xl font-black text-slate-900">{dailyData.deliveries_completed}</p>
                                        </div>
                                        <div className="bg-green-50 p-5 rounded-2xl">
                                            <p className="text-sm text-slate-500">Base Earnings</p>
                                            <p className="text-3xl font-black text-green-700">{formatCurrency(dailyData.base_earnings)}</p>
                                        </div>
                                        <div className="bg-yellow-50 p-5 rounded-2xl">
                                            <p className="text-sm text-slate-500">Bonus</p>
                                            <p className="text-3xl font-black text-yellow-700">{formatCurrency(dailyData.bonus)}</p>
                                        </div>
                                        <div className="col-span-full bg-white border border-slate-200 p-6 rounded-2xl">
                                            <p className="text-sm text-slate-500">Total Earnings for {dailyData.date}</p>
                                            <p className="text-4xl font-black text-green-600">{formatCurrency(dailyData.total_earnings)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-500">Loading earnings...</p>
                                )}
                            </div>
                        )}

                        {/* Weekly Earnings */}
                        {earningsTab === 'weekly' && (
                            weeklyData ? (
                                <div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
                                        <div className="bg-blue-50 p-5 rounded-2xl">
                                            <p className="text-sm text-slate-500">Deliveries</p>
                                            <p className="text-3xl font-black">{weeklyData.total_deliveries}</p>
                                        </div>
                                        <div className="bg-green-50 p-5 rounded-2xl">
                                            <p className="text-sm text-slate-500">Base</p>
                                            <p className="text-3xl font-black text-green-700">{formatCurrency(weeklyData.total_base)}</p>
                                        </div>
                                        <div className="bg-yellow-50 p-5 rounded-2xl">
                                            <p className="text-sm text-slate-500">Bonus</p>
                                            <p className="text-3xl font-black text-yellow-700">{formatCurrency(weeklyData.total_bonus)}</p>
                                        </div>
                                        <div className="bg-white border p-5 rounded-2xl">
                                            <p className="text-sm text-slate-500">Total</p>
                                            <p className="text-3xl font-black text-green-600">{formatCurrency(weeklyData.total_earnings)}</p>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-700 mb-3">Daily Breakdown</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="p-3 text-left">Date</th>
                                                    <th className="p-3 text-center">Deliveries</th>
                                                    <th className="p-3 text-center">Base</th>
                                                    <th className="p-3 text-center">Bonus</th>
                                                    <th className="p-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {weeklyData.daily_breakdown.map((day) => (
                                                    <tr key={day.date} className="border-b border-slate-100">
                                                        <td className="p-3 font-medium">{day.date}</td>
                                                        <td className="p-3 text-center">{day.deliveries}</td>
                                                        <td className="p-3 text-center">{formatCurrency(day.base)}</td>
                                                        <td className="p-3 text-center">{formatCurrency(day.bonus)}</td>
                                                        <td className="p-3 text-right font-bold">{formatCurrency(day.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : <p className="text-slate-500">Loading weekly data...</p>
                        )}

                        {/* Payment History */}
                        {earningsTab === 'history' && (
                            <div>
                                {payments.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-2xl border">
                                        <FiCreditCard className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                                        <p className="text-slate-500 font-medium">No payment records found.</p>
                                    </div>
                                ) : (
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="p-3 text-left">Date</th>
                                                <th className="p-3 text-left">Amount</th>
                                                <th className="p-3 text-left">Method</th>
                                                <th className="p-3 text-left">Reference</th>
                                                <th className="p-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((p) => (
                                                <tr key={p.id} className="border-b border-slate-100">
                                                    <td className="p-3 font-medium">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                                                    <td className="p-3 font-bold text-green-600">{formatCurrency(p.amount)}</td>
                                                    <td className="p-3 capitalize">{p.method}</td>
                                                    <td className="p-3 text-slate-500">{p.reference || '-'}</td>
                                                    <td className="p-3 text-right">
                                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold capitalize">
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
};

export default DeliveryDashboard;