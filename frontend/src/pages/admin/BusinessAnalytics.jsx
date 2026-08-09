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
    FiBarChart2,
    FiTrendingUp,
    FiUsers,
    FiHome,
    FiTruck,
    FiDollarSign,
    FiShoppingCart,
    FiClock,
    FiCheckCircle,
    FiActivity
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

const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
};

// ---------- Main Component ----------
const BusinessAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/admin/business-analytics/');
                setData(res.data);
            } catch (err) {
                toast.error('Failed to load analytics');
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
                <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Analyzing Data...</p>
            </div>
        );
    }

    if (!data) return null;

    const kpis = data.kpis;
    const delivery = data.delivery_performance;

    // --- Chart 1: Customer Retention (Stacked Bar) ---
    const retentionChart = {
        labels: data.customer_retention.map(r => r.month),
        datasets: [
            {
                label: 'Returning Customers',
                data: data.customer_retention.map(r => r.returning_customers),
                backgroundColor: '#10b981', // emerald-500
                borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                borderSkipped: false,
                barThickness: 'flex',
                maxBarThickness: 32
            },
            {
                label: 'New Customers',
                data: data.customer_retention.map(r => r.new_customers),
                backgroundColor: '#3b82f6', // blue-500
                borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                borderSkipped: false,
                barThickness: 'flex',
                maxBarThickness: 32
            }
        ],
    };

    const retentionOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 14, weight: 'bold' }
            }
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false, drawBorder: false },
                ticks: { color: '#64748b' }
            },
            y: {
                stacked: true,
                beginAtZero: true,
                grid: { color: '#f1f5f9', drawBorder: false, borderDash: [5, 5] },
                ticks: { color: '#64748b' }
            }
        }
    };

    // --- Chart 2: Restaurant Growth (Dual Axis Line) ---
    const growthChart = {
        labels: data.restaurant_growth.map(g => g.month),
        datasets: [
            {
                label: 'Orders',
                data: data.restaurant_growth.map(g => g.total_orders),
                borderColor: '#f59e0b', // amber-500
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y1',
                fill: true,
            },
            {
                label: 'New Restaurants',
                data: data.restaurant_growth.map(g => g.new_restaurants),
                borderColor: '#8b5cf6', // violet-500
                backgroundColor: '#8b5cf6',
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y',
                pointRadius: 4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#8b5cf6',
                pointBorderWidth: 2,
            }
        ],
    };

    const growthOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 14, weight: 'bold' }
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: { color: '#f1f5f9', drawBorder: false },
                ticks: { color: '#8b5cf6', font: { weight: 'bold' } }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: false }, // Only draw grid lines for the first axis
                ticks: { color: '#f59e0b', font: { weight: 'bold' } }
            },
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: '#64748b' }
            }
        }
    };

    // --- Chart 3: Revenue Forecast (Line) ---
    const historical = data.revenue_forecast.historical;
    const forecastLabel = [...Array(historical.length).keys()].map(i => `M${i + 1}`);
    forecastLabel.push('Next Month');

    const forecastData = [...historical, data.revenue_forecast.next_month_prediction];

    const forecastChart = {
        labels: forecastLabel,
        datasets: [
            {
                label: 'Revenue (₹)',
                data: forecastData,
                borderColor: '#ec4899', // pink-500
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: forecastData.map((_, i) => i === forecastData.length - 1 ? '#ec4899' : '#ffffff'),
                pointBorderColor: '#ec4899',
                pointBorderWidth: 2,
                pointRadius: forecastData.map((_, i) => i === forecastData.length - 1 ? 6 : 4),
                pointHoverRadius: 8,
                segment: {
                    borderDash: ctx => ctx.p0DataIndex === forecastData.length - 2 ? [6, 6] : undefined,
                },
            },
        ],
    };

    const forecastOptions = {
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
                beginAtZero: false,
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
            <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] bg-purple-400/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="max-w-7xl w-full mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="inline-flex items-center justify-center h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-600 shrink-0">
                            <FiActivity size={28} />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                            Business Intelligence
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-18 sm:ml-0">
                        Analyze customer retention, restaurant growth, and revenue forecasts.
                    </p>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 mb-8">

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FiShoppingCart size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Orders</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{formatNumber(kpis.total_orders)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <FiDollarSign size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600">{formatCurrency(kpis.total_revenue)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <FiUsers size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active (30d)</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{formatNumber(kpis.active_customers_30d)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <FiHome size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restaurants</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{formatNumber(kpis.total_restaurants)}</p>
                    </div>

                    <div className="col-span-2 md:col-span-1 lg:col-span-1 bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <FiTrendingUp size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg Order</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{formatCurrency(kpis.avg_order_value)}</p>
                    </div>

                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                    {/* Customer Retention */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col h-[400px]">
                        <h3 className="font-black text-lg text-slate-900 mb-6 flex items-center gap-2 shrink-0">
                            <FiUsers className="text-blue-500" /> Customer Retention (6M)
                        </h3>
                        <div className="flex-1 min-h-0 w-full relative">
                            <Bar data={retentionChart} options={retentionOptions} />
                        </div>
                    </div>

                    {/* Restaurant Growth */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col h-[400px]">
                        <h3 className="font-black text-lg text-slate-900 mb-6 flex items-center gap-2 shrink-0">
                            <FiHome className="text-violet-500" /> Platform Growth
                        </h3>
                        <div className="flex-1 min-h-0 w-full relative">
                            <Line data={growthChart} options={growthOptions} />
                        </div>
                    </div>

                    {/* Revenue Forecast */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col h-[420px]">
                        <div className="flex justify-between items-start mb-6 shrink-0">
                            <div>
                                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                                    <FiTrendingUp className="text-pink-500" /> Revenue Forecast
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Historical vs Predicted</p>
                            </div>
                            <div className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg border border-pink-100 text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-0.5">Next Month Pred.</p>
                                <p className="text-sm font-black">{formatCurrency(data.revenue_forecast.next_month_prediction)}</p>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 w-full relative">
                            <Line data={forecastChart} options={forecastOptions} />
                        </div>
                    </div>

                    {/* Delivery Performance */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-xl border border-slate-700 text-white relative overflow-hidden flex flex-col">
                        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                        <h3 className="font-black text-lg mb-8 flex items-center gap-2 shrink-0 relative z-10">
                            <FiTruck className="text-blue-400" /> Delivery Performance (30d)
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 relative z-10">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-center">
                                <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center mb-3 text-blue-300">
                                    <FiTruck size={18} />
                                </div>
                                <p className="text-3xl font-black mb-1">{formatNumber(delivery.total_deliveries)}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Deliveries</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-center">
                                <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center mb-3 text-amber-300">
                                    <FiClock size={18} />
                                </div>
                                <p className="text-3xl font-black mb-1 flex items-baseline gap-1">
                                    {delivery.avg_delivery_time_min} <span className="text-sm text-slate-400">min</span>
                                </p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Time</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-center">
                                <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center mb-3 text-emerald-300">
                                    <FiCheckCircle size={18} />
                                </div>
                                <p className="text-3xl font-black text-emerald-400 mb-1">{delivery.on_time_percent}%</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On-Time Rate</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
};

export default BusinessAnalytics;