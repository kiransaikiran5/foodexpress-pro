import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiDownloadCloud,
    FiBarChart2,
    FiFilter,
    FiFileText,
    FiGrid,
    FiFile
} from 'react-icons/fi';

const REPORT_TYPES = [
    { value: 'sales', label: 'Sales Report' },
    { value: 'restaurants', label: 'Restaurant Report' },
    { value: 'deliveries', label: 'Delivery Report' },
    { value: 'customers', label: 'Customer Report' },
];

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

const ensureUTC = (dateValue) => {
    if (typeof dateValue !== 'string') return dateValue;
    if (!dateValue.endsWith('Z') && !/([+-]\d{2}:?\d{2})$/.test(dateValue)) {
        return `${dateValue}Z`;
    }
    return dateValue;
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(ensureUTC(dateString)).toLocaleString('en-IN', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const StatusBadge = ({ status }) => {
    const config = {
        PLACED: 'bg-blue-50 text-blue-600 border-blue-200',
        ACCEPTED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        PREPARING: 'bg-amber-50 text-amber-600 border-amber-200',
        READY: 'bg-purple-50 text-purple-600 border-purple-200',
        DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        CANCELLED: 'bg-red-50 text-red-600 border-red-200',
    };

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${config[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {status?.replace('_', ' ')}
        </span>
    );
};


// ---------- Main Component ----------
const Reports = () => {
    const [reportType, setReportType] = useState('sales');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [restaurantId, setRestaurantId] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (restaurantId && reportType === 'sales') params.restaurant_id = restaurantId;

            const res = await api.get(`/admin/reports/${reportType}`, { params });
            setData(res.data);

            if (res.data.length === 0) {
                toast('No data found for the selected filters', { icon: 'ℹ️' });
            } else {
                toast.success('Report generated successfully!');
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const exportReport = async (format) => {
        try {
            const params = { format };
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (restaurantId && reportType === 'sales') params.restaurant_id = restaurantId;

            const response = await api.get(`/admin/reports/export/${reportType}`, {
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${reportType}_report.${format === 'excel' ? 'xlsx' : format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(`Report downloaded as ${format.toUpperCase()}`);
        } catch (err) {
            toast.error('Export failed');
        }
    };

    // Dynamic columns based on report type
    const columns = {
        sales: ['Order #', 'Customer', 'Restaurant', 'Items', 'Total (₹)', 'Status', 'Date'],
        restaurants: ['ID', 'Name', 'Orders', 'Revenue (₹)'],
        deliveries: ['Partner ID', 'Name', 'Completed', 'Avg Rating', 'Reviews'],
        customers: ['Customer ID', 'Name', 'Email', 'Total Orders', 'Total Spent (₹)'],
    };

    const keys = {
        sales: ['order_id', 'customer_name', 'restaurant_name', 'items', 'total', 'status', 'date'],
        restaurants: ['restaurant_id', 'name', 'order_count', 'revenue'],
        deliveries: ['partner_id', 'name', 'completed_deliveries', 'average_rating', 'total_reviews'],
        customers: ['customer_id', 'name', 'email', 'total_orders', 'total_spent'],
    };

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <FiBarChart2 className="text-blue-500" /> Reports & Analytics
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">Generate, view, and export platform data.</p>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                        <FiFilter className="text-slate-400" />
                        <h2 className="font-bold text-slate-800">Filter Data</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Report Type</label>
                            <select
                                value={reportType}
                                onChange={(e) => {
                                    setReportType(e.target.value);
                                    setData([]); // Clear old data when changing type
                                }}
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                            >
                                {REPORT_TYPES.map(rt => (
                                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        {reportType === 'sales' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Restaurant ID</label>
                                <input
                                    type="number"
                                    value={restaurantId}
                                    onChange={(e) => setRestaurantId(e.target.value)}
                                    placeholder="Optional"
                                    className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                                />
                            </div>
                        )}
                        <div className={reportType !== 'sales' ? 'lg:col-span-2' : ''}>
                            <button
                                onClick={fetchReport}
                                disabled={loading}
                                className="h-12 w-full bg-blue-600 text-white px-6 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                                ) : (
                                    'Generate Report'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Report Area */}
                {data.length > 0 ? (
                    <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden animate-in fade-in">

                        {/* Export Toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-center p-6 bg-slate-50/50 border-b border-slate-100 gap-4">
                            <h3 className="font-black text-lg text-slate-900">
                                {REPORT_TYPES.find(r => r.value === reportType)?.label} Results
                                <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">{data.length} records</span>
                            </h3>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    onClick={() => exportReport('csv')}
                                    className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 shadow-sm transition active:scale-95"
                                >
                                    <FiFileText className="text-slate-400" /> CSV
                                </button>
                                <button
                                    onClick={() => exportReport('excel')}
                                    className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 flex items-center gap-2 shadow-sm transition active:scale-95"
                                >
                                    <FiGrid className="text-emerald-500" /> Excel
                                </button>
                                <button
                                    onClick={() => exportReport('pdf')}
                                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center gap-2 shadow-sm transition active:scale-95"
                                >
                                    <FiFile className="text-red-500" /> PDF
                                </button>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr>
                                        {columns[reportType].map((col, idx) => (
                                            <th key={idx} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            {keys[reportType].map(key => (
                                                <td key={key} className="px-6 py-4">
                                                    {/* Smart Formatting based on key */}
                                                    {key === 'status' ? (
                                                        <StatusBadge status={row[key]} />
                                                    ) : key === 'total' || key === 'revenue' || key === 'total_spent' ? (
                                                        <span className="font-black text-slate-900">{formatCurrency(row[key])}</span>
                                                    ) : key === 'date' || key === 'created_at' ? (
                                                        <span className="text-xs font-medium text-slate-500">{formatDate(row[key])}</span>
                                                    ) : key === 'average_rating' ? (
                                                        <span className="font-bold flex items-center gap-1">
                                                            {Number(row[key]).toFixed(1)} <span className="text-amber-400">★</span>
                                                        </span>
                                                    ) : key.includes('id') && typeof row[key] === 'number' ? (
                                                        <span className="font-bold text-slate-900">#{row[key]}</span>
                                                    ) : (
                                                        <span className="font-medium text-slate-700">
                                                            {row[key] !== null && row[key] !== undefined ? String(row[key]) : '-'}
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-center shadow-sm">
                        <div className="h-16 w-16 bg-slate-50 border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-blue-500">
                            <FiDownloadCloud size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">No Report Generated</p>
                        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm">Select your filters above and click "Generate Report" to view analytics data.</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default Reports;