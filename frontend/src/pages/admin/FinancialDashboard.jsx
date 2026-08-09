import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import {
    FiTrendingUp,
    FiHome,
    FiTruck,
    FiRotateCcw,
    FiCreditCard,
    FiAlertCircle,
    FiActivity,
    FiPieChart,
    FiArrowDownRight,
    FiArrowUpRight,
    FiChevronLeft,
    FiChevronRight
} from 'react-icons/fi';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// ---------- Helpers ----------
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

// ---------- Main Component ----------
const FinancialDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pagination States
    const [refundsPage, setRefundsPage] = useState(1);
    const [walletPage, setWalletPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/admin/financial-dashboard/');
                setData(res.data);
            } catch (err) {
                toast.error('Failed to load financial data');
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
                <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Compiling Financials...</p>
            </div>
        );
    }

    if (!data) return null;

    // --- Pagination Logic ---
    const totalRefundsPages = Math.max(1, Math.ceil(data.refunds.length / ITEMS_PER_PAGE));
    const paginatedRefunds = data.refunds.slice(
        (refundsPage - 1) * ITEMS_PER_PAGE,
        refundsPage * ITEMS_PER_PAGE
    );

    const totalWalletPages = Math.max(1, Math.ceil(data.wallet_transactions.length / ITEMS_PER_PAGE));
    const paginatedWallet = data.wallet_transactions.slice(
        (walletPage - 1) * ITEMS_PER_PAGE,
        walletPage * ITEMS_PER_PAGE
    );

    // --- Chart Data & Options ---
    const dailyRevenueChart = {
        labels: data.daily_revenue.map((d) => d.date),
        datasets: [
            {
                label: 'Daily Revenue',
                data: data.daily_revenue.map((d) => d.revenue),
                borderColor: '#4f46e5', // indigo-600
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 3,
                tension: 0.4, // Smooth curve
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4f46e5',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 14, weight: 'bold' },
                callbacks: {
                    label: (context) => ` ${formatCurrency(context.raw)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9', drawBorder: false },
                ticks: {
                    callback: (value) => `₹${value}`,
                    color: '#64748b'
                }
            },
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: '#64748b' }
            }
        }
    };

    const restaurantRevenueChart = {
        labels: data.restaurant_revenue.map((r) => r.name),
        datasets: [
            {
                label: 'Revenue',
                data: data.restaurant_revenue.map((r) => r.revenue),
                backgroundColor: '#10b981', // emerald-500
                borderRadius: 6, // Rounded bars
                borderSkipped: false,
                barThickness: 'flex',
                maxBarThickness: 40
            },
        ],
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 14, weight: 'bold' },
                callbacks: {
                    label: (context) => ` ${formatCurrency(context.raw)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9', drawBorder: false, borderDash: [5, 5] },
                ticks: {
                    callback: (value) => `₹${value}`,
                    color: '#64748b'
                }
            },
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: '#64748b' }
            }
        }
    };

    return (
        <main className="min-h-[calc(100vh-64px)] bg-[#f8fafc] py-10 px-4 sm:px-6 relative overflow-hidden flex justify-center">

            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none" />
            <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="max-w-7xl w-full mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="mb-10">
                    <div className="inline-flex items-center justify-center h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-600 mb-4">
                        <FiActivity size={28} />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">
                        Financial Overview
                    </h1>
                    <p className="text-slate-500 font-medium">Track daily revenue, payouts, delivery metrics, and platform performance.</p>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {/* Metric 1 */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <FiTrendingUp size={20} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Today's Revenue</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">
                            {formatCurrency(data.daily_revenue.length ? data.daily_revenue[data.daily_revenue.length - 1].revenue : 0)}
                        </p>
                    </div>

                    {/* Metric 2 */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <FiHome size={20} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active Partners</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">
                            {data.restaurant_revenue.length}
                        </p>
                    </div>

                    {/* Metric 3 */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <FiTruck size={20} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Delivery Fees</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">
                            {formatCurrency(data.total_delivery_fees)}
                        </p>
                    </div>

                    {/* Metric 4 */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <FiRotateCcw size={20} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Refunds Processed</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">
                            {data.refunds.length}
                        </p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Line Chart */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiTrendingUp className="text-indigo-500" /> Daily Revenue (7 Days)
                            </h3>
                        </div>
                        <div className="h-[300px] w-full">
                            <Line data={dailyRevenueChart} options={lineOptions} />
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiPieChart className="text-emerald-500" /> Revenue by Restaurant
                            </h3>
                        </div>
                        <div className="h-[300px] w-full">
                            {data.restaurant_revenue.length > 0 ? (
                                <Bar data={restaurantRevenueChart} options={barOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                                    No data available to display.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* Refunds Table */}
                    <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiAlertCircle className="text-rose-500" /> Recent Refunds
                            </h3>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            {data.refunds.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[300px] p-10 text-center">
                                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100 text-slate-300">
                                        <FiCheckCircle size={20} />
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm">No refunds processed recently.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="p-5">Order</th>
                                            <th className="p-5">Reason</th>
                                            <th className="p-5">Status</th>
                                            <th className="p-5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedRefunds.map((ref) => (
                                            <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-5">
                                                    <p className="font-bold text-slate-900 mb-0.5">#{ref.order_id}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{formatDate(ref.created_at)}</p>
                                                </td>
                                                <td className="p-5">
                                                    <p className="text-slate-600 font-medium max-w-[200px] truncate" title={ref.reason}>
                                                        {ref.reason}
                                                    </p>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${ref.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                        ref.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                        {ref.status}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-right font-black text-rose-600">
                                                    {formatCurrency(Math.abs(ref.amount))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Refunds Pagination Footer (Always Visible for balance) */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <button
                                onClick={() => setRefundsPage(p => Math.max(1, p - 1))}
                                disabled={refundsPage === 1}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <FiChevronLeft size={14} /> Prev
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Page {refundsPage} of {totalRefundsPages}
                            </span>
                            <button
                                onClick={() => setRefundsPage(p => Math.min(totalRefundsPages, p + 1))}
                                disabled={refundsPage === totalRefundsPages || data.refunds.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Next <FiChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Wallet Transactions Table */}
                    <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <FiCreditCard className="text-blue-500" /> Wallet Activity
                            </h3>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            {data.wallet_transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[300px] p-10 text-center">
                                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100 text-slate-300">
                                        <FiCheckCircle size={20} />
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm">No recent wallet transactions.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="p-5">Wallet ID</th>
                                            <th className="p-5">Description</th>
                                            <th className="p-5">Date & Time</th>
                                            <th className="p-5 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedWallet.map((tx) => {
                                            const isCredit = tx.type === 'credit';
                                            return (
                                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-5 font-bold text-slate-900">
                                                        {tx.wallet_id}
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                                {isCredit ? <FiArrowDownRight size={12} /> : <FiArrowUpRight size={12} />}
                                                            </div>
                                                            <p className="text-slate-600 font-medium max-w-[180px] truncate" title={tx.description}>
                                                                {tx.description}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <p className="font-bold text-slate-900 mb-0.5">{formatDate(tx.created_at)}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{formatTime(tx.created_at)}</p>
                                                    </td>
                                                    <td className={`p-5 text-right font-black ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                        {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Wallet Pagination Footer (Always Visible for balance) */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <button
                                onClick={() => setWalletPage(p => Math.max(1, p - 1))}
                                disabled={walletPage === 1}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <FiChevronLeft size={14} /> Prev
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Page {walletPage} of {totalWalletPages}
                            </span>
                            <button
                                onClick={() => setWalletPage(p => Math.min(totalWalletPages, p + 1))}
                                disabled={walletPage === totalWalletPages || data.wallet_transactions.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Next <FiChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </main>
    );
};

export default FinancialDashboard;