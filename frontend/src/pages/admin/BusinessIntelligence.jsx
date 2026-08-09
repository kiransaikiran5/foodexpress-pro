import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiTrendingUp, FiUsers, FiShoppingCart, FiDollarSign,
    FiClock, FiActivity, FiPieChart, FiBarChart2
} from 'react-icons/fi';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

// ---------- Components ----------
const SummaryCard = ({ icon, label, value, iconBg, iconColor, valueColor }) => (
    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 flex flex-col justify-between group">
        <div className="flex items-center gap-3 mb-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} ${iconColor} group-hover:opacity-80 transition-colors`}>
                {icon}
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <p className={`text-3xl lg:text-4xl font-black ${valueColor || 'text-slate-900'} truncate`} title={value}>
            {value}
        </p>
    </div>
);

// ---------- Main Component ----------
const BusinessIntelligence = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('daily');

    const fetchData = async () => {
        try {
            const res = await api.get('/admin/business-intelligence/data', { params: { period } });
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load BI data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [period]);

    // Common Chart Options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#0f172a',
                padding: 12,
                titleFont: { size: 13, family: 'Inter' },
                bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
                displayColors: false,
            }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9', drawBorder: false }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } },
            x: { grid: { display: false, drawBorder: false }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } }
        }
    };

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading intelligence data...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiPieChart className="text-blue-500" /> Business Intelligence
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Platform-wide analytics and performance metrics.</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex">
                        {['daily', 'weekly', 'monthly'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all capitalize ${period === p
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <SummaryCard
                        icon={<FiDollarSign size={24} />}
                        label="Total Revenue"
                        value={formatCurrency(data.summary.total_revenue)}
                        iconBg="bg-green-50"
                        iconColor="text-green-600"
                        valueColor="text-green-600"
                    />
                    <SummaryCard
                        icon={<FiShoppingCart size={24} />}
                        label="Total Orders"
                        value={data.summary.total_orders.toLocaleString()}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                    />
                    <SummaryCard
                        icon={<FiTrendingUp size={24} />}
                        label="Avg Order Value"
                        value={formatCurrency(data.summary.avg_order_value)}
                        iconBg="bg-indigo-50"
                        iconColor="text-indigo-600"
                    />
                    <SummaryCard
                        icon={<FiUsers size={24} />}
                        label="New Customers"
                        value={data.summary.new_customers.toLocaleString()}
                        iconBg="bg-purple-50"
                        iconColor="text-purple-600"
                    />
                </div>

                {/* Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Revenue & Orders Trend */}
                    <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900">
                            <FiTrendingUp className="text-blue-500" /> Revenue & Orders Trend
                        </h2>
                        <div className="h-[350px] w-full">
                            <Line
                                data={{
                                    labels: data.revenue_data.map(d => d.date || d.week || d.month),
                                    datasets: [
                                        {
                                            label: 'Revenue (₹)',
                                            data: data.revenue_data.map(d => d.revenue),
                                            borderColor: '#3b82f6',
                                            backgroundColor: 'rgba(59,130,246,0.1)',
                                            yAxisID: 'y',
                                            tension: 0.4,
                                            fill: true,
                                            pointBackgroundColor: '#ffffff',
                                            pointBorderColor: '#3b82f6',
                                            pointBorderWidth: 2,
                                            pointRadius: 4,
                                            pointHoverRadius: 6,
                                        },
                                        {
                                            label: 'Orders',
                                            data: data.revenue_data.map(d => d.orders),
                                            borderColor: '#f59e0b',
                                            yAxisID: 'y1',
                                            tension: 0.4,
                                            borderDash: [5, 5],
                                            pointBackgroundColor: '#ffffff',
                                            pointBorderColor: '#f59e0b',
                                            pointBorderWidth: 2,
                                            pointRadius: 4,
                                            pointHoverRadius: 6,
                                        },
                                    ],
                                }}
                                options={{
                                    ...chartOptions,
                                    scales: {
                                        ...chartOptions.scales,
                                        y1: {
                                            type: 'linear',
                                            position: 'right',
                                            grid: { drawOnChartArea: false },
                                            ticks: { color: '#f59e0b', font: { family: 'Inter', size: 11 } }
                                        },
                                    },
                                    plugins: {
                                        ...chartOptions.plugins,
                                        tooltip: {
                                            ...chartOptions.plugins.tooltip,
                                            callbacks: {
                                                label: (context) => {
                                                    let label = context.dataset.label || '';
                                                    if (label) label += ': ';
                                                    if (context.datasetIndex === 0) {
                                                        label += `₹${context.parsed.y.toLocaleString('en-IN')}`;
                                                    } else {
                                                        label += context.parsed.y.toLocaleString('en-IN');
                                                    }
                                                    return label;
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Customer Growth */}
                    <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900">
                            <FiUsers className="text-purple-500" /> Customer Growth
                        </h2>
                        <div className="h-[350px] w-full">
                            <Line
                                data={{
                                    labels: data.customer_growth.map(d => d.date || d.week || d.month),
                                    datasets: [{
                                        label: 'New Customers',
                                        data: data.customer_growth.map(d => d.new_customers),
                                        borderColor: '#8b5cf6',
                                        backgroundColor: 'rgba(139,92,246,0.1)',
                                        tension: 0.4,
                                        fill: true,
                                        pointBackgroundColor: '#ffffff',
                                        pointBorderColor: '#8b5cf6',
                                        pointBorderWidth: 2,
                                        pointRadius: 4,
                                    }],
                                }}
                                options={chartOptions}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Selling Foods */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col items-center">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 w-full">
                            <FiShoppingCart className="text-emerald-500" /> Top Selling Foods
                        </h2>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <Pie
                                data={{
                                    labels: data.top_foods.map(f => f.name),
                                    datasets: [{
                                        data: data.top_foods.map(f => f.quantity),
                                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'],
                                        borderWidth: 0,
                                        hoverOffset: 10
                                    }],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'right', labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 20 } },
                                        tooltip: { backgroundColor: '#0f172a', padding: 12, bodyFont: { font: { family: 'Inter' } } }
                                    },
                                }}
                            />
                        </div>
                    </div>

                    {/* Peak Ordering Hours */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900">
                            <FiClock className="text-orange-500" /> Peak Ordering Hours
                        </h2>
                        <div className="h-[300px] w-full">
                            <Bar
                                data={{
                                    labels: data.peak_hours.map(h => `${h.hour}:00`),
                                    datasets: [{
                                        label: 'Orders',
                                        data: data.peak_hours.map(h => h.orders),
                                        backgroundColor: '#f97316',
                                        borderRadius: 6
                                    }],
                                }}
                                options={{
                                    ...chartOptions,
                                    scales: {
                                        y: { beginAtZero: true, grid: { color: '#f1f5f9', drawBorder: false }, ticks: { stepSize: 1, color: '#64748b' } },
                                        x: { grid: { display: false, drawBorder: false }, ticks: { color: '#64748b' } }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Restaurant Performance */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900">
                            <FiBarChart2 className="text-blue-500" /> Top Restaurants by Revenue
                        </h2>
                        <div className="h-[300px] w-full">
                            <Bar
                                data={{
                                    labels: data.restaurant_performance.map(r => r.name),
                                    datasets: [{
                                        label: 'Revenue',
                                        data: data.restaurant_performance.map(r => r.revenue),
                                        backgroundColor: '#3b82f6',
                                        borderRadius: 6
                                    }],
                                }}
                                options={{
                                    ...chartOptions,
                                    indexAxis: 'y', // Horizontal bar chart
                                    plugins: {
                                        ...chartOptions.plugins,
                                        tooltip: {
                                            ...chartOptions.plugins.tooltip,
                                            callbacks: {
                                                label: (context) => `₹${context.parsed.x.toLocaleString('en-IN')}`
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Delivery & Retention Stats */}
                    <div className="flex flex-col gap-8">
                        {/* Customer Retention */}
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-lg flex-1 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 text-white/5">
                                <FiUsers size={120} />
                            </div>
                            <h2 className="text-lg font-bold flex items-center gap-2 text-white mb-6 relative z-10">
                                <span className="bg-white/20 p-2 rounded-xl text-white"><FiUsers size={18} /></span>
                                Customer Retention
                            </h2>
                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                    <span className="text-indigo-200 font-medium">Distinct Customers</span>
                                    <span className="font-black text-xl text-white">{data.customer_retention.distinct_customers.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                    <span className="text-indigo-200 font-medium">Returning Customers</span>
                                    <span className="font-black text-xl text-white">{data.customer_retention.returning_customers.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-indigo-200 font-medium">Retention Rate</span>
                                    <span className="font-black text-2xl text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg">
                                        {data.customer_retention.retention_rate}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Performance */}
                        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex-1 flex flex-col justify-center">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 mb-6">
                                <div className="bg-red-50 p-2 rounded-xl text-red-500"><FiClock size={18} /></div>
                                Delivery Performance
                            </h2>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Avg Delivery Time</span>
                                    <span className="font-black text-xl text-slate-900">{data.delivery_performance.avg_delivery_time_minutes} <span className="text-sm font-semibold text-slate-400">min</span></span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Completion Rate</span>
                                    <span className="font-black text-xl text-emerald-600">{data.delivery_performance.completion_rate}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default BusinessIntelligence;