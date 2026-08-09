import { useState, useEffect } from 'react';
import { useAuth } from '../../store/authContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiUpload, FiCheckCircle, FiXCircle, FiClock, FiInfo,
    FiMap, FiFileText, FiAlertTriangle, FiEdit2, FiPlus,
    FiTrash2, FiImage, FiStar, FiChevronDown, FiChevronUp,
    FiToggleLeft, FiToggleRight, FiPlusCircle, FiLayers,
    FiGrid, FiShoppingBag, FiDollarSign, FiTrendingUp,
    FiMessageSquare, FiBox, FiTruck, FiRefreshCw, FiX, FiAlertCircle,
    FiCalendar, FiUsers, FiPhone,
} from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement,
    Title, Tooltip, Legend, Filler
);

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

// Safely parses timestamp strings appending 'Z' to naive UTC strings
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

const formatReservationDate = (dateValue) => {
    if (!dateValue) return 'Date unavailable';

    const date = new Date(ensureUTC(dateValue));
    if (Number.isNaN(date.getTime())) return 'Date unavailable';

    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

// ---------- Tabs Definition ----------
const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'profile', label: 'Profile' },
    { key: 'cuisines', label: 'Cuisines' },
    { key: 'images', label: 'Gallery' },
    { key: 'menu', label: 'Menu' },
    { key: 'combos', label: 'Combo Meals' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'branches', label: 'Branches' },
    { key: 'reservations', label: 'Reservations' },
    { key: 'predictions', label: 'Predictions' },
    { key: 'smartInventory', label: 'Smart Inventory' },
    { key: 'staff', label: 'Staff' },
];

// ---------- Status Badge ----------
const StatusBadge = ({ status }) => {
    const config = {
        PENDING: { style: 'bg-amber-50 text-amber-600 border-amber-200', icon: FiClock },
        APPROVED: { style: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: FiCheckCircle },
        REJECTED: { style: 'bg-red-50 text-red-600 border-red-200', icon: FiXCircle },
        SUSPENDED: { style: 'bg-slate-50 text-slate-600 border-slate-200', icon: FiAlertTriangle },
    };

    const StatusIcon = config[status]?.icon || FiInfo;
    const styleStr = config[status]?.style || 'bg-slate-50 text-slate-600 border-slate-200';

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${styleStr}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status?.replace('_', ' ')}
        </span>
    );
};


const DashboardMetricCard = ({ title, value, subtitle, icon, iconClass }) => (
    <article className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}>{icon}</div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{title}</p>
        <p className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900" title={String(value)}>{value}</p>
        <p className="mt-2 text-xs font-medium text-slate-500">{subtitle}</p>
    </article>
);

const DashboardChartCard = ({ title, subtitle, children }) => (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-7">
        <div className="mb-6">
            <h4 className="text-lg font-black text-slate-900">{title}</h4>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="h-[320px] w-full">{children}</div>
    </section>
);

const ChartEmptyState = ({ message }) => (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
        <FiTrendingUp className="h-9 w-9 text-slate-300" />
        <p className="mt-3 text-sm font-semibold text-slate-500">{message}</p>
    </div>
);

const DashboardEmptyState = ({ icon, message }) => (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-400">
        {icon}
        <p className="mt-3 text-sm font-semibold">{message}</p>
    </div>
);

const DashboardLoadingState = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[1, 2, 3].map(item => <div key={item} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
        <div className="h-[410px] animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="h-[410px] animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-[410px] animate-pulse rounded-3xl bg-slate-100" />
        </div>
    </div>
);

const OrderStatusBadge = ({ status }) => {
    const normalized = String(status || 'PENDING').toUpperCase();
    const styles = normalized === 'DELIVERED'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
        : normalized === 'CANCELLED'
            ? 'border-red-100 bg-red-50 text-red-700'
            : normalized === 'PENDING'
                ? 'border-amber-100 bg-amber-50 text-amber-700'
                : 'border-blue-100 bg-blue-50 text-blue-700';

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${styles}`}>
            {normalized.replaceAll('_', ' ')}
        </span>
    );
};

const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: {
            position: 'top',
            align: 'end',
            labels: { usePointStyle: true, boxWidth: 8, color: '#475569', font: { size: 11, weight: '600' } },
        },
        tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 10,
            titleFont: { size: 12, weight: '700' },
            bodyFont: { size: 12 },
        },
    },
};

const createDualAxisChartOptions = () => ({
    ...baseChartOptions,
    scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
            beginAtZero: true,
            position: 'left',
            grid: { color: '#f1f5f9' },
            ticks: { color: '#64748b', callback: value => `₹${Number(value).toLocaleString('en-IN')}` },
            title: { display: true, text: 'Revenue', color: '#64748b' },
        },
        y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#64748b', precision: 0 },
            title: { display: true, text: 'Orders', color: '#64748b' },
        },
    },
});

const createRevenueChartOptions = () => ({
    ...baseChartOptions,
    scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { color: '#64748b', callback: value => `₹${Number(value).toLocaleString('en-IN')}` },
        },
    },
});

const createCustomerChartOptions = () => ({
    ...baseChartOptions,
    scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { color: '#64748b', precision: 0 },
        },
    },
});


const PredictionEmptyState = ({ icon, title, message }) => (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 text-center">
        <span className="text-slate-300">{icon}</span>
        <p className="mt-4 font-black text-slate-800">{title}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{message}</p>
    </div>
);

const SeasonalTrendBadge = ({ direction, growthRate }) => {
    const normalizedDirection = String(direction || 'stable').toLowerCase();
    const numericGrowth = Number(growthRate || 0);

    const style = normalizedDirection === 'up' || numericGrowth > 0
        ? 'border-emerald-400/20 bg-emerald-500 text-white'
        : normalizedDirection === 'down' || numericGrowth < 0
            ? 'border-red-400/20 bg-red-500 text-white'
            : 'border-slate-400/20 bg-slate-600 text-white';

    return (
        <span className={`inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-black ${style}`}>
            {numericGrowth > 0 ? '+' : ''}{numericGrowth.toFixed(1)}%
        </span>
    );
};

const formatHourRange = (hourValue) => {
    const startHour = Number.isFinite(Number(hourValue))
        ? Math.min(23, Math.max(0, Number(hourValue)))
        : 0;

    const endHour = (startHour + 1) % 24;

    const formatHour = hour => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);

        return date.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return `${formatHour(startHour)} – ${formatHour(endHour)}`;
};

const formatPredictionDate = dateValue => {
    if (!dateValue) return 'Date unavailable';

    const date = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
};

const formatQuantity = value => {
    const number = Number(value);

    if (!Number.isFinite(number)) return '0';

    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
    }).format(number);
};

const SmartMetricCard = ({ title, value, helper, icon, iconClass }) => (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}>{icon}</div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{title}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </article>
);

const SmartTableCard = ({ title, subtitle, children }) => (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h4 className="text-lg font-black text-slate-900">{title}</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div>{children}</div>
    </section>
);

const SmartEmptyState = ({ icon, message }) => (
    <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center text-emerald-500">
        {icon}
        <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-500">{message}</p>
    </div>
);

// ---------- Main Component ----------
const MyRestaurant = () => {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ----- Profile / Cuisines / Images state -----
    const [form, setForm] = useState({
        name: '', description: '', opening_time: '', closing_time: '',
        delivery_radius_km: 5, gst_number: '', gst_doc: null, license_doc: null,
    });
    const [cuisineInput, setCuisineInput] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isPrimary, setIsPrimary] = useState(false);

    // ----- Menu state -----
    const [menus, setMenus] = useState([]);
    const [selectedMenuId, setSelectedMenuId] = useState(null);
    const [menuForm, setMenuForm] = useState({ name: '', is_active: true });
    const [editingMenuId, setEditingMenuId] = useState(null);

    const [categoryForm, setCategoryForm] = useState({ name: '' });
    const [editingCategoryId, setEditingCategoryId] = useState(null);

    const [itemForm, setItemForm] = useState({
        name: '', description: '', price: '', is_veg: true, is_available: true,
    });
    const [editingItemId, setEditingItemId] = useState(null);
    const [selectedCategoryForItem, setSelectedCategoryForItem] = useState(null);

    const [expandedAddonItemId, setExpandedAddonItemId] = useState(null);
    const [addons, setAddons] = useState([]);
    const [addonForm, setAddonForm] = useState({ name: '', price: '' });
    const [editingAddonId, setEditingAddonId] = useState(null);

    // ----- Combo state -----
    const [combos, setCombos] = useState([]);
    const [comboForm, setComboForm] = useState({
        name: '', description: '', combo_price: '', is_available: true,
        items: [{ food_item_id: '', quantity: 1 }]
    });
    const [editingComboId, setEditingComboId] = useState(null);
    const [allFoodItems, setAllFoodItems] = useState([]);

    // ----- Dashboard state -----
    const [dashboardData, setDashboardData] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [dashboardRefreshing, setDashboardRefreshing] = useState(false);

    // ----- Demand prediction state -----
    const [predictionData, setPredictionData] = useState(null);
    const [predictionsLoading, setPredictionsLoading] = useState(false);
    const [predictionsRefreshing, setPredictionsRefreshing] = useState(false);
    const [predictionsError, setPredictionsError] = useState('');

    // ----- Smart Inventory state -----
    // `ingredients` is shared with the normal Inventory tab below, so do not declare it twice.
    const [foodItems, setFoodItems] = useState([]);
    const [inventoryData, setInventoryData] = useState(null);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [expiryAlerts, setExpiryAlerts] = useState([]);
    const [purchaseSuggestions, setPurchaseSuggestions] = useState([]);
    const [selectedFoodId, setSelectedFoodId] = useState('');
    const [recipeList, setRecipeList] = useState([]);
    const [newRecipeIngredientId, setNewRecipeIngredientId] = useState('');
    const [newRecipeQty, setNewRecipeQty] = useState('');
    const [calcItems, setCalcItems] = useState([{ food_item_id: '', quantity: 1 }]);
    const [calcResult, setCalcResult] = useState(null);
    const [smartInventoryLoading, setSmartInventoryLoading] = useState(false);
    const [smartInventoryRefreshing, setSmartInventoryRefreshing] = useState(false);
    const [smartInventoryError, setSmartInventoryError] = useState('');
    const [recipeLoading, setRecipeLoading] = useState(false);
    const [recipeSubmitting, setRecipeSubmitting] = useState(false);
    const [calculatorLoading, setCalculatorLoading] = useState(false);

    // ----- Inventory state -----
    const [suppliers, setSuppliers] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [supplierForm, setSupplierForm] = useState({
        name: '', contact_person: '', phone: '', email: '', address: ''
    });
    const [editingSupplierId, setEditingSupplierId] = useState(null);
    const [ingredientForm, setIngredientForm] = useState({
        name: '', unit: 'kg', reorder_level: 10, current_stock: 0, supplier_id: ''
    });
    const [editingIngredientId, setEditingIngredientId] = useState(null);
    const [transactionIngredient, setTransactionIngredient] = useState(null);
    const [transactionForm, setTransactionForm] = useState({
        quantity_change: 0, transaction_type: 'restock', notes: ''
    });


    // ----- Inventory report state -----
    const [reportData, setReportData] = useState([]);
    const [showReport, setShowReport] = useState(false);
    const [reportStart, setReportStart] = useState('');
    const [reportEnd, setReportEnd] = useState('');
    const [reportLoading, setReportLoading] = useState(false);

    // ----- Branch management state -----
    const emptyBranchForm = {
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        manager_id: '',
        is_active: true,
    };

    const [branches, setBranches] = useState([]);
    const [branchForm, setBranchForm] = useState(emptyBranchForm);
    const [editingBranchId, setEditingBranchId] = useState(null);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [branchSubmitting, setBranchSubmitting] = useState(false);
    const [deletingBranchId, setDeletingBranchId] = useState(null);
    const [managerUsers, setManagerUsers] = useState([]);
    const [managerUsersLoading, setManagerUsersLoading] = useState(false);

    // ----- Staff management state -----
    const [staffList, setStaffList] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [staffForm, setStaffForm] = useState({
        name: '', email: '', phone: '', role: '', hire_date: ''
    });
    const [shiftForm, setShiftForm] = useState({
        staff_id: '', date: '', start_time: '', end_time: ''
    });
    const [shifts, setShifts] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [perfForm, setPerfForm] = useState({
        staff_id: '', date: '', rating: 3, notes: ''
    });
    const [perfReviews, setPerfReviews] = useState([]);
    const [perfSummary, setPerfSummary] = useState(null);
    const [staffLoading, setStaffLoading] = useState(false);
    const [staffSubmitting, setStaffSubmitting] = useState(false);
    const [deletingStaffId, setDeletingStaffId] = useState(null);
    const [shiftSubmitting, setShiftSubmitting] = useState(false);
    const [attendanceAction, setAttendanceAction] = useState('');
    const [performanceSubmitting, setPerformanceSubmitting] = useState(false);
    const [staffDetailsLoading, setStaffDetailsLoading] = useState(false);

    // ----- Reservation management state -----
    const [reservations, setReservations] = useState([]);
    const [reservationsLoading, setReservationsLoading] = useState(false);
    const [reservationActionId, setReservationActionId] = useState(null);
    const [reservationFilter, setReservationFilter] = useState('ALL');

    const [isEditMode, setIsEditMode] = useState(false);

    // ---------- Fetchers ----------
    const fetchRestaurant = async () => {
        try {
            const res = await api.get('/restaurants/my');
            setRestaurant(res.data);
            if (res.data && res.data.status === 'APPROVED') {
                setForm({
                    name: res.data.name || '',
                    description: res.data.description || '',
                    opening_time: res.data.opening_time || '',
                    closing_time: res.data.closing_time || '',
                    delivery_radius_km: res.data.delivery_radius_km || 5,
                    gst_number: res.data.gst_number || '',
                    gst_doc: null,
                    license_doc: null,
                });
            }
        } catch (err) {
            if (err.response?.status !== 404) toast.error('Failed to load restaurant');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRestaurant(); }, []);

    useEffect(() => {
        if (restaurant?.status === 'APPROVED') {
            if (activeTab === 'menu') fetchMenus();
            if (activeTab === 'combos') { fetchAllFoodItems(); fetchCombos(); }
            if (activeTab === 'dashboard') {
                fetchDashboard();
                fetchPerformance();
            }
            if (activeTab === 'inventory') { fetchSuppliers(); fetchIngredients(); }
            if (activeTab === 'branches') {
                fetchBranches();
                fetchManagerUsers();
            }
            if (activeTab === 'reservations') fetchReservations();
            if (activeTab === 'predictions') fetchPredictions();
            if (activeTab === 'smartInventory') {
                fetchSmartInventory();
            }
            if (activeTab === 'staff') fetchStaffList();
        }
    }, [activeTab, restaurant]);

    const fetchMenus = async () => {
        try {
            const res = await api.get('/restaurants/my/menus');
            setMenus(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load menus'); }
    };

    const fetchAllFoodItems = async () => {
        try {
            const res = await api.get('/restaurants/my/menus/food-items');
            setAllFoodItems(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load food items'); }
    };

    const fetchCombos = async () => {
        try {
            const res = await api.get('/restaurants/my/combos');
            setCombos(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load combos'); }
    };

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/owner/dashboard/summary');
            setDashboardData(res.data);
        } catch { toast.error('Failed to load dashboard'); }
    };

    const fetchPerformance = async ({ silent = false } = {}) => {
        if (!silent) setDashboardRefreshing(true);
        try {
            const res = await api.get('/owner/dashboard/performance');
            const data = res.data || {};

            setPerformanceData({
                daily_sales: Array.isArray(data.daily_sales) ? data.daily_sales : [],
                weekly_sales: Array.isArray(data.weekly_sales) ? data.weekly_sales : [],
                monthly_sales: Array.isArray(data.monthly_sales) ? data.monthly_sales : [],
                customer_growth: Array.isArray(data.customer_growth) ? data.customer_growth : [],
                popular_dishes: Array.isArray(data.popular_dishes) ? data.popular_dishes : [],
            });
        } catch (err) {
            setPerformanceData({
                daily_sales: [],
                weekly_sales: [],
                monthly_sales: [],
                customer_growth: [],
                popular_dishes: [],
            });
            toast.error(err.response?.data?.detail || 'Failed to load performance data');
        } finally {
            if (!silent) setDashboardRefreshing(false);
        }
    };

    const refreshDashboard = async () => {
        setDashboardRefreshing(true);
        try {
            await Promise.all([fetchDashboard(), fetchPerformance({ silent: true })]);
            toast.success('Dashboard refreshed');
        } finally {
            setDashboardRefreshing(false);
        }
    };

    const fetchPredictions = async ({ silent = false } = {}) => {
        if (silent) {
            setPredictionsRefreshing(true);
        } else {
            setPredictionsLoading(true);
        }

        try {
            const res = await api.get('/predictions/demand');
            const data = res.data || {};

            setPredictionData({
                peak_hours: Array.isArray(data.peak_hours) ? data.peak_hours : [],
                demand_forecast: Array.isArray(data.demand_forecast) ? data.demand_forecast : [],
                inventory_suggestions: Array.isArray(data.inventory_suggestions) ? data.inventory_suggestions : [],
                popular_food_forecast: Array.isArray(data.popular_food_forecast) ? data.popular_food_forecast : [],
                seasonal_trends: data.seasonal_trends && typeof data.seasonal_trends === 'object'
                    ? data.seasonal_trends
                    : {
                        current_month: '',
                        current_orders: 0,
                        previous_orders: 0,
                        trend_direction: 'stable',
                        growth_rate: 0,
                    },
                generated_at: data.generated_at || null,
            });

            setPredictionsError('');
            return data;
        } catch (err) {
            const message = err.response?.data?.detail || 'Failed to load predictions';
            setPredictionData(null);
            setPredictionsError(message);

            if (!silent) {
                toast.error(message);
            }

            return null;
        } finally {
            setPredictionsLoading(false);
            setPredictionsRefreshing(false);
        }
    };

    // ---------- Smart Inventory Fetchers / Handlers ----------
    const normalizeArrayResponse = (data, keys = []) => {
        if (Array.isArray(data)) return data;
        for (const key of keys) {
            if (Array.isArray(data?.[key])) return data[key];
        }
        return [];
    };

    const fetchSmartFoodItems = async () => {
        try {
            // This endpoint is already used by the Combo Meals section and returns
            // the current restaurant's food items.
            const res = await api.get('/restaurants/my/menus/food-items');
            const items = normalizeArrayResponse(res.data, ['items', 'food_items']);
            setFoodItems(items);
            return items;
        } catch (err) {
            setFoodItems([]);
            toast.error(err.response?.data?.detail || 'Failed to load food items');
            return [];
        }
    };

    const fetchInventoryData = async ({ silent = false } = {}) => {
        if (!silent) setSmartInventoryLoading(true);
        try {
            const res = await api.get('/inventory/dashboard');
            const data = res.data || {};

            setInventoryData(data);
            setLowStockItems(Array.isArray(data.low_stock_items) ? data.low_stock_items : []);
            setExpiryAlerts(Array.isArray(data.expiring_items) ? data.expiring_items : []);
            setSmartInventoryError('');
            return data;
        } catch (err) {
            const message = err.response?.data?.detail || 'Failed to load smart inventory dashboard';
            setInventoryData(null);
            setLowStockItems([]);
            setExpiryAlerts([]);
            setSmartInventoryError(message);
            if (!silent) toast.error(message);
            return null;
        } finally {
            if (!silent) setSmartInventoryLoading(false);
        }
    };

    const fetchPurchaseSuggestions = async () => {
        try {
            const res = await api.get('/inventory/purchase-suggestions');
            setPurchaseSuggestions(
                normalizeArrayResponse(res.data, ['items', 'suggestions', 'purchase_suggestions'])
            );
        } catch (err) {
            setPurchaseSuggestions([]);
            toast.error(err.response?.data?.detail || 'Failed to load purchase suggestions');
        }
    };

    const fetchSmartInventory = async ({ silent = false } = {}) => {
        if (silent) setSmartInventoryRefreshing(true);
        else setSmartInventoryLoading(true);

        try {
            await Promise.all([
                fetchInventoryData({ silent: true }),
                fetchPurchaseSuggestions(),
                fetchSmartFoodItems(),
                fetchIngredients(),
            ]);
        } finally {
            setSmartInventoryLoading(false);
            setSmartInventoryRefreshing(false);
        }
    };

    const fetchRecipes = async (foodId) => {
        if (!foodId) {
            setRecipeList([]);
            return [];
        }

        setRecipeLoading(true);
        try {
            const res = await api.get(`/inventory/recipes/${foodId}`);
            const recipes = normalizeArrayResponse(res.data, ['items', 'recipes']);
            setRecipeList(recipes);
            return recipes;
        } catch (err) {
            setRecipeList([]);
            toast.error(err.response?.data?.detail || 'Failed to load recipe');
            return [];
        } finally {
            setRecipeLoading(false);
        }
    };

    const handleFoodSelection = async (foodId) => {
        setSelectedFoodId(foodId);
        setNewRecipeIngredientId('');
        setNewRecipeQty('');
        setRecipeList([]);
        if (foodId) await fetchRecipes(foodId);
    };

    const handleAddRecipe = async () => {
        if (!selectedFoodId) {
            toast.error('Select a food item first');
            return;
        }

        const ingredientId = Number.parseInt(newRecipeIngredientId, 10);
        const quantityRequired = Number.parseFloat(newRecipeQty);

        if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
            toast.error('Select an ingredient');
            return;
        }

        if (!Number.isFinite(quantityRequired) || quantityRequired <= 0) {
            toast.error('Enter a valid quantity greater than 0');
            return;
        }

        setRecipeSubmitting(true);
        try {
            await api.post('/inventory/recipes', {
                food_item_id: Number.parseInt(selectedFoodId, 10),
                ingredient_id: ingredientId,
                quantity_required: quantityRequired,
            });

            toast.success('Recipe ingredient added');
            setNewRecipeIngredientId('');
            setNewRecipeQty('');
            await fetchRecipes(selectedFoodId);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add recipe ingredient');
        } finally {
            setRecipeSubmitting(false);
        }
    };

    const handleDeleteRecipe = async (recipeId) => {
        if (!recipeId) return;
        if (!window.confirm('Remove this ingredient from the recipe?')) return;

        try {
            await api.delete(`/inventory/recipes/${recipeId}`);
            toast.success('Recipe ingredient removed');
            await fetchRecipes(selectedFoodId);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to remove recipe ingredient');
        }
    };

    const updateCalculatorItem = (index, field, value) => {
        setCalcItems(current => current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, [field]: value } : item
        ));
        setCalcResult(null);
    };

    const addCalculatorItem = () => {
        setCalcItems(current => [...current, { food_item_id: '', quantity: 1 }]);
        setCalcResult(null);
    };

    const removeCalculatorItem = (index) => {
        setCalcItems(current => {
            if (current.length === 1) return [{ food_item_id: '', quantity: 1 }];
            return current.filter((_, itemIndex) => itemIndex !== index);
        });
        setCalcResult(null);
    };

    const handleCalculate = async () => {
        const items = calcItems
            .filter(item => item.food_item_id)
            .map(item => ({
                food_item_id: Number.parseInt(item.food_item_id, 10),
                quantity: Number.parseInt(item.quantity, 10),
            }));

        if (!items.length) {
            toast.error('Add at least one food item');
            return;
        }

        if (items.some(item => !Number.isInteger(item.food_item_id) || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
            toast.error('Select valid food items and quantities');
            return;
        }

        setCalculatorLoading(true);
        try {
            const res = await api.post('/inventory/calculate-ingredients', items);
            setCalcResult(
                normalizeArrayResponse(res.data, ['items', 'ingredients', 'requirements'])
            );
        } catch (err) {
            setCalcResult(null);
            toast.error(err.response?.data?.detail || 'Failed to calculate ingredient requirements');
        } finally {
            setCalculatorLoading(false);
        }
    };

    // ---------- Staff Fetchers / Handlers ----------
    const normalizeStaffArray = (data, keys = []) => {
        if (Array.isArray(data)) return data;
        for (const key of keys) {
            if (Array.isArray(data?.[key])) return data[key];
        }
        return [];
    };

    const fetchStaffList = async ({ silent = false } = {}) => {
        if (!silent) setStaffLoading(true);
        try {
            const res = await api.get('/staff/list');
            const list = normalizeStaffArray(res.data, ['items', 'staff', 'staff_list', 'employees']);
            setStaffList(list);

            if (selectedStaff) {
                const refreshed = list.find(item => String(item.id) === String(selectedStaff.id));
                if (refreshed) setSelectedStaff(refreshed);
            }
            return list;
        } catch (err) {
            setStaffList([]);
            if (!silent) toast.error(err.response?.data?.detail || 'Failed to load staff members');
            return [];
        } finally {
            if (!silent) setStaffLoading(false);
        }
    };

    const fetchShifts = async (staffId) => {
        if (!staffId) {
            setShifts([]);
            return [];
        }
        try {
            const res = await api.get(`/staff/shifts/${staffId}`);
            const list = normalizeStaffArray(res.data, ['items', 'shifts']);
            setShifts(list);
            return list;
        } catch (err) {
            setShifts([]);
            toast.error(err.response?.data?.detail || 'Failed to load shifts');
            return [];
        }
    };

    const fetchAttendance = async (staffId) => {
        if (!staffId) {
            setAttendance([]);
            return [];
        }
        try {
            const res = await api.get(`/staff/attendance/${staffId}`);
            const list = normalizeStaffArray(res.data, ['items', 'attendance', 'records']);
            setAttendance(list);
            return list;
        } catch (err) {
            setAttendance([]);
            toast.error(err.response?.data?.detail || 'Failed to load attendance');
            return [];
        }
    };

    const fetchStaffPerformance = async (staffId) => {
        if (!staffId) {
            setPerfReviews([]);
            setPerfSummary(null);
            return;
        }

        try {
            const [reviewsResult, summaryResult] = await Promise.allSettled([
                api.get(`/staff/performance/${staffId}`),
                api.get(`/staff/performance-summary/${staffId}`),
            ]);

            if (reviewsResult.status === 'fulfilled') {
                setPerfReviews(
                    normalizeStaffArray(reviewsResult.value.data, ['items', 'reviews', 'performance'])
                );
            } else {
                setPerfReviews([]);
            }

            if (summaryResult.status === 'fulfilled') {
                setPerfSummary(summaryResult.value.data || null);
            } else {
                setPerfSummary(null);
            }
        } catch (err) {
            setPerfReviews([]);
            setPerfSummary(null);
        }
    };

    const handleSelectStaff = async (staff) => {
        if (!staff?.id) return;

        setSelectedStaff(staff);
        setShiftForm({ staff_id: String(staff.id), date: '', start_time: '', end_time: '' });
        setPerfForm({ staff_id: String(staff.id), date: '', rating: 3, notes: '' });
        setStaffDetailsLoading(true);

        try {
            await Promise.all([
                fetchShifts(staff.id),
                fetchAttendance(staff.id),
                fetchStaffPerformance(staff.id),
            ]);
        } finally {
            setStaffDetailsLoading(false);
        }
    };

    const handleAddStaff = async (e) => {
        e?.preventDefault?.();

        const payload = {
            name: staffForm.name.trim(),
            email: staffForm.email.trim(),
            phone: staffForm.phone.trim() || null,
            role: staffForm.role.trim(),
            hire_date: staffForm.hire_date || null,
        };

        if (!payload.name || !payload.email || !payload.role) {
            toast.error('Name, email and role are required');
            return;
        }

        setStaffSubmitting(true);
        try {
            await api.post('/staff/create', payload);
            toast.success('Staff member added successfully');
            setStaffForm({ name: '', email: '', phone: '', role: '', hire_date: '' });
            await fetchStaffList({ silent: true });
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add staff member');
        } finally {
            setStaffSubmitting(false);
        }
    };

    const handleDeleteStaff = async (staff) => {
        const staffId = typeof staff === 'object' ? staff?.id : staff;
        const staffName = typeof staff === 'object' ? staff?.name : 'this staff member';
        if (!staffId) return;

        if (!window.confirm(`Delete ${staffName}? This action cannot be undone.`)) return;

        setDeletingStaffId(staffId);
        try {
            await api.delete(`/staff/${staffId}`);
            toast.success('Staff member deleted');

            if (String(selectedStaff?.id) === String(staffId)) {
                setSelectedStaff(null);
                setShifts([]);
                setAttendance([]);
                setPerfReviews([]);
                setPerfSummary(null);
            }

            await fetchStaffList({ silent: true });
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete staff member');
        } finally {
            setDeletingStaffId(null);
        }
    };

    const handleAddShift = async (e) => {
        e?.preventDefault?.();
        const staffId = Number.parseInt(shiftForm.staff_id || selectedStaff?.id, 10);

        if (!Number.isInteger(staffId) || staffId <= 0) {
            toast.error('Select a staff member first');
            return;
        }
        if (!shiftForm.date || !shiftForm.start_time || !shiftForm.end_time) {
            toast.error('Date, start time and end time are required');
            return;
        }
        if (shiftForm.end_time <= shiftForm.start_time) {
            toast.error('End time must be later than start time');
            return;
        }

        setShiftSubmitting(true);
        try {
            await api.post('/staff/shifts', {
                staff_id: staffId,
                date: shiftForm.date,
                start_time: shiftForm.start_time,
                end_time: shiftForm.end_time,
            });
            toast.success('Shift created successfully');
            setShiftForm({ staff_id: String(staffId), date: '', start_time: '', end_time: '' });
            await fetchShifts(staffId);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create shift');
        } finally {
            setShiftSubmitting(false);
        }
    };

    const handleMarkAttendance = async (staffId, status) => {
        if (!staffId || attendanceAction) return;

        setAttendanceAction(status);
        try {
            await api.post('/staff/attendance', null, {
                params: { staff_id: staffId, status }
            });
            toast.success(`Attendance marked as ${String(status).toLowerCase()}`);
            await Promise.all([
                fetchAttendance(staffId),
                fetchStaffPerformance(staffId),
            ]);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to mark attendance');
        } finally {
            setAttendanceAction('');
        }
    };

    const handleAddPerformance = async (e) => {
        e?.preventDefault?.();

        const staffId = Number.parseInt(perfForm.staff_id || selectedStaff?.id, 10);
        const rating = Number(perfForm.rating);

        if (!Number.isInteger(staffId) || staffId <= 0) {
            toast.error('Select a staff member first');
            return;
        }
        if (!perfForm.date) {
            toast.error('Select a review date');
            return;
        }
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            toast.error('Rating must be between 1 and 5');
            return;
        }

        setPerformanceSubmitting(true);
        try {
            await api.post('/staff/performance', {
                staff_id: staffId,
                date: perfForm.date,
                rating,
                notes: perfForm.notes.trim() || null,
            });
            toast.success('Performance review added');
            setPerfForm({ staff_id: String(staffId), date: '', rating: 3, notes: '' });
            await fetchStaffPerformance(staffId);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add performance review');
        } finally {
            setPerformanceSubmitting(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/inventory/suppliers');
            setSuppliers(res.data);
        } catch { toast.error('Failed to load suppliers'); }
    };

    const fetchIngredients = async () => {
        try {
            const res = await api.get('/inventory/ingredients');
            setIngredients(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load ingredients'); }
    };

    const fetchBranches = async () => {
        setBranchesLoading(true);
        try {
            const res = await api.get('/branches');
            const data = res.data;
            const branchList = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.branches)
                        ? data.branches
                        : [];

            setBranches(branchList);
        } catch (err) {
            setBranches([]);
            toast.error(err.response?.data?.detail || 'Failed to load branches');
        } finally {
            setBranchesLoading(false);
        }
    };

    const fetchManagerUsers = async () => {
        setManagerUsersLoading(true);
        try {
            const res = await api.get('/branches/managers');
            const data = res.data;
            const users = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.users)
                        ? data.users
                        : Array.isArray(data?.managers)
                            ? data.managers
                            : [];

            setManagerUsers(users);
        } catch (err) {
            setManagerUsers([]);
            toast.error(err.response?.data?.detail || 'Failed to load branch managers');
        } finally {
            setManagerUsersLoading(false);
        }
    };

    const fetchReservations = async () => {
        setReservationsLoading(true);
        try {
            const res = await api.get('/restaurant/reservations');
            const data = res.data;
            const reservationList = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.reservations)
                        ? data.reservations
                        : [];

            setReservations(
                [...reservationList].sort((first, second) => {
                    const firstDate = new Date(first.reservation_date || first.created_at || 0).getTime();
                    const secondDate = new Date(second.reservation_date || second.created_at || 0).getTime();
                    return firstDate - secondDate;
                })
            );
        } catch (err) {
            setReservations([]);
            toast.error(err.response?.data?.detail || 'Failed to load reservations');
        } finally {
            setReservationsLoading(false);
        }
    };

    const updateReservationStatus = async (reservationId, action) => {
        if (!reservationId || reservationActionId) return;

        setReservationActionId(reservationId);
        try {
            await api.put(`/restaurant/reservations/${reservationId}/${action}`);
            toast.success(action === 'confirm' ? 'Reservation confirmed' : 'Reservation cancelled');
            await fetchReservations();
        } catch (err) {
            toast.error(
                err.response?.data?.detail ||
                (action === 'confirm' ? 'Failed to confirm reservation' : 'Failed to cancel reservation')
            );
        } finally {
            setReservationActionId(null);
        }
    };

    const resetBranchForm = () => {
        setBranchForm(emptyBranchForm);
        setEditingBranchId(null);
    };

    const handleBranchSubmit = async (e) => {
        e.preventDefault();

        if (!branchForm.name.trim()) {
            toast.error('Branch name is required');
            return;
        }

        const payload = {
            name: branchForm.name.trim(),
            address_line1: branchForm.address_line1.trim() || null,
            address_line2: branchForm.address_line2.trim() || null,
            city: branchForm.city.trim() || null,
            state: branchForm.state.trim() || null,
            pincode: branchForm.pincode.trim() || null,
            phone: branchForm.phone.trim() || null,
            manager_id: branchForm.manager_id === ''
                ? null
                : Number.parseInt(branchForm.manager_id, 10),
            is_active: Boolean(branchForm.is_active),
        };

        if (
            payload.manager_id !== null &&
            (!Number.isInteger(payload.manager_id) || payload.manager_id <= 0)
        ) {
            toast.error('Please select a valid manager');
            return;
        }

        setBranchSubmitting(true);
        try {
            if (editingBranchId) {
                await api.put(`/branches/${editingBranchId}`, payload);
                toast.success('Branch updated successfully');
            } else {
                await api.post('/branches', payload);
                toast.success('Branch created successfully');
            }

            resetBranchForm();
            await fetchBranches();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save branch');
        } finally {
            setBranchSubmitting(false);
        }
    };

    const handleEditBranch = (branch) => {
        setEditingBranchId(branch.id);
        setBranchForm({
            name: branch.name || '',
            address_line1: branch.address_line1 || '',
            address_line2: branch.address_line2 || '',
            city: branch.city || '',
            state: branch.state || '',
            pincode: branch.pincode || '',
            phone: branch.phone || '',
            manager_id: branch.manager_id ? String(branch.manager_id) : '',
            is_active: branch.is_active !== false,
        });

        window.setTimeout(() => {
            document.getElementById('branch-form')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    };

    const handleDeleteBranch = async (branch) => {
        const confirmed = window.confirm(
            `Delete "${branch.name}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        setDeletingBranchId(branch.id);
        try {
            await api.delete(`/branches/${branch.id}`);
            toast.success('Branch deleted successfully');

            if (editingBranchId === branch.id) {
                resetBranchForm();
            }

            await fetchBranches();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete branch');
        } finally {
            setDeletingBranchId(null);
        }
    };


    const fetchReport = async ({ openModal = true } = {}) => {
        if (reportStart && reportEnd && reportStart > reportEnd) {
            toast.error('Start date cannot be after end date');
            return;
        }

        setReportLoading(true);
        try {
            const params = {};
            if (reportStart) params.start_date = reportStart;
            if (reportEnd) params.end_date = reportEnd;

            const res = await api.get('/inventory/reports/transactions', { params });
            const data = res.data;
            const transactions = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.transactions)
                        ? data.transactions
                        : [];

            setReportData(transactions);
            if (openModal) setShowReport(true);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to load inventory report');
        } finally {
            setReportLoading(false);
        }
    };

    const clearReportFilters = async () => {
        setReportStart('');
        setReportEnd('');
        setReportLoading(true);
        try {
            const res = await api.get('/inventory/reports/transactions');
            const data = res.data;
            setReportData(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.items)
                        ? data.items
                        : Array.isArray(data?.transactions)
                            ? data.transactions
                            : []
            );
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to load inventory report');
        } finally {
            setReportLoading(false);
        }
    };

    // ---------- Profile Handlers ----------
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const data = new FormData();
        data.append('name', form.name);
        data.append('description', form.description);
        data.append('opening_time', form.opening_time);
        data.append('closing_time', form.closing_time);
        data.append('delivery_radius_km', form.delivery_radius_km);
        if (form.gst_number) data.append('gst_number', form.gst_number);
        if (form.gst_doc) data.append('gst_doc', form.gst_doc);
        if (form.license_doc) data.append('license_doc', form.license_doc);

        try {
            const res = await api.put('/restaurants/my', data);
            setRestaurant(res.data);
            toast.success('Profile updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Update failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ---------- Cuisine Handlers ----------
    const handleAddCuisine = async () => {
        if (!cuisineInput.trim()) return;
        try {
            await api.post('/restaurants/my/cuisines', { name: cuisineInput.trim() });
            fetchRestaurant();
            setCuisineInput('');
            toast.success('Cuisine added');
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to add cuisine'); }
    };

    const handleRemoveCuisine = async (cuisineId) => {
        try {
            await api.delete(`/restaurants/my/cuisines/${cuisineId}`);
            fetchRestaurant();
            toast.success('Cuisine removed');
        } catch { toast.error('Failed to remove cuisine'); }
    };

    // ---------- Image Handlers ----------
    const handleImageUpload = async () => {
        if (!imageFile) return;
        setIsSubmitting(true);
        const data = new FormData();
        data.append('image', imageFile);
        data.append('is_primary', String(isPrimary));
        try {
            await api.post('/restaurants/my/images', data);
            fetchRestaurant();
            setImageFile(null);
            setIsPrimary(false);
            toast.success('Image uploaded');
        } catch { toast.error('Image upload failed'); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteImage = async (imageId) => {
        try {
            await api.delete(`/restaurants/my/images/${imageId}`);
            fetchRestaurant();
            toast.success('Image deleted');
        } catch { toast.error('Failed to delete image'); }
    };

    const handleSetPrimary = async (imageId) => {
        try {
            await api.put(`/restaurants/my/images/${imageId}/primary`);
            fetchRestaurant();
            toast.success('Primary image updated');
        } catch { toast.error('Failed to set primary'); }
    };

    // ---------- Menu Handlers ----------
    const handleCreateMenu = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/restaurants/my/menus', menuForm);
            setMenus([...menus, res.data]);
            setMenuForm({ name: '', is_active: true });
            toast.success('Menu created');
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create menu'); }
    };

    const handleUpdateMenu = async (menuId, data) => {
        try {
            const res = await api.put(`/restaurants/my/menus/${menuId}`, data);
            setMenus(menus.map(m => m.id === menuId ? res.data : m));
            setEditingMenuId(null);
            toast.success('Menu updated');
        } catch { toast.error('Failed to update menu'); }
    };

    const handleDeleteMenu = async (menuId) => {
        try {
            await api.delete(`/restaurants/my/menus/${menuId}`);
            setMenus(menus.filter(m => m.id !== menuId));
            if (selectedMenuId === menuId) setSelectedMenuId(null);
            toast.success('Menu deleted');
        } catch { toast.error('Failed to delete menu'); }
    };

    const handleCreateCategory = async (menuId, e) => {
        e.preventDefault();
        try {
            const res = await api.post(`/restaurants/my/menus/${menuId}/categories`, categoryForm);
            setMenus(menus.map(m => m.id === menuId ? { ...m, categories: [...(m.categories || []), res.data] } : m));
            setCategoryForm({ name: '' });
            toast.success('Category added');
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to add category'); }
    };

    const handleUpdateCategory = async (categoryId, data) => {
        try {
            const res = await api.put(`/restaurants/my/menus/categories/${categoryId}`, data);
            setMenus(menus.map(menu => ({
                ...menu, categories: menu.categories?.map(cat => cat.id === categoryId ? res.data : cat) || []
            })));
            setEditingCategoryId(null);
            toast.success('Category updated');
        } catch { toast.error('Failed to update category'); }
    };

    const handleDeleteCategory = async (categoryId) => {
        try {
            await api.delete(`/restaurants/my/menus/categories/${categoryId}`);
            setMenus(menus.map(menu => ({
                ...menu, categories: menu.categories?.filter(cat => cat.id !== categoryId) || []
            })));
            toast.success('Category deleted');
        } catch { toast.error('Failed to delete category'); }
    };

    const handleCreateItem = async (categoryId, e) => {
        e.preventDefault();
        try {
            const res = await api.post(`/restaurants/my/menus/categories/${categoryId}/items`, itemForm);
            setMenus(menus.map(menu => ({
                ...menu, categories: menu.categories?.map(cat =>
                    cat.id === categoryId ? { ...cat, items: [...(cat.items || []), res.data] } : cat
                ) || []
            })));
            setItemForm({ name: '', description: '', price: '', is_veg: true, is_available: true });
            setSelectedCategoryForItem(null);
            toast.success('Item added');
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to add item'); }
    };

    const handleUpdateItem = async (itemId, data) => {
        try {
            const res = await api.put(`/restaurants/my/menus/items/${itemId}`, data);
            setMenus(menus.map(menu => ({
                ...menu, categories: menu.categories?.map(cat => ({
                    ...cat, items: cat.items?.map(item => item.id === itemId ? res.data : item) || []
                })) || []
            })));
            setEditingItemId(null);
            toast.success('Item updated');
        } catch { toast.error('Failed to update item'); }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            await api.delete(`/restaurants/my/menus/items/${itemId}`);
            setMenus(menus.map(menu => ({
                ...menu, categories: menu.categories?.map(cat => ({
                    ...cat, items: cat.items?.filter(item => item.id !== itemId) || []
                })) || []
            })));
            toast.success('Item deleted');
        } catch { toast.error('Failed to delete item'); }
    };

    const toggleAvailability = async (item) => {
        await handleUpdateItem(item.id, { is_available: !item.is_available });
    };

    const fetchAddons = async (itemId) => {
        try {
            const res = await api.get(`/restaurants/my/menus/items/${itemId}/addons`);
            setAddons(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load add‑ons'); }
    };

    const handleAddAddon = async (itemId, e) => {
        e.preventDefault();
        try {
            const res = await api.post(`/restaurants/my/menus/items/${itemId}/addons`, addonForm);
            setAddons([...addons, res.data]);
            setAddonForm({ name: '', price: '' });
            toast.success('Add‑on added');
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to add add‑on'); }
    };

    const handleUpdateAddon = async (addonId, data) => {
        try {
            const res = await api.put(`/restaurants/my/menus/addons/${addonId}`, data);
            setAddons(addons.map(a => a.id === addonId ? res.data : a));
            setEditingAddonId(null);
            toast.success('Add‑on updated');
        } catch { toast.error('Failed to update add‑on'); }
    };

    const handleDeleteAddon = async (addonId) => {
        try {
            await api.delete(`/restaurants/my/menus/addons/${addonId}`);
            setAddons(addons.filter(a => a.id !== addonId));
            toast.success('Add‑on deleted');
        } catch { toast.error('Failed to delete add‑on'); }
    };

    const toggleAddonSection = (itemId) => {
        if (expandedAddonItemId === itemId) {
            setExpandedAddonItemId(null);
            setAddons([]);
        } else {
            setExpandedAddonItemId(itemId);
            fetchAddons(itemId);
        }
    };

    // ---------- Combo Handlers ----------
    const handleCreateCombo = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = {
            name: comboForm.name, description: comboForm.description, combo_price: parseFloat(comboForm.combo_price),
            items: comboForm.items.filter(i => i.food_item_id).map(i => ({ food_item_id: parseInt(i.food_item_id), quantity: parseInt(i.quantity) })),
        };
        try {
            const res = await api.post('/restaurants/my/combos', payload);
            setCombos([...combos, res.data]);
            setComboForm({ name: '', description: '', combo_price: '', is_available: true, items: [{ food_item_id: '', quantity: 1 }] });
            toast.success('Combo created successfully');
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create combo'); }
        finally { setIsSubmitting(false); }
    };

    const handleUpdateCombo = async (comboId) => {
        setIsSubmitting(true);
        const payload = {
            name: comboForm.name, description: comboForm.description, combo_price: parseFloat(comboForm.combo_price), is_available: comboForm.is_available,
            items: comboForm.items.filter(i => i.food_item_id).map(i => ({ food_item_id: parseInt(i.food_item_id), quantity: parseInt(i.quantity) })),
        };
        try {
            const res = await api.put(`/restaurants/my/combos/${comboId}`, payload);
            setCombos(combos.map(c => c.id === comboId ? res.data : c));
            setEditingComboId(null);
            setComboForm({ name: '', description: '', combo_price: '', is_available: true, items: [{ food_item_id: '', quantity: 1 }] });
            toast.success('Combo updated successfully');
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update combo'); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteCombo = async (comboId) => {
        try {
            await api.delete(`/restaurants/my/combos/${comboId}`);
            setCombos(combos.filter(c => c.id !== comboId));
            toast.success('Combo deleted');
        } catch { toast.error('Failed to delete combo'); }
    };

    const addComboItemRow = () => setComboForm({ ...comboForm, items: [...comboForm.items, { food_item_id: '', quantity: 1 }] });
    const removeComboItemRow = (index) => setComboForm({ ...comboForm, items: comboForm.items.filter((_, i) => i !== index) });
    const updateComboItem = (index, field, value) => {
        const items = [...comboForm.items];
        items[index][field] = value;
        setComboForm({ ...comboForm, items });
    };

    // ---------- Old Edit Flow ----------
    const handleEditClick = () => {
        if (restaurant) {
            setForm({
                name: restaurant.name || '', description: restaurant.description || '', opening_time: restaurant.opening_time || '', closing_time: restaurant.closing_time || '',
                delivery_radius_km: restaurant.delivery_radius_km || 5, gst_number: restaurant.gst_number || '', gst_doc: null, license_doc: null,
            });
            setIsEditMode(true);
        }
    };

    const handleSubmitOld = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (!restaurant && (!form.gst_doc || !form.license_doc)) {
            toast.error('Please upload both GST and License documents');
            setIsSubmitting(false);
            return;
        }

        const data = new FormData();
        data.append('name', form.name); data.append('description', form.description); data.append('opening_time', form.opening_time); data.append('closing_time', form.closing_time); data.append('delivery_radius_km', form.delivery_radius_km);
        if (form.gst_number) data.append('gst_number', form.gst_number);
        if (form.gst_doc) data.append('gst_doc', form.gst_doc);
        if (form.license_doc) data.append('license_doc', form.license_doc);

        try {
            const res = restaurant ? await api.put('/restaurants/my', data) : await api.post('/restaurants/register', data);
            setRestaurant(res.data);
            setIsEditMode(false);
            toast.success(restaurant ? 'Restaurant details updated' : 'Restaurant registered successfully');
        } catch (err) { toast.error(err.response?.data?.detail || 'Operation failed'); }
        finally { setIsSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading restaurant data...</p>
            </div>
        );
    }

    const renderRegistrationForm = (title, subtitle) => (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                    <div className="p-6 sm:p-10">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
                            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
                        </div>
                        <form onSubmit={handleSubmitOld} className="space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">Restaurant Name <span className="text-red-500">*</span></label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="e.g. The Spicy Kitchen" required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">Description</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" rows={3} placeholder="Tell customers about your cuisine..." />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">Opening Time</label>
                                        <input type="time" value={form.opening_time} onChange={e => setForm({ ...form, opening_time: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">Closing Time</label>
                                        <input type="time" value={form.closing_time} onChange={e => setForm({ ...form, closing_time: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">Delivery Radius (km)</label>
                                        <input type="number" step="0.1" value={form.delivery_radius_km} onChange={e => setForm({ ...form, delivery_radius_km: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">GST Number</label>
                                        <input value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="Optional" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100 mt-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">GST Document {!restaurant ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(leave empty to keep)</span>}</label>
                                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setForm({ ...form, gst_doc: e.target.files[0] })} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition cursor-pointer" required={!restaurant} />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">License Document {!restaurant ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(leave empty to keep)</span>}</label>
                                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setForm({ ...form, license_doc: e.target.files[0] })} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition cursor-pointer" required={!restaurant} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button type="submit" disabled={isSubmitting} className="flex flex-1 h-14 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-md transition duration-200 hover:bg-blue-700 active:scale-95 disabled:opacity-60 w-full sm:w-auto">
                                    <FiUpload className="h-5 w-5" />
                                    <span>{isSubmitting ? 'Saving...' : (restaurant ? 'Update Details' : 'Submit Registration')}</span>
                                </button>
                                {restaurant && (
                                    <button type="button" onClick={() => setIsEditMode(false)} className="flex h-14 w-full sm:w-auto items-center justify-center rounded-xl bg-slate-100 px-8 text-sm font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    );

    if (!restaurant && !isEditMode) return renderRegistrationForm('Register Your Restaurant', 'Fill in the details below to list your business on FoodExpress.');
    if (isEditMode) return renderRegistrationForm('Edit Restaurant Details', 'Update your application details below.');

    if (restaurant && (restaurant.status === 'PENDING' || restaurant.status === 'REJECTED') && !isEditMode) {
        return (
            <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
                <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4">
                    {restaurant.rejection_reason && restaurant.status === 'REJECTED' && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-4 items-start shadow-sm">
                            <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                <FiAlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-red-800 text-lg">Registration Rejected</h4>
                                <p className="text-sm text-red-600 mt-1 font-medium">{restaurant.rejection_reason}</p>
                            </div>
                        </div>
                    )}
                    <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="h-1.5 w-full bg-slate-800" />
                        <div className="p-6 sm:p-10">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pb-8 border-b border-slate-100">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{restaurant.name}</h2>
                                    <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-lg">{restaurant.description || 'No description provided.'}</p>
                                </div>
                                <div className="shrink-0"><StatusBadge status={restaurant.status} /></div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Operating Hours</p>
                                    <p className="mt-1 font-bold text-slate-900 flex items-center gap-2">
                                        <FiClock className="text-blue-500" /> {restaurant.opening_time || 'N/A'} - {restaurant.closing_time || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Delivery Radius</p>
                                    <p className="mt-1 font-bold text-slate-900 flex items-center gap-2">
                                        <FiMap className="text-blue-500" /> {restaurant.delivery_radius_km} km
                                    </p>
                                </div>
                                <div className="sm:col-span-2 pt-4 border-t border-slate-200/60">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">GST Number</p>
                                    <p className="mt-1 font-bold text-slate-900 flex items-center gap-2">
                                        <FiFileText className="text-blue-500" /> {restaurant.gst_number || 'Not provided'}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-sm font-bold text-slate-900 mb-4">Uploaded Documents</h4>
                                <div className="flex flex-wrap gap-3">
                                    {restaurant.gst_doc_path && (
                                        <a href={`http://localhost:8000/${restaurant.gst_doc_path}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 shadow-sm transition hover:bg-slate-50 active:scale-95">
                                            <FiFileText /> View GST Document
                                        </a>
                                    )}
                                    {restaurant.license_doc_path && (
                                        <a href={`http://localhost:8000/${restaurant.license_doc_path}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 shadow-sm transition hover:bg-slate-50 active:scale-95">
                                            <FiFileText /> View License Document
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <button onClick={handleEditClick} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 text-sm font-bold text-white shadow-md transition duration-200 hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 active:scale-95 w-full sm:w-auto">
                                    <FiEdit2 className="h-4 w-4" />
                                    <span>Edit Details & Resubmit</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // 4. APPROVED Restaurant Management Dashboard
    if (restaurant.status === 'APPROVED') {
        return (
            <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">{restaurant.name}</h1>
                            <p className="mt-2 text-sm font-medium text-slate-500">Manage your operations, menu, and inventory.</p>
                        </div>
                        <StatusBadge status={restaurant.status} />
                    </div>

                    {/* Tab Navigation */}
                    <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 overflow-x-auto scrollbar-hide">
                        <div className="flex space-x-1 sm:space-x-2 min-w-max">
                            {TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 px-4 sm:px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${activeTab === tab.key
                                        ? 'bg-slate-900 text-white shadow-md scale-100'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 scale-95 hover:scale-100'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="bg-white overflow-hidden rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 transition-all min-h-[500px]">

                        {/* ========== DASHBOARD TAB ========== */}
                        {activeTab === 'dashboard' && (
                            <div className="animate-in fade-in space-y-8">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
                                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                                <FiTrendingUp size={21} />
                                            </span>
                                            Performance Dashboard
                                        </h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Monitor sales, orders, customer growth, popular dishes, and recent activity.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={refreshDashboard}
                                        disabled={dashboardRefreshing}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <FiRefreshCw className={`h-4 w-4 ${dashboardRefreshing ? 'animate-spin' : ''}`} />
                                        {dashboardRefreshing ? 'Refreshing...' : 'Refresh Dashboard'}
                                    </button>
                                </div>

                                {dashboardData && performanceData ? (
                                    <div className="space-y-8">
                                        {/* Summary cards */}
                                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                            <DashboardMetricCard
                                                title="Today's Orders"
                                                value={Number(dashboardData.today_orders_count || 0).toLocaleString('en-IN')}
                                                subtitle="Orders received today"
                                                icon={<FiShoppingBag size={22} />}
                                                iconClass="bg-blue-50 text-blue-600"
                                            />
                                            <DashboardMetricCard
                                                title="Revenue Today"
                                                value={formatCurrency(dashboardData.revenue_today)}
                                                subtitle="Completed order revenue"
                                                icon={<FiDollarSign size={22} />}
                                                iconClass="bg-emerald-50 text-emerald-600"
                                            />
                                            <DashboardMetricCard
                                                title="Revenue This Week"
                                                value={formatCurrency(dashboardData.revenue_week)}
                                                subtitle="Current weekly performance"
                                                icon={<FiTrendingUp size={22} />}
                                                iconClass="bg-violet-50 text-violet-600"
                                            />
                                        </div>

                                        {/* Daily sales */}
                                        <DashboardChartCard
                                            title="Daily Sales"
                                            subtitle="Revenue and order volume for the last 7 days"
                                        >
                                            {performanceData.daily_sales.length ? (
                                                <Line
                                                    data={{
                                                        labels: performanceData.daily_sales.map(item => item.date || ''),
                                                        datasets: [
                                                            {
                                                                label: 'Revenue (₹)',
                                                                data: performanceData.daily_sales.map(item => Number(item.revenue || 0)),
                                                                borderColor: '#2563eb',
                                                                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                                                                pointBackgroundColor: '#ffffff',
                                                                pointBorderColor: '#2563eb',
                                                                pointBorderWidth: 2,
                                                                pointRadius: 4,
                                                                pointHoverRadius: 6,
                                                                tension: 0.35,
                                                                fill: true,
                                                                yAxisID: 'y',
                                                            },
                                                            {
                                                                label: 'Orders',
                                                                data: performanceData.daily_sales.map(item => Number(item.orders || 0)),
                                                                borderColor: '#f59e0b',
                                                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                                                pointBackgroundColor: '#ffffff',
                                                                pointBorderColor: '#f59e0b',
                                                                pointBorderWidth: 2,
                                                                pointRadius: 4,
                                                                tension: 0.35,
                                                                yAxisID: 'y1',
                                                            },
                                                        ],
                                                    }}
                                                    options={createDualAxisChartOptions()}
                                                />
                                            ) : (
                                                <ChartEmptyState message="No daily sales data available." />
                                            )}
                                        </DashboardChartCard>

                                        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                                            {/* Weekly sales */}
                                            <DashboardChartCard
                                                title="Weekly Revenue"
                                                subtitle="Revenue recorded across the last 4 weeks"
                                            >
                                                {performanceData.weekly_sales.length ? (
                                                    <Bar
                                                        data={{
                                                            labels: performanceData.weekly_sales.map(item =>
                                                                item.label || `${item.start || ''}${item.end ? ` – ${item.end}` : ''}`
                                                            ),
                                                            datasets: [{
                                                                label: 'Revenue (₹)',
                                                                data: performanceData.weekly_sales.map(item => Number(item.revenue || 0)),
                                                                backgroundColor: 'rgba(16, 185, 129, 0.78)',
                                                                borderColor: '#059669',
                                                                borderWidth: 1,
                                                                borderRadius: 8,
                                                                maxBarThickness: 48,
                                                            }],
                                                        }}
                                                        options={createRevenueChartOptions()}
                                                    />
                                                ) : (
                                                    <ChartEmptyState message="No weekly sales data available." />
                                                )}
                                            </DashboardChartCard>

                                            {/* Monthly sales */}
                                            <DashboardChartCard
                                                title="Monthly Revenue"
                                                subtitle="Revenue trend for the last 6 months"
                                            >
                                                {performanceData.monthly_sales.length ? (
                                                    <Bar
                                                        data={{
                                                            labels: performanceData.monthly_sales.map(item => item.month || ''),
                                                            datasets: [{
                                                                label: 'Revenue (₹)',
                                                                data: performanceData.monthly_sales.map(item => Number(item.revenue || 0)),
                                                                backgroundColor: 'rgba(139, 92, 246, 0.78)',
                                                                borderColor: '#7c3aed',
                                                                borderWidth: 1,
                                                                borderRadius: 8,
                                                                maxBarThickness: 48,
                                                            }],
                                                        }}
                                                        options={createRevenueChartOptions()}
                                                    />
                                                ) : (
                                                    <ChartEmptyState message="No monthly sales data available." />
                                                )}
                                            </DashboardChartCard>
                                        </div>

                                        {/* Customer growth */}
                                        <DashboardChartCard
                                            title="Customer Growth"
                                            subtitle="New customers acquired per day"
                                        >
                                            {performanceData.customer_growth.length ? (
                                                <Line
                                                    data={{
                                                        labels: performanceData.customer_growth.map(item => item.date || ''),
                                                        datasets: [{
                                                            label: 'New Customers',
                                                            data: performanceData.customer_growth.map(item => Number(item.new_customers || 0)),
                                                            borderColor: '#ec4899',
                                                            backgroundColor: 'rgba(236, 72, 153, 0.10)',
                                                            pointBackgroundColor: '#ffffff',
                                                            pointBorderColor: '#ec4899',
                                                            pointBorderWidth: 2,
                                                            pointRadius: 4,
                                                            pointHoverRadius: 6,
                                                            fill: true,
                                                            tension: 0.35,
                                                        }],
                                                    }}
                                                    options={createCustomerChartOptions()}
                                                />
                                            ) : (
                                                <ChartEmptyState message="No customer-growth data available." />
                                            )}
                                        </DashboardChartCard>

                                        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                                            {/* Popular dishes */}
                                            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] xl:col-span-1">
                                                <div className="mb-5 flex items-center justify-between">
                                                    <div>
                                                        <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                                            <FiStar className="text-amber-500" /> Popular Dishes
                                                        </h4>
                                                        <p className="mt-1 text-xs text-slate-500">Most frequently ordered items</p>
                                                    </div>
                                                </div>

                                                {!performanceData.popular_dishes.length ? (
                                                    <DashboardEmptyState icon={<FiShoppingBag size={28} />} message="No popular dish data yet." />
                                                ) : (
                                                    <ul className="space-y-3">
                                                        {performanceData.popular_dishes.map((item, index) => (
                                                            <li key={item.id ?? `${item.name}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-500 shadow-sm">
                                                                    #{index + 1}
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-bold text-slate-900">{item.name || 'Unnamed item'}</p>
                                                                    <p className="mt-0.5 text-xs text-slate-500">Customer favourite</p>
                                                                </div>
                                                                <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                                                                    {Number(item.order_count || 0)} orders
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </section>

                                            {/* Today's orders */}
                                            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] xl:col-span-2">
                                                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                                                    <div>
                                                        <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                                            <FiClock className="text-blue-500" /> Today's Orders
                                                        </h4>
                                                        <p className="mt-1 text-xs text-slate-500">Latest orders received today</p>
                                                    </div>
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                                        {(dashboardData.today_orders || []).length} orders
                                                    </span>
                                                </div>

                                                {!dashboardData.today_orders?.length ? (
                                                    <DashboardEmptyState icon={<FiShoppingBag size={28} />} message="No orders received today." />
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-left text-sm">
                                                            <thead className="bg-slate-50">
                                                                <tr>
                                                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Order</th>
                                                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Customer</th>
                                                                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Total</th>
                                                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {dashboardData.today_orders.map(order => (
                                                                    <tr key={order.id} className="transition hover:bg-slate-50/70">
                                                                        <td className="px-5 py-4 font-black text-slate-900">#{order.id}</td>
                                                                        <td className="px-5 py-4 font-medium text-slate-700">{order.customer_name || 'Customer'}</td>
                                                                        <td className="px-5 py-4 text-right font-black text-slate-900">{formatCurrency(order.total)}</td>
                                                                        <td className="px-5 py-4"><OrderStatusBadge status={order.status} /></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </section>
                                        </div>

                                        {/* Recent reviews */}
                                        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                                            <div className="mb-5 flex items-center justify-between">
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                                        <FiMessageSquare className="text-purple-500" /> Recent Reviews
                                                    </h4>
                                                    <p className="mt-1 text-xs text-slate-500">Latest feedback from customers</p>
                                                </div>
                                            </div>

                                            {!dashboardData.recent_reviews?.length ? (
                                                <DashboardEmptyState icon={<FiMessageSquare size={28} />} message="No reviews available yet." />
                                            ) : (
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                    {dashboardData.recent_reviews.map(review => {
                                                        const rating = Math.max(0, Math.min(5, Math.round(Number(review.rating || 0))));
                                                        return (
                                                            <article key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-black text-slate-900">{review.customer_name || 'Customer'}</p>
                                                                        <p className="mt-1 text-xs text-slate-500">Verified customer review</p>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center rounded-lg border border-amber-100 bg-white px-2 py-1 text-xs">
                                                                        <span className="text-amber-400">{'★'.repeat(rating)}</span>
                                                                        <span className="text-slate-200">{'★'.repeat(5 - rating)}</span>
                                                                    </div>
                                                                </div>
                                                                {review.comment && (
                                                                    <p className="mt-3 text-sm leading-6 text-slate-600">“{review.comment}”</p>
                                                                )}
                                                            </article>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                ) : (
                                    <DashboardLoadingState />
                                )}
                            </div>
                        )}

                        {/* ========== PREDICTIONS TAB ========== */}
                        {activeTab === 'predictions' && (
                            <div className="animate-in fade-in space-y-8">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
                                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                                                <FiTrendingUp size={21} />
                                            </span>
                                            Demand Predictions
                                        </h3>
                                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                            Forecast demand, identify peak ordering hours, prepare inventory, and monitor seasonal trends.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => fetchPredictions({ silent: true })}
                                        disabled={predictionsRefreshing || predictionsLoading}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <FiRefreshCw className={`h-4 w-4 ${predictionsRefreshing ? 'animate-spin' : ''}`} />
                                        {predictionsRefreshing ? 'Refreshing...' : 'Refresh Predictions'}
                                    </button>
                                </div>

                                {predictionsLoading && !predictionData ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                            {[1, 2, 3, 4].map(item => (
                                                <div key={item} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
                                            ))}
                                        </div>
                                        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
                                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                            <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
                                            <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
                                        </div>
                                    </div>
                                ) : predictionsError && !predictionData ? (
                                    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-red-200 bg-red-50/50 px-6 text-center">
                                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">
                                            <FiAlertCircle className="h-7 w-7" />
                                        </span>
                                        <h4 className="mt-5 text-xl font-black text-slate-900">Predictions unavailable</h4>
                                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{predictionsError}</p>
                                        <button
                                            type="button"
                                            onClick={() => fetchPredictions()}
                                            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-slate-800"
                                        >
                                            <FiRefreshCw className="h-4 w-4" />
                                            Try Again
                                        </button>
                                    </div>
                                ) : predictionData ? (
                                    <>
                                        {/* Peak hours */}
                                        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-7">
                                            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                                        <FiClock className="text-blue-600" />
                                                        Peak Hour Prediction
                                                    </h4>
                                                    <p className="mt-1 text-xs text-slate-500">Based on ordering activity from the last 30 days.</p>
                                                </div>
                                                <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                                                    Top ordering windows
                                                </span>
                                            </div>

                                            {predictionData.peak_hours.length ? (
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                                    {predictionData.peak_hours.map((peak, index) => {
                                                        const hour = Number(peak.hour || 0);
                                                        return (
                                                            <article
                                                                key={`${hour}-${index}`}
                                                                className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5"
                                                            >
                                                                <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-blue-100/70" />
                                                                <p className="relative text-xs font-bold uppercase tracking-wider text-blue-600">
                                                                    {formatHourRange(hour)}
                                                                </p>
                                                                <p className="relative mt-3 text-3xl font-black text-slate-900">
                                                                    {Number(peak.orders || 0).toLocaleString('en-IN')}
                                                                </p>
                                                                <p className="relative mt-1 text-xs font-medium text-slate-500">expected orders</p>
                                                            </article>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <PredictionEmptyState
                                                    icon={<FiClock className="h-8 w-8" />}
                                                    title="No peak-hour data"
                                                    message="Peak ordering windows will appear after sufficient order history is available."
                                                />
                                            )}
                                        </section>

                                        {/* Demand forecast */}
                                        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                                            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                                        <FiCalendar className="text-violet-600" />
                                                        Demand Forecast
                                                    </h4>
                                                    <p className="mt-1 text-xs text-slate-500">Projected orders and revenue for the next seven days.</p>
                                                </div>
                                                <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                                                    Next 7 days
                                                </span>
                                            </div>

                                            {predictionData.demand_forecast.length ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-left">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 sm:px-7">Date</th>
                                                                <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Predicted Orders</th>
                                                                <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 sm:px-7">Predicted Revenue</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {predictionData.demand_forecast.map((day, index) => (
                                                                <tr key={`${day.date}-${index}`} className="transition hover:bg-slate-50/70">
                                                                    <td className="px-5 py-4 sm:px-7">
                                                                        <p className="font-bold text-slate-900">{formatPredictionDate(day.date)}</p>
                                                                        <p className="mt-1 text-xs text-slate-400">{day.date || 'Date unavailable'}</p>
                                                                    </td>
                                                                    <td className="px-5 py-4 text-right">
                                                                        <span className="inline-flex rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700">
                                                                            {Number(day.predicted_orders || 0).toLocaleString('en-IN')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-4 text-right font-black text-emerald-600 sm:px-7">
                                                                        {formatCurrency(day.predicted_revenue)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="p-6">
                                                    <PredictionEmptyState
                                                        icon={<FiCalendar className="h-8 w-8" />}
                                                        title="No demand forecast"
                                                        message="The seven-day forecast is not available yet."
                                                    />
                                                </div>
                                            )}
                                        </section>

                                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                            {/* Inventory suggestions */}
                                            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-7">
                                                <div className="mb-5 flex items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                                            <FiBox className="text-amber-600" />
                                                            Inventory Suggestions
                                                        </h4>
                                                        <p className="mt-1 text-xs text-slate-500">Suggested restocking based on predicted demand.</p>
                                                    </div>
                                                    <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-amber-50 px-2 text-xs font-black text-amber-700">
                                                        {predictionData.inventory_suggestions.length}
                                                    </span>
                                                </div>

                                                {predictionData.inventory_suggestions.length ? (
                                                    <div className="max-h-[390px] space-y-3 overflow-y-auto pr-1">
                                                        {predictionData.inventory_suggestions.map((item, index) => (
                                                            <article
                                                                key={item.ingredient_id || `${item.name}-${index}`}
                                                                className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4"
                                                            >
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate font-black text-slate-900">{item.name || 'Ingredient'}</p>
                                                                        <p className="mt-1 text-xs text-slate-500">
                                                                            Current stock: <span className="font-bold text-slate-700">{formatQuantity(item.current_stock)} {item.unit || ''}</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="shrink-0 text-right">
                                                                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Suggested order</p>
                                                                        <p className="mt-1 text-lg font-black text-red-600">
                                                                            {formatQuantity(item.suggested_order)} {item.unit || ''}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </article>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-6 text-center">
                                                        <FiCheckCircle className="h-9 w-9 text-emerald-500" />
                                                        <p className="mt-3 font-black text-emerald-800">Stock levels look sufficient</p>
                                                        <p className="mt-1 text-xs leading-5 text-emerald-700">No additional restocking is suggested for the forecast period.</p>
                                                    </div>
                                                )}
                                            </section>

                                            {/* Popular-food forecast */}
                                            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-7">
                                                <div className="mb-5">
                                                    <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                                        <FiStar className="text-amber-500" />
                                                        Popular Food Forecast
                                                    </h4>
                                                    <p className="mt-1 text-xs text-slate-500">Expected top-performing dishes during the next week.</p>
                                                </div>

                                                {predictionData.popular_food_forecast.length ? (
                                                    <div className="max-h-[390px] space-y-3 overflow-y-auto pr-1">
                                                        {predictionData.popular_food_forecast.map((food, index) => {
                                                            const trend = String(food.trend || '0%');
                                                            const isPositive = trend.trim().startsWith('+') || Number.parseFloat(trend) > 0;
                                                            const isNegative = trend.trim().startsWith('-') || Number.parseFloat(trend) < 0;

                                                            return (
                                                                <article
                                                                    key={food.food_id || `${food.name}-${index}`}
                                                                    className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                                                                >
                                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-500 shadow-sm">
                                                                        #{index + 1}
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate font-black text-slate-900">{food.name || 'Food item'}</p>
                                                                        <p className="mt-1 text-xs text-slate-500">
                                                                            {Number(food.predicted_orders || 0).toLocaleString('en-IN')} expected orders
                                                                        </p>
                                                                    </div>
                                                                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${isPositive
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : isNegative
                                                                            ? 'bg-red-50 text-red-700'
                                                                            : 'bg-slate-200 text-slate-700'
                                                                        }`}>
                                                                        {trend}
                                                                    </span>
                                                                </article>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <PredictionEmptyState
                                                        icon={<FiStar className="h-8 w-8" />}
                                                        title="No food forecast"
                                                        message="Popular-item predictions will appear after sufficient sales data is collected."
                                                    />
                                                )}
                                            </section>
                                        </div>

                                        {/* Seasonal trends */}
                                        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:p-8">
                                            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
                                            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />

                                            <div className="relative z-10">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <h4 className="text-xl font-black">Seasonal Trends</h4>
                                                        <p className="mt-1 text-sm text-slate-400">Current-month performance compared with the previous month.</p>
                                                    </div>
                                                    <SeasonalTrendBadge
                                                        direction={predictionData.seasonal_trends.trend_direction}
                                                        growthRate={predictionData.seasonal_trends.growth_rate}
                                                    />
                                                </div>

                                                <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                                                        <p className="text-xs font-black uppercase tracking-wider text-violet-300">
                                                            This Month {predictionData.seasonal_trends.current_month ? `(${predictionData.seasonal_trends.current_month})` : ''}
                                                        </p>
                                                        <p className="mt-3 text-3xl font-black">
                                                            {Number(predictionData.seasonal_trends.current_orders || 0).toLocaleString('en-IN')}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-400">orders</p>
                                                    </div>

                                                    <span className="flex h-11 w-11 items-center justify-center justify-self-center rounded-full border border-white/10 bg-white/10 text-xs font-black uppercase text-slate-400">
                                                        vs
                                                    </span>

                                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                                                        <p className="text-xs font-black uppercase tracking-wider text-blue-300">Previous Month</p>
                                                        <p className="mt-3 text-3xl font-black">
                                                            {Number(predictionData.seasonal_trends.previous_orders || 0).toLocaleString('en-IN')}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-400">orders</p>
                                                    </div>
                                                </div>

                                                {predictionData.generated_at && (
                                                    <p className="mt-5 text-right text-[10px] font-semibold text-slate-500">
                                                        Last generated: {formatDate(predictionData.generated_at)}
                                                    </p>
                                                )}
                                            </div>
                                        </section>
                                    </>
                                ) : null}
                            </div>
                        )}

                        {/* ========== SMART INVENTORY TAB ========== */}
                        {activeTab === 'smartInventory' && (
                            <div className="animate-in fade-in space-y-8">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
                                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                                <FiBox size={21} />
                                            </span>
                                            Smart Inventory
                                        </h3>
                                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                            Monitor stock health, expiry alerts, purchase suggestions, recipes, and ingredient requirements.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => fetchSmartInventory({ silent: true })}
                                        disabled={smartInventoryRefreshing || smartInventoryLoading}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <FiRefreshCw className={`h-4 w-4 ${smartInventoryRefreshing ? 'animate-spin' : ''}`} />
                                        {smartInventoryRefreshing ? 'Refreshing...' : 'Refresh Inventory'}
                                    </button>
                                </div>

                                {smartInventoryLoading && !inventoryData ? (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                            {[1, 2, 3, 4].map(item => (
                                                <div key={item} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
                                            ))}
                                        </div>
                                        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
                                    </div>
                                ) : smartInventoryError && !inventoryData ? (
                                    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-red-200 bg-red-50 px-6 text-center">
                                        <FiAlertCircle className="h-10 w-10 text-red-400" />
                                        <h4 className="mt-4 text-lg font-black text-slate-900">Unable to load smart inventory</h4>
                                        <p className="mt-2 max-w-md text-sm text-slate-500">{smartInventoryError}</p>
                                        <button
                                            type="button"
                                            onClick={() => fetchSmartInventory()}
                                            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800"
                                        >
                                            <FiRefreshCw className="h-4 w-4" /> Try Again
                                        </button>
                                    </div>
                                ) : inventoryData ? (
                                    <>
                                        {/* Overview */}
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                            <SmartMetricCard
                                                title="Total Ingredients"
                                                value={Number(inventoryData.total_ingredients || ingredients.length || 0).toLocaleString('en-IN')}
                                                helper="Ingredients being monitored"
                                                icon={<FiBox className="h-5 w-5" />}
                                                iconClass="bg-blue-50 text-blue-600"
                                            />
                                            <SmartMetricCard
                                                title="Low Stock Alerts"
                                                value={Number(inventoryData.low_stock_count ?? lowStockItems.length ?? 0).toLocaleString('en-IN')}
                                                helper="Items below reorder level"
                                                icon={<FiAlertTriangle className="h-5 w-5" />}
                                                iconClass="bg-red-50 text-red-600"
                                            />
                                            <SmartMetricCard
                                                title="Expiring Soon"
                                                value={Number(inventoryData.upcoming_expiry_count ?? expiryAlerts.length ?? 0).toLocaleString('en-IN')}
                                                helper="Items expiring within 7 days"
                                                icon={<FiClock className="h-5 w-5" />}
                                                iconClass="bg-amber-50 text-amber-600"
                                            />
                                            <SmartMetricCard
                                                title="Recent Transactions"
                                                value={Array.isArray(inventoryData.recent_transactions) ? inventoryData.recent_transactions.length : Number(inventoryData.recent_transactions_count || 0)}
                                                helper="Latest inventory movements"
                                                icon={<FiFileText className="h-5 w-5" />}
                                                iconClass="bg-violet-50 text-violet-600"
                                            />
                                        </div>

                                        {/* Alerts */}
                                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                            <SmartTableCard
                                                title="Low Stock Ingredients"
                                                subtitle="Items that need attention before they run out"
                                            >
                                                {lowStockItems.length === 0 ? (
                                                    <SmartEmptyState icon={<FiCheckCircle className="h-8 w-8" />} message="All stock levels are currently healthy." />
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                    <th className="px-4 py-3">Ingredient</th>
                                                                    <th className="px-4 py-3 text-right">Current</th>
                                                                    <th className="px-4 py-3 text-right">Reorder</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {lowStockItems.map(item => (
                                                                    <tr key={item.id ?? item.ingredient_id} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-3 font-bold text-slate-800">{item.name || item.ingredient_name || 'Ingredient'}</td>
                                                                        <td className="px-4 py-3 text-right font-black text-red-600">{formatQuantity(item.stock ?? item.current_stock)} {item.unit || ''}</td>
                                                                        <td className="px-4 py-3 text-right font-semibold text-slate-600">{formatQuantity(item.reorder_level)} {item.unit || ''}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </SmartTableCard>

                                            <SmartTableCard
                                                title="Expiry Alerts"
                                                subtitle="Ingredients approaching their expiry date"
                                            >
                                                {expiryAlerts.length === 0 ? (
                                                    <SmartEmptyState icon={<FiCheckCircle className="h-8 w-8" />} message="No ingredients are expiring within the next 7 days." />
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                    <th className="px-4 py-3">Ingredient</th>
                                                                    <th className="px-4 py-3">Expiry</th>
                                                                    <th className="px-4 py-3 text-center">Days Left</th>
                                                                    <th className="px-4 py-3 text-right">Stock</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {expiryAlerts.map(item => (
                                                                    <tr key={item.id ?? item.ingredient_id} className="transition hover:bg-slate-50">
                                                                        <td className="px-4 py-3 font-bold text-slate-800">
                                                                            {item.name || item.ingredient_name || 'Ingredient'}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-slate-600">
                                                                            {item.expiry_date || 'Not available'}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${Number(item.days_left ?? 0) <= 2
                                                                                ? 'bg-red-50 text-red-600'
                                                                                : 'bg-amber-50 text-amber-700'
                                                                                }`}>
                                                                                {Number(item.days_left ?? 0)}d
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                                            {formatQuantity(item.stock ?? item.current_stock ?? 0)} {item.unit || ''}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </SmartTableCard>
                                        </div>

                                        {/* Purchase suggestions */}
                                        <SmartTableCard
                                            title="Auto Restock Suggestions"
                                            subtitle="Suggested purchases based on current inventory levels"
                                        >
                                            {purchaseSuggestions.length === 0 ? (
                                                <SmartEmptyState icon={<FiCheckCircle className="h-8 w-8" />} message="No purchase suggestions are required right now." />
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                <th className="px-4 py-3">Ingredient</th>
                                                                <th className="px-4 py-3">Current Stock</th>
                                                                <th className="px-4 py-3">Suggested Order</th>
                                                                <th className="px-4 py-3">Supplier</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {purchaseSuggestions.map(item => (
                                                                <tr key={item.ingredient_id ?? item.id} className="hover:bg-slate-50">
                                                                    <td className="px-4 py-3 font-bold text-slate-900">{item.name || item.ingredient_name || 'Ingredient'}</td>
                                                                    <td className="px-4 py-3 text-slate-600">{formatQuantity(item.current_stock)} {item.unit || ''}</td>
                                                                    <td className="px-4 py-3 font-black text-emerald-600">{formatQuantity(item.suggested_order)} {item.unit || ''}</td>
                                                                    <td className="px-4 py-3 text-slate-600">{item.supplier || item.supplier_name || 'Not assigned'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </SmartTableCard>

                                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                            {/* Recipe Management */}
                                            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-7">
                                                <div className="mb-5">
                                                    <h4 className="text-lg font-black text-slate-900">Recipe Management</h4>
                                                    <p className="mt-1 text-xs leading-5 text-slate-500">Map ingredients and required quantities to each food item.</p>
                                                </div>

                                                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Food Item</label>
                                                <select
                                                    value={selectedFoodId}
                                                    onChange={e => handleFoodSelection(e.target.value)}
                                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                                >
                                                    <option value="">Select a food item</option>
                                                    {foodItems.map(food => (
                                                        <option key={food.id} value={food.id}>{food.name}</option>
                                                    ))}
                                                </select>

                                                {foodItems.length === 0 && (
                                                    <p className="mt-2 text-xs font-medium text-amber-600">Create menu food items first to manage recipes.</p>
                                                )}

                                                {selectedFoodId && (
                                                    <div className="mt-5 space-y-5">
                                                        <div>
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <h5 className="text-sm font-black text-slate-800">Current Recipe</h5>
                                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{recipeList.length} ingredients</span>
                                                            </div>

                                                            {recipeLoading ? (
                                                                <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                                                            ) : recipeList.length === 0 ? (
                                                                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">No recipe ingredients added yet.</div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {recipeList.map(recipe => (
                                                                        <div key={recipe.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                                            <div className="min-w-0">
                                                                                <p className="truncate text-sm font-bold text-slate-800">{recipe.ingredient_name || recipe.name || `Ingredient #${recipe.ingredient_id}`}</p>
                                                                                <p className="mt-0.5 text-xs text-slate-500">{formatQuantity(recipe.quantity_required)} {recipe.unit || ''} per item</p>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteRecipe(recipe.id)}
                                                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                                                                                aria-label="Remove recipe ingredient"
                                                                            >
                                                                                <FiTrash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                                            <p className="mb-3 text-xs font-black uppercase tracking-wider text-blue-700">Add Ingredient</p>
                                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_auto]">
                                                                <select
                                                                    value={newRecipeIngredientId}
                                                                    onChange={e => setNewRecipeIngredientId(e.target.value)}
                                                                    className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                                >
                                                                    <option value="">Select ingredient</option>
                                                                    {ingredients.map(ingredient => (
                                                                        <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    type="number"
                                                                    min="0.0001"
                                                                    step="any"
                                                                    value={newRecipeQty}
                                                                    onChange={e => setNewRecipeQty(e.target.value)}
                                                                    placeholder="Quantity"
                                                                    className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddRecipe}
                                                                    disabled={recipeSubmitting || !newRecipeIngredientId || !newRecipeQty}
                                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    {recipeSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FiPlus className="h-4 w-4" />}
                                                                    Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>

                                            {/* Ingredient Calculator */}
                                            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-7">
                                                <div className="mb-5">
                                                    <h4 className="text-lg font-black text-slate-900">Ingredient Calculator</h4>
                                                    <p className="mt-1 text-xs leading-5 text-slate-500">Calculate the ingredients needed to prepare a group of menu items.</p>
                                                </div>

                                                <div className="space-y-3">
                                                    {calcItems.map((item, index) => (
                                                        <div key={index} className="grid grid-cols-[minmax(0,1fr)_90px_40px] gap-2">
                                                            <select
                                                                value={item.food_item_id}
                                                                onChange={e => updateCalculatorItem(index, 'food_item_id', e.target.value)}
                                                                className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                                                            >
                                                                <option value="">Food item</option>
                                                                {foodItems.map(food => (
                                                                    <option key={food.id} value={food.id}>{food.name}</option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                value={item.quantity}
                                                                onChange={e => updateCalculatorItem(index, 'quantity', e.target.value)}
                                                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                                                                aria-label="Food quantity"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeCalculatorItem(index)}
                                                                className="flex h-11 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                                                                aria-label="Remove calculator item"
                                                            >
                                                                <FiX className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={addCalculatorItem}
                                                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <FiPlus className="h-4 w-4" /> Add Item
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCalculate}
                                                        disabled={calculatorLoading || foodItems.length === 0}
                                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {calculatorLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FiLayers className="h-4 w-4" />}
                                                        {calculatorLoading ? 'Calculating...' : 'Calculate'}
                                                    </button>
                                                </div>

                                                {calcResult && (
                                                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                                                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                                            <h5 className="text-sm font-black text-slate-800">Required Ingredients</h5>
                                                        </div>
                                                        {calcResult.length === 0 ? (
                                                            <p className="p-5 text-center text-sm text-slate-500">No ingredient requirements were returned.</p>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full text-xs">
                                                                    <thead className="bg-white text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-left">Ingredient</th>
                                                                            <th className="px-4 py-3 text-right">Required</th>
                                                                            <th className="px-4 py-3 text-right">Stock</th>
                                                                            <th className="px-4 py-3 text-right">Shortfall</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {calcResult.map(result => {
                                                                            const shortfall = Number(result.shortfall || 0);
                                                                            return (
                                                                                <tr key={result.ingredient_id ?? result.id}>
                                                                                    <td className="px-4 py-3 font-bold text-slate-800">{result.name || result.ingredient_name || 'Ingredient'}</td>
                                                                                    <td className="px-4 py-3 text-right text-slate-600">{formatQuantity(result.required_quantity)} {result.unit || ''}</td>
                                                                                    <td className="px-4 py-3 text-right text-slate-600">{formatQuantity(result.current_stock)} {result.unit || ''}</td>
                                                                                    <td className={`px-4 py-3 text-right font-black ${shortfall > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatQuantity(shortfall)} {result.unit || ''}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </section>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        )}

                        {/* ---------- INVENTORY TAB ---------- */}
                        {activeTab === 'inventory' && (
                            <div className="animate-in fade-in space-y-10">
                                {/* Suppliers Section */}
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><FiTruck size={20} /></div>
                                            Suppliers
                                        </h3>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8">
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            try {
                                                if (editingSupplierId) { await api.put(`/inventory/suppliers/${editingSupplierId}`, supplierForm); toast.success('Supplier updated'); }
                                                else { await api.post('/inventory/suppliers', supplierForm); toast.success('Supplier added'); }
                                                fetchSuppliers();
                                                setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
                                                setEditingSupplierId(null);
                                            } catch { toast.error('Failed to save supplier'); }
                                        }} className="flex flex-col sm:flex-row flex-wrap items-end gap-3 mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">

                                            <div className="flex-1 min-w-[200px] w-full"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Company Name *</label><input required placeholder="E.g. Fresh Foods Ltd" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" /></div>
                                            <div className="w-full sm:w-auto"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Contact Person</label><input placeholder="Name" value={supplierForm.contact_person} onChange={e => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} className="w-full sm:w-36 border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" /></div>
                                            <div className="w-full sm:w-auto"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Phone</label><input placeholder="Phone" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="w-full sm:w-36 border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" /></div>
                                            <div className="w-full sm:w-auto"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Email</label><input placeholder="Email" type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} className="w-full sm:w-48 border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" /></div>
                                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                <button type="submit" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm">{editingSupplierId ? 'Update' : 'Add'}</button>
                                                {editingSupplierId && <button type="button" onClick={() => { setEditingSupplierId(null); setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' }); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition">Cancel</button>}
                                            </div>
                                        </form>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {suppliers.map(s => (
                                                <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-colors">
                                                    <div className="mb-4">
                                                        <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">{s.name}</h4>
                                                        <div className="text-sm text-slate-500 mt-2 space-y-1">
                                                            {s.contact_person && <p>👤 {s.contact_person}</p>}
                                                            {s.phone && <p>📞 {s.phone}</p>}
                                                            {s.email && <p>✉️ {s.email}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 border-t border-slate-100 pt-4">
                                                        <button onClick={() => { setEditingSupplierId(s.id); setSupplierForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '' }); }} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 py-2 rounded-lg hover:bg-blue-100 transition"><FiEdit2 /> Edit</button>
                                                        <button onClick={async () => { if (window.confirm('Delete this supplier?')) { try { await api.delete(`/inventory/suppliers/${s.id}`); fetchSuppliers(); toast.success('Supplier deleted'); } catch { toast.error('Delete failed'); } } }} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-red-600 bg-red-50 py-2 rounded-lg hover:bg-red-100 transition"><FiTrash2 /> Delete</button>
                                                    </div>
                                                </div>
                                            ))}
                                            {suppliers.length === 0 && <div className="col-span-full py-8 text-center text-slate-500 bg-white border border-slate-200 border-dashed rounded-2xl font-medium">No suppliers added yet.</div>}
                                        </div>
                                    </div>
                                </section>

                                {/* Ingredients & Stock Section */}
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><FiBox size={20} /></div>
                                            Ingredients & Stock
                                        </h3>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8">
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            try {
                                                const payload = { ...ingredientForm, supplier_id: ingredientForm.supplier_id ? parseInt(ingredientForm.supplier_id) : null };
                                                if (editingIngredientId) { await api.put(`/inventory/ingredients/${editingIngredientId}`, payload); toast.success('Ingredient updated'); }
                                                else { await api.post('/inventory/ingredients', payload); toast.success('Ingredient added'); }
                                                fetchIngredients();
                                                setIngredientForm({ name: '', unit: 'kg', reorder_level: 10, current_stock: 0, supplier_id: '' });
                                                setEditingIngredientId(null);
                                            } catch { toast.error('Failed to save ingredient'); }
                                        }} className="flex flex-col sm:flex-row flex-wrap items-end gap-3 mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">

                                            <div className="flex-1 min-w-[200px] w-full"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Ingredient Name *</label><input required placeholder="E.g. Tomatoes" value={ingredientForm.name} onChange={e => setIngredientForm({ ...ingredientForm, name: e.target.value })} className="w-full border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border" /></div>
                                            <div className="w-full sm:w-auto"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Unit</label><select value={ingredientForm.unit} onChange={e => setIngredientForm({ ...ingredientForm, unit: e.target.value })} className="w-full sm:w-28 border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border bg-white"><option value="kg">kg</option><option value="g">g</option><option value="liters">liters</option><option value="pieces">pieces</option><option value="bottles">bottles</option></select></div>
                                            <div className="w-full sm:w-auto"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Current Stock</label><input type="number" step="0.1" required min="0" value={ingredientForm.current_stock} onChange={e => setIngredientForm({ ...ingredientForm, current_stock: e.target.value })} className="w-full sm:w-28 border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border" /></div>
                                            <div className="w-full sm:w-auto"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Alert Level</label><input type="number" step="0.1" required min="0" value={ingredientForm.reorder_level} onChange={e => setIngredientForm({ ...ingredientForm, reorder_level: e.target.value })} className="w-full sm:w-28 border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border" /></div>
                                            <div className="w-full sm:w-auto"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Supplier</label><select value={ingredientForm.supplier_id} onChange={e => setIngredientForm({ ...ingredientForm, supplier_id: e.target.value })} className="w-full sm:w-40 border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border bg-white"><option value="">No supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>

                                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                <button type="submit" className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm">{editingIngredientId ? 'Update' : 'Add'}</button>
                                                {editingIngredientId && <button type="button" onClick={() => { setEditingIngredientId(null); setIngredientForm({ name: '', unit: 'kg', reorder_level: 10, current_stock: 0, supplier_id: '' }); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition">Cancel</button>}
                                            </div>
                                        </form>

                                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm text-left">
                                                    <thead className="bg-slate-50/80 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Ingredient Name</th>
                                                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Stock Status</th>
                                                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Current Stock</th>
                                                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Alert Level</th>
                                                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Supplier</th>
                                                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px] text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {ingredients.map(ing => {
                                                            const isLowStock = ing.current_stock <= ing.reorder_level;
                                                            return (
                                                                <tr key={ing.id} className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-red-50/30' : ''}`}>
                                                                    <td className="px-5 py-4 font-bold text-slate-900">{ing.name}</td>
                                                                    <td className="px-5 py-4">
                                                                        {isLowStock ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200"><FiAlertCircle /> Low Stock</span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200"><FiCheckCircle /> Optimal</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-5 py-4 font-bold text-slate-700"><span className={isLowStock ? 'text-red-600 text-base' : 'text-base'}>{ing.current_stock}</span> <span className="text-slate-400">{ing.unit}</span></td>
                                                                    <td className="px-5 py-4 text-slate-500 font-medium">{ing.reorder_level} {ing.unit}</td>
                                                                    <td className="px-5 py-4 text-slate-600">{ing.supplier_name || <span className="italic text-slate-400">None</span>}</td>
                                                                    <td className="px-5 py-4">
                                                                        <div className="flex justify-end items-center gap-2">
                                                                            <button onClick={() => setTransactionIngredient(ing)} className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition active:scale-95"><FiRefreshCw size={12} /> Log</button>
                                                                            <button onClick={() => { setEditingIngredientId(ing.id); setIngredientForm({ name: ing.name, unit: ing.unit, reorder_level: ing.reorder_level, current_stock: ing.current_stock, supplier_id: ing.supplier_id || '' }); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition border border-slate-100" title="Edit"><FiEdit2 size={14} /></button>
                                                                            <button onClick={async () => { if (window.confirm('Delete this ingredient?')) { try { await api.delete(`/inventory/ingredients/${ing.id}`); fetchIngredients(); toast.success('Deleted'); } catch { toast.error('Delete failed'); } } }} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition border border-slate-100" title="Delete"><FiTrash2 size={14} /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {ingredients.length === 0 && <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-500 font-medium">No ingredients added to inventory yet.</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Inventory Reports */}
                                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-white shadow-[0_16px_45px_rgba(15,23,42,0.18)] sm:p-8">
                                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-300 ring-1 ring-white/10">
                                                <FiFileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Inventory Analytics</p>
                                                <h3 className="mt-1 text-2xl font-black tracking-tight">Transaction Report</h3>
                                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                                                    Review restocks, usage, adjustments, and stock movement history with optional date filters.
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => fetchReport({ openModal: true })}
                                            disabled={reportLoading}
                                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                        >
                                            {reportLoading ? (
                                                <>
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <FiFileText className="h-4 w-4" />
                                                    View Report
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </section>

                                {/* Inventory Report Modal */}
                                {showReport && (
                                    <div
                                        className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="inventory-report-title"
                                    >
                                        <button
                                            type="button"
                                            aria-label="Close inventory report"
                                            className="absolute inset-0 cursor-default"
                                            onClick={() => setShowReport(false)}
                                        />

                                        <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]">
                                            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-7">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                                        <FiFileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 id="inventory-report-title" className="text-xl font-black sm:text-2xl">Inventory Transaction Report</h3>
                                                        <p className="mt-1 text-xs text-slate-400 sm:text-sm">Complete history of stock changes for your restaurant.</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowReport(false)}
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/15 hover:text-white"
                                                    aria-label="Close report"
                                                >
                                                    <FiX className="h-5 w-5" />
                                                </button>
                                            </div>

                                            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                                                    <div>
                                                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">Start Date</label>
                                                        <input
                                                            type="date"
                                                            value={reportStart}
                                                            max={reportEnd || undefined}
                                                            onChange={(e) => setReportStart(e.target.value)}
                                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">End Date</label>
                                                        <input
                                                            type="date"
                                                            value={reportEnd}
                                                            min={reportStart || undefined}
                                                            onChange={(e) => setReportEnd(e.target.value)}
                                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchReport({ openModal: false })}
                                                        disabled={reportLoading}
                                                        className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <FiRefreshCw className={`h-4 w-4 ${reportLoading ? 'animate-spin' : ''}`} />
                                                        Apply Filters
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={clearReportFilters}
                                                        disabled={reportLoading || (!reportStart && !reportEnd)}
                                                        className="mt-auto inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="min-h-0 flex-1 overflow-auto">
                                                {reportLoading ? (
                                                    <div className="flex min-h-[360px] flex-col items-center justify-center">
                                                        <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                                                        <p className="mt-4 text-sm font-bold text-slate-500">Loading transaction report...</p>
                                                    </div>
                                                ) : reportData.length === 0 ? (
                                                    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                                                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-300">
                                                            <FiFileText className="h-9 w-9" />
                                                        </div>
                                                        <h4 className="mt-5 text-xl font-black text-slate-900">No transactions found</h4>
                                                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">No inventory activity matches the selected date range.</p>
                                                    </div>
                                                ) : (
                                                    <table className="min-w-full text-left text-sm">
                                                        <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                                                            <tr>
                                                                <th className="whitespace-nowrap px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Date</th>
                                                                <th className="whitespace-nowrap px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Ingredient</th>
                                                                <th className="whitespace-nowrap px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Type</th>
                                                                <th className="whitespace-nowrap px-5 py-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Quantity Change</th>
                                                                <th className="min-w-[240px] px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {reportData.map((tx, index) => {
                                                                const quantity = Number(tx.quantity_change || 0);
                                                                const isPositive = quantity > 0;
                                                                const type = String(tx.transaction_type || 'adjustment').toLowerCase();
                                                                return (
                                                                    <tr key={tx.id ?? `${tx.created_at}-${index}`} className="transition hover:bg-slate-50">
                                                                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">{formatDate(tx.created_at)}</td>
                                                                        <td className="px-5 py-4 font-black text-slate-900">{tx.ingredient_name || tx.ingredient?.name || 'Unknown ingredient'}</td>
                                                                        <td className="px-5 py-4">
                                                                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${type === 'restock' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : type === 'usage' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                                                                                {type.replaceAll('_', ' ')}
                                                                            </span>
                                                                        </td>
                                                                        <td className={`whitespace-nowrap px-5 py-4 text-right text-base font-black ${isPositive ? 'text-emerald-600' : quantity < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                                                            {isPositive ? '+' : ''}{quantity}
                                                                            {tx.unit ? <span className="ml-1 text-xs font-bold text-slate-400">{tx.unit}</span> : null}
                                                                        </td>
                                                                        <td className="px-5 py-4 text-slate-500">{tx.notes || <span className="italic text-slate-400">No notes</span>}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                                                <p className="text-xs font-bold text-slate-500">
                                                    Showing <span className="text-slate-900">{reportData.length}</span> transaction{reportData.length === 1 ? '' : 's'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowReport(false)}
                                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-black text-white transition hover:bg-slate-800"
                                                >
                                                    Close Report
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Transaction Modal */}
                                {transactionIngredient && (
                                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                                        <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-xl font-black text-slate-900">Log Transaction</h3>
                                                <button onClick={() => setTransactionIngredient(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition"><FiX size={20} /></button>
                                            </div>

                                            <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-2xl flex justify-between items-center">
                                                <span className="font-bold text-blue-900">{transactionIngredient.name}</span>
                                                <span className="text-blue-700 font-medium text-sm">Current: <strong>{transactionIngredient.current_stock} {transactionIngredient.unit}</strong></span>
                                            </div>

                                            <form onSubmit={async (e) => {
                                                e.preventDefault();
                                                try {
                                                    await api.post(`/inventory/ingredients/${transactionIngredient.id}/transactions`, {
                                                        quantity_change: parseFloat(transactionForm.quantity_change),
                                                        transaction_type: transactionForm.transaction_type,
                                                        notes: transactionForm.notes || null
                                                    });
                                                    fetchIngredients();
                                                    setTransactionIngredient(null);
                                                    setTransactionForm({ quantity_change: 0, transaction_type: 'restock', notes: '' });
                                                    toast.success('Inventory logged successfully');
                                                } catch (err) { toast.error(err.response?.data?.detail || 'Transaction failed'); }
                                            }} className="space-y-5">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Transaction Type</label>
                                                    <select value={transactionForm.transaction_type} onChange={e => setTransactionForm({ ...transactionForm, transaction_type: e.target.value })} className="w-full border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none border bg-white">
                                                        <option value="restock">Restock (Add Stock)</option>
                                                        <option value="usage">Usage (Deduct Stock)</option>
                                                        <option value="adjustment">Adjustment (Audit/Waste)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Quantity Change ({transactionIngredient.unit})</label>
                                                    <input type="number" step="0.1" required value={transactionForm.quantity_change} onChange={e => setTransactionForm({ ...transactionForm, quantity_change: e.target.value })} className="w-full border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" placeholder={`Amount in ${transactionIngredient.unit}`} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
                                                    <input value={transactionForm.notes} onChange={e => setTransactionForm({ ...transactionForm, notes: e.target.value })} className="w-full border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none border" placeholder="E.g. Daily prep, Supplier delivery..." />
                                                </div>
                                                <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                                                    <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3.5 rounded-xl font-bold transition shadow-md active:scale-95">Save Transaction</button>
                                                    <button type="button" onClick={() => setTransactionIngredient(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3.5 rounded-xl font-bold transition active:scale-95">Cancel</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ---------- BRANCHES TAB ---------- */}
                        {activeTab === 'branches' && (
                            <div className="animate-in fade-in space-y-8">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                                <FiMap className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                                                    Branch Management
                                                </h3>
                                                <p className="mt-1 text-sm font-medium text-slate-500">
                                                    Create, update and monitor all restaurant branches.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={fetchBranches}
                                        disabled={branchesLoading}
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    >
                                        <FiRefreshCw className={`h-4 w-4 ${branchesLoading ? 'animate-spin' : ''}`} />
                                        {branchesLoading ? 'Refreshing...' : 'Refresh Branches'}
                                    </button>
                                </div>

                                {/* Summary cards */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Branches</p>
                                        <p className="mt-2 text-3xl font-black text-slate-900">{branches.length}</p>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Active Branches</p>
                                        <p className="mt-2 text-3xl font-black text-emerald-700">
                                            {branches.filter(branch => branch.is_active !== false).length}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">Total Revenue</p>
                                        <p className="mt-2 truncate text-2xl font-black text-blue-700">
                                            {formatCurrency(
                                                branches.reduce(
                                                    (total, branch) => total + Number(branch.revenue || 0),
                                                    0
                                                )
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Create / edit form */}
                                <section
                                    id="branch-form"
                                    className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm"
                                >
                                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900">
                                                {editingBranchId ? 'Edit Branch' : 'Add New Branch'}
                                            </h4>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Enter the branch address, contact and manager information.
                                            </p>
                                        </div>

                                        {editingBranchId && (
                                            <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
                                                Editing branch #{editingBranchId}
                                            </span>
                                        )}
                                    </div>

                                    <form
                                        onSubmit={handleBranchSubmit}
                                        className="grid grid-cols-1 gap-5 p-5 sm:p-7 md:grid-cols-2"
                                    >
                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Branch Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                value={branchForm.name}
                                                onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                placeholder="E.g. Pizza Paradise - Indiranagar"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={branchForm.phone}
                                                onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Address Line 1
                                            </label>
                                            <input
                                                value={branchForm.address_line1}
                                                onChange={e => setBranchForm({ ...branchForm, address_line1: e.target.value })}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                placeholder="Building, street or locality"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Address Line 2
                                            </label>
                                            <input
                                                value={branchForm.address_line2}
                                                onChange={e => setBranchForm({ ...branchForm, address_line2: e.target.value })}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                placeholder="Landmark or area"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">City</label>
                                            <input
                                                value={branchForm.city}
                                                onChange={e => setBranchForm({ ...branchForm, city: e.target.value })}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                placeholder="Bengaluru"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">State</label>
                                            <input
                                                value={branchForm.state}
                                                onChange={e => setBranchForm({ ...branchForm, state: e.target.value })}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                placeholder="Karnataka"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">Pincode</label>
                                            <input
                                                inputMode="numeric"
                                                value={branchForm.pincode}
                                                onChange={e => setBranchForm({ ...branchForm, pincode: e.target.value })}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                placeholder="560038"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Branch Manager <span className="font-medium text-slate-400">(optional)</span>
                                            </label>
                                            <select
                                                value={branchForm.manager_id}
                                                onChange={e => setBranchForm({ ...branchForm, manager_id: e.target.value })}
                                                disabled={managerUsersLoading}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                                <option value="">
                                                    {managerUsersLoading ? 'Loading managers...' : 'No manager assigned'}
                                                </option>
                                                {managerUsers.map(manager => (
                                                    <option key={manager.id} value={manager.id}>
                                                        {manager.full_name || manager.name || manager.email || `User #${manager.id}`}
                                                        {manager.role ? ` (${String(manager.role).replaceAll('_', ' ')})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {!managerUsersLoading && managerUsers.length === 0 && (
                                                <p className="mt-1.5 text-xs text-slate-400">
                                                    No active manager users are currently available.
                                                </p>
                                            )}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Branch Status</p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Active branches can receive and process orders.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs font-black uppercase tracking-wider ${branchForm.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {branchForm.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={branchForm.is_active}
                                                        onChange={e => setBranchForm({ ...branchForm, is_active: e.target.checked })}
                                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </label>
                                        </div>

                                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 md:col-span-2 sm:flex-row sm:justify-end">
                                            {editingBranchId && (
                                                <button
                                                    type="button"
                                                    onClick={resetBranchForm}
                                                    disabled={branchSubmitting}
                                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    Cancel Edit
                                                </button>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={branchSubmitting}
                                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-7 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                                            >
                                                {branchSubmitting ? (
                                                    <>
                                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        {editingBranchId ? <FiEdit2 className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
                                                        {editingBranchId ? 'Update Branch' : 'Create Branch'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </section>

                                {/* Branch list */}
                                <section>
                                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900">Your Branches</h4>
                                            <p className="mt-1 text-sm text-slate-500">
                                                View branch performance and manage branch information.
                                            </p>
                                        </div>
                                        <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                                            {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
                                        </span>
                                    </div>

                                    {branchesLoading && branches.length === 0 ? (
                                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                            {[1, 2, 3, 4].map(item => (
                                                <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                                    <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
                                                    <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
                                                    <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                                                    <div className="mt-6 h-20 animate-pulse rounded-2xl bg-slate-100" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : branches.length === 0 ? (
                                        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-200">
                                                <FiMap className="h-8 w-8" />
                                            </div>
                                            <h5 className="mt-5 text-xl font-black text-slate-900">No branches created</h5>
                                            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                                                Add your first branch using the form above. Branch analytics will appear here.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                            {branches.map(branch => {
                                                const revenue = Number(branch.revenue || 0);
                                                const orderCount = Number(branch.order_count || 0);
                                                const fullAddress = [
                                                    branch.address_line1,
                                                    branch.address_line2,
                                                ].filter(Boolean).join(', ');

                                                const cityLine = [
                                                    branch.city,
                                                    branch.state,
                                                ].filter(Boolean).join(', ');

                                                return (
                                                    <article
                                                        key={branch.id}
                                                        className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]"
                                                    >
                                                        <div className={`h-1.5 ${branch.is_active !== false ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-slate-400 to-slate-500'}`} />

                                                        <div className="p-5 sm:p-6">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex min-w-0 items-start gap-3">
                                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                                                        <FiMap className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h5 className="truncate text-lg font-black text-slate-900">
                                                                            {branch.name}
                                                                        </h5>
                                                                        <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${branch.is_active !== false ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                                                                            {branch.is_active !== false ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex shrink-0 gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditBranch(branch)}
                                                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                                                                        aria-label={`Edit ${branch.name}`}
                                                                    >
                                                                        <FiEdit2 className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteBranch(branch)}
                                                                        disabled={deletingBranchId === branch.id}
                                                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        aria-label={`Delete ${branch.name}`}
                                                                    >
                                                                        {deletingBranchId === branch.id ? (
                                                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                                                        ) : (
                                                                            <FiTrash2 className="h-4 w-4" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="mt-5 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                                                                {fullAddress && (
                                                                    <p className="flex items-start gap-2">
                                                                        <FiMap className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                                                        <span className="break-words">{fullAddress}</span>
                                                                    </p>
                                                                )}
                                                                {(cityLine || branch.pincode) && (
                                                                    <p className="pl-6 font-medium text-slate-700">
                                                                        {cityLine}
                                                                        {cityLine && branch.pincode ? ' - ' : ''}
                                                                        {branch.pincode || ''}
                                                                    </p>
                                                                )}
                                                                {branch.phone && (
                                                                    <p className="pl-6">Phone: <span className="font-semibold text-slate-800">{branch.phone}</span></p>
                                                                )}
                                                                {(branch.manager_name || branch.manager_id) && (
                                                                    <p className="pl-6">
                                                                        Manager:{' '}
                                                                        <span className="font-semibold text-slate-800">
                                                                            {branch.manager_name || `User #${branch.manager_id}`}
                                                                        </span>
                                                                    </p>
                                                                )}
                                                                {!fullAddress && !cityLine && !branch.pincode && !branch.phone && (
                                                                    <p className="text-slate-400">No contact or address details provided.</p>
                                                                )}
                                                            </div>

                                                            <div className="mt-5 grid grid-cols-2 gap-3">
                                                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Orders</p>
                                                                    <p className="mt-1 text-xl font-black text-blue-800">{orderCount}</p>
                                                                </div>
                                                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Revenue</p>
                                                                    <p className="mt-1 truncate text-lg font-black text-emerald-800" title={formatCurrency(revenue)}>
                                                                        {formatCurrency(revenue)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}


                        {/* ---------- RESERVATIONS TAB ---------- */}
                        {activeTab === 'reservations' && (
                            <div className="animate-in fade-in space-y-7">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                                            <FiCalendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight text-slate-900">Reservations</h3>
                                            <p className="mt-1 text-sm font-medium text-slate-500">
                                                Review table bookings and confirm or cancel pending requests.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={fetchReservations}
                                        disabled={reservationsLoading}
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-violet-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    >
                                        <FiRefreshCw className={`h-4 w-4 ${reservationsLoading ? 'animate-spin' : ''}`} />
                                        {reservationsLoading ? 'Refreshing...' : 'Refresh Reservations'}
                                    </button>
                                </div>

                                {/* Reservation summary */}
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total</p>
                                        <p className="mt-2 text-3xl font-black text-slate-900">{reservations.length}</p>
                                    </div>
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Pending</p>
                                        <p className="mt-2 text-3xl font-black text-amber-700">
                                            {reservations.filter(item => String(item.status || '').toUpperCase() === 'PENDING').length}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Confirmed</p>
                                        <p className="mt-2 text-3xl font-black text-emerald-700">
                                            {reservations.filter(item => String(item.status || '').toUpperCase() === 'CONFIRMED').length}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Total Guests</p>
                                        <p className="mt-2 text-3xl font-black text-blue-700">
                                            {reservations.reduce((total, item) => total + Number(item.guests || 0), 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Status filters */}
                                <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                                    {['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'].map(status => {
                                        const isActive = reservationFilter === status;
                                        return (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setReservationFilter(status)}
                                                className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${isActive
                                                    ? 'bg-slate-900 text-white shadow-sm'
                                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                                    }`}
                                            >
                                                {status === 'ALL' ? 'All Reservations' : status}
                                            </button>
                                        );
                                    })}
                                </div>

                                {reservationsLoading && reservations.length === 0 ? (
                                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                        {[1, 2, 3, 4].map(item => (
                                            <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
                                                        <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />
                                                        <div className="mt-2 h-4 w-36 animate-pulse rounded bg-slate-100" />
                                                    </div>
                                                    <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (() => {
                                    const filteredReservations = reservations.filter(reservation => {
                                        if (reservationFilter === 'ALL') return true;
                                        return String(reservation.status || '').toUpperCase() === reservationFilter;
                                    });

                                    if (filteredReservations.length === 0) {
                                        return (
                                            <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-200">
                                                    <FiCalendar className="h-8 w-8" />
                                                </div>
                                                <h4 className="mt-5 text-xl font-black text-slate-900">No reservations found</h4>
                                                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                                                    {reservationFilter === 'ALL'
                                                        ? 'Customer reservations will appear here when bookings are created.'
                                                        : `There are no ${reservationFilter.toLowerCase()} reservations right now.`}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                            {filteredReservations.map(reservation => {
                                                const status = String(reservation.status || 'PENDING').toUpperCase();
                                                const reservationDate = reservation.reservation_date || reservation.booking_date;
                                                const isProcessing = reservationActionId === reservation.id;

                                                const statusStyle = status === 'CONFIRMED'
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                    : status === 'CANCELLED'
                                                        ? 'border-red-200 bg-red-50 text-red-700'
                                                        : 'border-amber-200 bg-amber-50 text-amber-700';

                                                return (
                                                    <article
                                                        key={reservation.id}
                                                        className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
                                                    >
                                                        <div className={`h-1.5 ${status === 'CONFIRMED'
                                                            ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                                            : status === 'CANCELLED'
                                                                ? 'bg-gradient-to-r from-red-500 to-rose-500'
                                                                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                            }`} />

                                                        <div className="p-5 sm:p-6">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex min-w-0 items-start gap-3">
                                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                                                                        <FiUsers className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="truncate text-lg font-black text-slate-900">
                                                                            {reservation.customer_name || reservation.customer?.full_name || `Customer #${reservation.customer_id || '-'}`}
                                                                        </h4>
                                                                        <p className="mt-1 text-xs font-semibold text-slate-400">
                                                                            Reservation #{reservation.id}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <span className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusStyle}`}>
                                                                    {status.replaceAll('_', ' ')}
                                                                </span>
                                                            </div>

                                                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date & Time</p>
                                                                    <p className="mt-2 flex items-start gap-2 text-sm font-bold text-slate-800">
                                                                        <FiClock className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                                                                        {formatReservationDate(reservationDate)}
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Party Size</p>
                                                                    <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                                                                        <FiUsers className="h-4 w-4 text-violet-500" />
                                                                        {Number(reservation.guests || 0)} {Number(reservation.guests || 0) === 1 ? 'guest' : 'guests'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {(reservation.phone || reservation.customer_phone) && (
                                                                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
                                                                    <FiPhone className="h-4 w-4 text-slate-400" />
                                                                    {reservation.phone || reservation.customer_phone}
                                                                </p>
                                                            )}

                                                            {reservation.notes && (
                                                                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Customer Note</p>
                                                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-blue-800">
                                                                        {reservation.notes}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {status === 'PENDING' && (
                                                                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateReservationStatus(reservation.id, 'cancel')}
                                                                        disabled={isProcessing}
                                                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        {isProcessing ? (
                                                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                                                        ) : (
                                                                            <FiXCircle className="h-4 w-4" />
                                                                        )}
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateReservationStatus(reservation.id, 'confirm')}
                                                                        disabled={isProcessing}
                                                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 text-sm font-black text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-green-600 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                                                                    >
                                                                        {isProcessing ? (
                                                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                                        ) : (
                                                                            <FiCheckCircle className="h-4 w-4" />
                                                                        )}
                                                                        Confirm
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ---------- STAFF TAB ---------- */}
                        {activeTab === 'staff' && (
                            <div className="animate-in fade-in space-y-7">
                                {/* Header */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                            <FiUsers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight text-slate-900">Staff Management</h3>
                                            <p className="mt-1 text-sm font-medium text-slate-500">
                                                Manage employees, shifts, attendance and performance reviews.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => fetchStaffList()}
                                        disabled={staffLoading}
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    >
                                        <FiRefreshCw className={`h-4 w-4 ${staffLoading ? 'animate-spin' : ''}`} />
                                        {staffLoading ? 'Refreshing...' : 'Refresh Staff'}
                                    </button>
                                </div>

                                {/* Summary cards */}
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Staff</p>
                                        <p className="mt-2 text-3xl font-black text-slate-900">{staffList.length}</p>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Selected</p>
                                        <p className="mt-2 truncate text-lg font-black text-emerald-800">{selectedStaff?.name || 'None'}</p>
                                    </div>
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Shifts Loaded</p>
                                        <p className="mt-2 text-3xl font-black text-blue-700">{shifts.length}</p>
                                    </div>
                                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">Avg Rating</p>
                                        <p className="mt-2 text-3xl font-black text-violet-700">
                                            {perfSummary?.average_rating !== null && perfSummary?.average_rating !== undefined
                                                ? Number(perfSummary.average_rating).toFixed(1)
                                                : '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Add staff */}
                                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
                                    <div className="mb-5">
                                        <h4 className="text-lg font-black text-slate-900">Add Staff Member</h4>
                                        <p className="mt-1 text-xs text-slate-500">Create a new employee profile for this restaurant.</p>
                                    </div>

                                    <form onSubmit={handleAddStaff} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Name *</label>
                                            <input
                                                value={staffForm.name}
                                                onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                                                placeholder="Employee name"
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Email *</label>
                                            <input
                                                type="email"
                                                value={staffForm.email}
                                                onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                                                placeholder="name@example.com"
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Phone</label>
                                            <input
                                                type="tel"
                                                value={staffForm.phone}
                                                onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                                                placeholder="9876543210"
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Role *</label>
                                            <input
                                                value={staffForm.role}
                                                onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                                                placeholder="Chef, Waiter, Cashier..."
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Hire Date</label>
                                            <input
                                                type="date"
                                                value={staffForm.hire_date}
                                                onChange={e => setStaffForm({ ...staffForm, hire_date: e.target.value })}
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                            />
                                        </div>

                                        <div className="md:col-span-2 xl:col-span-5 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={staffSubmitting}
                                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
                                            >
                                                {staffSubmitting ? (
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                ) : (
                                                    <FiPlus className="h-4 w-4" />
                                                )}
                                                {staffSubmitting ? 'Adding...' : 'Add Staff'}
                                            </button>
                                        </div>
                                    </form>
                                </section>

                                {/* Staff list */}
                                <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                                    <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                                        <h4 className="text-lg font-black text-slate-900">Staff Members</h4>
                                        <p className="mt-1 text-xs text-slate-500">Select a staff member to manage shifts, attendance and performance.</p>
                                    </div>

                                    {staffLoading && staffList.length === 0 ? (
                                        <div className="space-y-3 p-5">
                                            {[1, 2, 3].map(item => (
                                                <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                                            ))}
                                        </div>
                                    ) : staffList.length === 0 ? (
                                        <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
                                            <FiUsers className="h-9 w-9 text-slate-300" />
                                            <p className="mt-3 text-sm font-semibold text-slate-500">No staff members added yet.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                        <th className="px-5 py-3">Name</th>
                                                        <th className="px-5 py-3">Role</th>
                                                        <th className="px-5 py-3">Email</th>
                                                        <th className="px-5 py-3">Phone</th>
                                                        <th className="px-5 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {staffList.map(staff => {
                                                        const isSelected = String(selectedStaff?.id) === String(staff.id);
                                                        const isDeleting = String(deletingStaffId) === String(staff.id);
                                                        return (
                                                            <tr key={staff.id} className={`transition ${isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}>
                                                                <td className="px-5 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                                                                            {String(staff.name || 'S').trim().charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-black text-slate-900">{staff.name || 'Unnamed Staff'}</p>
                                                                            {staff.hire_date && <p className="mt-0.5 text-[10px] font-medium text-slate-400">Joined {staff.hire_date}</p>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-4">
                                                                    <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                                                                        {staff.role || 'Staff'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-5 py-4 text-slate-600">{staff.email || '—'}</td>
                                                                <td className="px-5 py-4 text-slate-600">{staff.phone || '—'}</td>
                                                                <td className="px-5 py-4">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSelectStaff(staff)}
                                                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                                                                        >
                                                                            View
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteStaff(staff)}
                                                                            disabled={isDeleting}
                                                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            {isDeleting ? (
                                                                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                                                            ) : (
                                                                                <FiTrash2 className="h-3.5 w-3.5" />
                                                                            )}
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>

                                {/* Selected staff details */}
                                {selectedStaff && (
                                    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                                        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-900 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">Staff Details</p>
                                                <h4 className="mt-1 text-2xl font-black">{selectedStaff.name}</h4>
                                                <p className="mt-1 text-sm font-medium text-slate-400">{selectedStaff.role || 'Staff member'}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedStaff(null);
                                                    setShifts([]);
                                                    setAttendance([]);
                                                    setPerfReviews([]);
                                                    setPerfSummary(null);
                                                }}
                                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"
                                            >
                                                <FiX className="h-4 w-4" /> Close Details
                                            </button>
                                        </div>

                                        {staffDetailsLoading ? (
                                            <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2 sm:p-6">
                                                {[1, 2, 3].map(item => <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}
                                            </div>
                                        ) : (
                                            <div className="space-y-6 p-5 sm:p-6">
                                                {/* Shifts */}
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                                                    <div className="mb-4 flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                            <FiCalendar className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-black text-slate-900">Shift Scheduling</h5>
                                                            <p className="text-xs text-slate-500">Create and review employee shifts.</p>
                                                        </div>
                                                    </div>

                                                    <form onSubmit={handleAddShift} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                                        <input
                                                            type="date"
                                                            value={shiftForm.date}
                                                            onChange={e => setShiftForm({ ...shiftForm, staff_id: String(selectedStaff.id), date: e.target.value })}
                                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={shiftForm.start_time}
                                                            onChange={e => setShiftForm({ ...shiftForm, staff_id: String(selectedStaff.id), start_time: e.target.value })}
                                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={shiftForm.end_time}
                                                            onChange={e => setShiftForm({ ...shiftForm, staff_id: String(selectedStaff.id), end_time: e.target.value })}
                                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={shiftSubmitting}
                                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
                                                        >
                                                            {shiftSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FiPlus className="h-4 w-4" />}
                                                            Add Shift
                                                        </button>
                                                    </form>

                                                    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                                        {shifts.length === 0 ? (
                                                            <p className="p-5 text-center text-sm font-medium text-slate-500">No shifts found for this staff member.</p>
                                                        ) : (
                                                            <table className="min-w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                        <th className="px-4 py-3">Date</th>
                                                                        <th className="px-4 py-3">Start</th>
                                                                        <th className="px-4 py-3">End</th>
                                                                        <th className="px-4 py-3">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {shifts.map(shift => (
                                                                        <tr key={shift.id}>
                                                                            <td className="px-4 py-3 font-bold text-slate-800">{shift.date || '—'}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{shift.start_time || '—'}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{shift.end_time || '—'}</td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                                                    {String(shift.status || 'SCHEDULED').replaceAll('_', ' ')}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Attendance + Performance */}
                                                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                                    <div className="rounded-2xl border border-slate-200 p-5">
                                                        <div className="mb-4">
                                                            <h5 className="font-black text-slate-900">Today's Attendance</h5>
                                                            <p className="mt-1 text-xs text-slate-500">Mark the current attendance status.</p>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[
                                                                { status: 'present', label: 'Present', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                                                                { status: 'absent', label: 'Absent', cls: 'border-red-200 bg-red-50 text-red-700' },
                                                                { status: 'late', label: 'Late', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
                                                            ].map(option => (
                                                                <button
                                                                    key={option.status}
                                                                    type="button"
                                                                    onClick={() => handleMarkAttendance(selectedStaff.id, option.status)}
                                                                    disabled={Boolean(attendanceAction)}
                                                                    className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-xs font-black transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${option.cls}`}
                                                                >
                                                                    {attendanceAction === option.status ? 'Marking...' : option.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <h6 className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Attendance History</h6>
                                                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                                                            {attendance.length === 0 ? (
                                                                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No attendance records yet.</p>
                                                            ) : attendance.map(record => (
                                                                <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800">{record.date || 'Date unavailable'}</p>
                                                                        {record.check_in && (
                                                                            <p className="mt-0.5 text-[10px] text-slate-400">Check in: {formatDate(record.check_in)}</p>
                                                                        )}
                                                                    </div>
                                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${String(record.status || '').toLowerCase() === 'present'
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : String(record.status || '').toLowerCase() === 'absent'
                                                                            ? 'bg-red-50 text-red-700'
                                                                            : 'bg-amber-50 text-amber-700'
                                                                        }`}>
                                                                        {record.status || 'Unknown'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-2xl border border-slate-200 p-5">
                                                        <div className="mb-4">
                                                            <h5 className="font-black text-slate-900">Performance</h5>
                                                            <p className="mt-1 text-xs text-slate-500">Record ratings and review performance history.</p>
                                                        </div>

                                                        {perfSummary && (
                                                            <div className="mb-4 grid grid-cols-3 gap-2">
                                                                <div className="rounded-xl bg-violet-50 p-3">
                                                                    <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">Avg Rating</p>
                                                                    <p className="mt-1 text-lg font-black text-violet-800">{perfSummary.average_rating ?? 'N/A'}</p>
                                                                </div>
                                                                <div className="rounded-xl bg-blue-50 p-3">
                                                                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">Completed</p>
                                                                    <p className="mt-1 text-lg font-black text-blue-800">{perfSummary.completed_shifts ?? 0}</p>
                                                                </div>
                                                                <div className="rounded-xl bg-emerald-50 p-3">
                                                                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Present 30d</p>
                                                                    <p className="mt-1 text-lg font-black text-emerald-800">{perfSummary.present_days_last_30 ?? 0}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <form onSubmit={handleAddPerformance} className="space-y-3">
                                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                <input
                                                                    type="date"
                                                                    value={perfForm.date}
                                                                    onChange={e => setPerfForm({ ...perfForm, staff_id: String(selectedStaff.id), date: e.target.value })}
                                                                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="5"
                                                                    step="0.1"
                                                                    value={perfForm.rating}
                                                                    onChange={e => setPerfForm({ ...perfForm, staff_id: String(selectedStaff.id), rating: e.target.value })}
                                                                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
                                                                    placeholder="Rating 1-5"
                                                                />
                                                            </div>
                                                            <textarea
                                                                rows={2}
                                                                value={perfForm.notes}
                                                                onChange={e => setPerfForm({ ...perfForm, staff_id: String(selectedStaff.id), notes: e.target.value })}
                                                                placeholder="Performance notes (optional)"
                                                                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={performanceSubmitting}
                                                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-60"
                                                            >
                                                                {performanceSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FiStar className="h-4 w-4" />}
                                                                {performanceSubmitting ? 'Saving...' : 'Save Review'}
                                                            </button>
                                                        </form>

                                                        <h6 className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Review History</h6>
                                                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                                                            {perfReviews.length === 0 ? (
                                                                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No performance reviews yet.</p>
                                                            ) : perfReviews.map(review => (
                                                                <div key={review.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <p className="text-sm font-bold text-slate-800">{review.date || 'Date unavailable'}</p>
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
                                                                            <FiStar className="h-3 w-3" /> {Number(review.rating || 0).toFixed(1)}
                                                                        </span>
                                                                    </div>
                                                                    {review.notes && <p className="mt-2 text-xs leading-5 text-slate-500">{review.notes}</p>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                )}
                            </div>
                        )}

                        {/* ---------- Profile Tab ---------- */}
                        {activeTab === 'profile' && (

                            <div className="animate-in fade-in">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Update Profile</h3>
                                <form onSubmit={handleProfileUpdate} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
                                            <input value={form.name || restaurant.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50" required />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                            <textarea value={form.description || restaurant.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50" rows={1} />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Opening Time</label>
                                            <input type="time" value={form.opening_time || restaurant.opening_time || ''} onChange={e => setForm({ ...form, opening_time: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50" />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Closing Time</label>
                                            <input type="time" value={form.closing_time || restaurant.closing_time || ''} onChange={e => setForm({ ...form, closing_time: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50" />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Delivery Radius (km)</label>
                                            <input type="number" step="0.1" value={form.delivery_radius_km || restaurant.delivery_radius_km} onChange={e => setForm({ ...form, delivery_radius_km: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50" />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">GST Number</label>
                                            <input value={form.gst_number || restaurant.gst_number || ''} onChange={e => setForm({ ...form, gst_number: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50" />
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100 mt-2">
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Update GST Document <span className="text-slate-400 font-normal">(optional)</span></label>
                                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setForm({ ...form, gst_doc: e.target.files[0] })} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition cursor-pointer" />
                                                {restaurant.gst_doc_path && <p className="mt-2 text-xs text-blue-600 truncate"><a href={`http://localhost:8000/${restaurant.gst_doc_path}`} target="_blank" rel="noreferrer" className="underline">View Current GST</a></p>}
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Update License Document <span className="text-slate-400 font-normal">(optional)</span></label>
                                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setForm({ ...form, license_doc: e.target.files[0] })} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition cursor-pointer" />
                                                {restaurant.license_doc_path && <p className="mt-2 text-xs text-blue-600 truncate"><a href={`http://localhost:8000/${restaurant.license_doc_path}`} target="_blank" rel="noreferrer" className="underline">View Current License</a></p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <button type="submit" disabled={isSubmitting} className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-bold text-white shadow-md shadow-blue-200 transition duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60">
                                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ---------- Cuisines Tab ---------- */}
                        {activeTab === 'cuisines' && (
                            <div className="animate-in fade-in">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Manage Cuisines</h3>
                                <div className="flex flex-wrap gap-2 mb-8 p-4 bg-slate-50 border border-slate-100 rounded-2xl min-h-[80px]">
                                    {!restaurant.cuisines || restaurant.cuisines.length === 0 ? (
                                        <span className="text-sm text-slate-400 flex items-center justify-center w-full">No cuisines added yet.</span>
                                    ) : (
                                        restaurant.cuisines.map(c => (
                                            <span key={c.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700">
                                                {c.name}
                                                <button onClick={() => handleRemoveCuisine(c.id)} className="text-slate-400 hover:text-red-500 transition ml-1" title="Remove">
                                                    <FiXCircle className="w-4 h-4" />
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        value={cuisineInput}
                                        onChange={e => setCuisineInput(e.target.value)}
                                        placeholder="Add a new cuisine (e.g., Italian, Mexican)"
                                        className="h-11 w-full sm:max-w-xs rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCuisine(); }}
                                    />
                                    <button onClick={handleAddCuisine} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">
                                        <FiPlus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ---------- Images Tab ---------- */}
                        {activeTab === 'images' && (
                            <div className="animate-in fade-in">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Restaurant Gallery</h3>

                                {!restaurant.images || restaurant.images.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 mb-8">
                                        <FiImage className="h-10 w-10 text-slate-300 mb-3" />
                                        <p className="text-slate-500 text-sm font-medium">No images uploaded yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                                        {restaurant.images.map(img => (
                                            <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-100">
                                                <img src={`http://localhost:8000/${img.image_path}`} alt="Restaurant" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2 gap-1.5">
                                                    {!img.is_primary && (
                                                        <button onClick={() => handleSetPrimary(img.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 hover:text-amber-500 transition shadow-sm backdrop-blur-sm" title="Set as primary">
                                                            <FiStar className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteImage(img.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 hover:text-red-500 transition shadow-sm backdrop-blur-sm" title="Delete image">
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {img.is_primary && (
                                                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                                                        <FiStar className="w-3 h-3 fill-current" /> Primary
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-slate-100 pt-6">
                                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Upload New Image</h4>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex-1 w-full">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setImageFile(e.target.files[0])}
                                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 file:border file:border-slate-200 hover:file:bg-slate-100 transition cursor-pointer"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                            <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                                            <span className="text-sm font-medium text-slate-700">Set as Primary</span>
                                        </label>
                                        <button
                                            onClick={handleImageUpload}
                                            disabled={!imageFile || isSubmitting}
                                            className="flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 shrink-0"
                                        >
                                            <FiUpload className="w-4 h-4" />
                                            {isSubmitting ? 'Uploading...' : 'Upload'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ---------- Menu Tab ---------- */}
                        {activeTab === 'menu' && (
                            <div className="animate-in fade-in space-y-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Menu Management</h3>

                                <form onSubmit={handleCreateMenu} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                                    <div className="flex-1 relative w-full">
                                        <input
                                            type="text"
                                            placeholder="New menu name (e.g., Lunch Menu)"
                                            value={menuForm.name}
                                            onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                                            className="h-11 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-white"
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 bg-white px-4 border border-slate-200 rounded-xl w-full sm:w-auto h-11">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={menuForm.is_active}
                                                onChange={e => setMenuForm({ ...menuForm, is_active: e.target.checked })}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-bold text-slate-700">Active</span>
                                        </label>
                                    </div>
                                    <button type="submit" className="h-11 bg-slate-900 text-white px-6 rounded-xl text-sm font-bold shadow-md transition-all hover:bg-slate-800 active:scale-95 w-full sm:w-auto shrink-0">
                                        Create Menu
                                    </button>
                                </form>

                                {!menus || menus.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                                        <div className="h-16 w-16 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-slate-300">
                                            <FiFileText className="h-6 w-6" />
                                        </div>
                                        <p className="text-slate-900 font-bold text-lg">No menus created yet.</p>
                                        <p className="text-slate-500 text-sm font-medium mt-1">Start by creating a menu container (e.g. Lunch).</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {menus?.map(menu => (
                                            <div key={menu.id} className={`border rounded-[2rem] overflow-hidden transition-all duration-300 ${selectedMenuId === menu.id ? 'border-slate-300 shadow-lg' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                                                <div
                                                    className="flex justify-between items-center bg-white p-5 sm:p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                    onClick={() => setSelectedMenuId(selectedMenuId === menu.id ? null : menu.id)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${selectedMenuId === menu.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {selectedMenuId === menu.id ? <FiChevronUp /> : <FiChevronDown />}
                                                        </div>
                                                        <div>
                                                            <span className="font-black text-slate-900 text-lg mr-3">{menu.name}</span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${menu.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                                {menu.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => { setEditingMenuId(menu.id); setMenuForm({ name: menu.name, is_active: menu.is_active }); }} className="flex items-center justify-center h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition" title="Edit Menu"><FiEdit2 size={16} /></button>
                                                        <button onClick={() => handleDeleteMenu(menu.id)} className="flex items-center justify-center h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="Delete Menu"><FiTrash2 size={16} /></button>
                                                    </div>
                                                </div>

                                                {editingMenuId === menu.id && (
                                                    <div className="p-5 bg-slate-50 border-t border-slate-200">
                                                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateMenu(menu.id, menuForm); }} className="flex flex-col sm:flex-row gap-3">
                                                            <input value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} className="h-11 border border-slate-200 rounded-xl px-4 flex-1 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-white" required />
                                                            <div className="flex items-center gap-4 bg-white px-4 border border-slate-200 rounded-xl h-11">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input type="checkbox" checked={menuForm.is_active} onChange={e => setMenuForm({ ...menuForm, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                                    <span className="text-sm font-bold text-slate-700">Active</span>
                                                                </label>
                                                            </div>
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                <button type="submit" className="flex-1 sm:flex-none h-11 bg-blue-600 text-white px-6 rounded-xl text-sm font-bold shadow-md transition-all hover:bg-blue-700 active:scale-95">Save</button>
                                                                <button type="button" onClick={() => setEditingMenuId(null)} className="flex-1 sm:flex-none h-11 bg-slate-200 text-slate-700 px-6 rounded-xl text-sm font-bold transition-all hover:bg-slate-300 active:scale-95">Cancel</button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}

                                                {selectedMenuId === menu.id && (
                                                    <div className="p-5 sm:p-8 bg-slate-50 border-t border-slate-200">
                                                        {(!menu.categories || menu.categories.length === 0) && (
                                                            <div className="text-center py-6 text-slate-400 font-medium text-sm border-2 border-dashed border-slate-200 rounded-2xl bg-white mb-6">
                                                                No categories added to this menu yet.
                                                            </div>
                                                        )}
                                                        {menu.categories?.map(cat => (
                                                            <div key={cat.id} className="mb-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                                                                <div className="flex justify-between items-center bg-slate-50 p-4 sm:px-6 border-b border-slate-200">
                                                                    {editingCategoryId === cat.id ? (
                                                                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateCategory(cat.id, categoryForm); }} className="flex w-full gap-2 items-center flex-wrap">
                                                                            <input value={categoryForm.name} onChange={e => setCategoryForm({ name: e.target.value })} className="h-10 border border-slate-300 rounded-xl px-4 flex-1 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 bg-white" required />
                                                                            <button type="submit" className="h-10 bg-blue-600 text-white px-5 rounded-xl text-sm font-bold shadow-sm active:scale-95">Save</button>
                                                                            <button type="button" onClick={() => setEditingCategoryId(null)} className="h-10 bg-slate-200 text-slate-700 px-5 rounded-xl text-sm font-bold active:scale-95">Cancel</button>
                                                                        </form>
                                                                    ) : (
                                                                        <>
                                                                            <span className="font-black text-slate-900 text-lg flex items-center gap-2">
                                                                                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                                                                {cat.name}
                                                                            </span>
                                                                            <div className="flex gap-1">
                                                                                <button onClick={() => { setEditingCategoryId(cat.id); setCategoryForm({ name: cat.name }); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Category"><FiEdit2 size={16} /></button>
                                                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Category"><FiTrash2 size={16} /></button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                <div className="p-2 sm:p-4 flex flex-col gap-2">
                                                                    {(!cat.items || cat.items.length === 0) && (
                                                                        <p className="text-sm font-medium text-slate-400 text-center py-4">No items in this category.</p>
                                                                    )}
                                                                    {cat.items?.map(item => (
                                                                        <div key={item.id} className="group">
                                                                            {editingItemId === item.id ? (
                                                                                <form onSubmit={(e) => { e.preventDefault(); handleUpdateItem(item.id, itemForm); }} className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200">
                                                                                    <div className="sm:col-span-5"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label><input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="h-11 w-full border border-slate-200 rounded-xl px-3 text-sm font-medium bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none" required /></div>
                                                                                    <div className="sm:col-span-7"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label><input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} className="h-11 w-full border border-slate-200 rounded-xl px-3 text-sm font-medium bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none" /></div>
                                                                                    <div className="sm:col-span-3"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Price (₹)</label><input type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} className="h-11 w-full border border-slate-200 rounded-xl px-3 text-sm font-medium bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none" required /></div>
                                                                                    <div className="sm:col-span-5 flex items-end pb-1 gap-4 px-2">
                                                                                        <label className="flex items-center gap-2 text-sm cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-xl w-full justify-center shadow-sm"><input type="checkbox" checked={itemForm.is_veg} onChange={e => setItemForm({ ...itemForm, is_veg: e.target.checked })} className="rounded text-green-500 h-4 w-4 border-slate-300" /> <span className="font-bold text-slate-700">Veg</span></label>
                                                                                        <label className="flex items-center gap-2 text-sm cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-xl w-full justify-center shadow-sm"><input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })} className="rounded text-blue-500 h-4 w-4 border-slate-300" /> <span className="font-bold text-slate-700">Available</span></label>
                                                                                    </div>
                                                                                    <div className="sm:col-span-4 flex items-end justify-end gap-2 mt-2 sm:mt-0 pb-1">
                                                                                        <button type="submit" className="h-11 flex-1 bg-blue-600 text-white px-4 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">Save</button>
                                                                                        <button type="button" onClick={() => setEditingItemId(null)} className="h-11 flex-1 bg-slate-200 text-slate-700 px-4 rounded-xl text-sm font-bold hover:bg-slate-300 active:scale-95 transition-all">Cancel</button>
                                                                                    </div>
                                                                                </form>
                                                                            ) : (
                                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50 hover:shadow-sm transition-all gap-4">
                                                                                    <div className="flex items-start gap-4">
                                                                                        <div className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 ${item.is_veg ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'}`} title={item.is_veg ? 'Veg' : 'Non-Veg'}>
                                                                                            <div className={`h-1.5 w-1.5 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="font-black text-slate-900 text-base">{item.name}</p>
                                                                                            {item.description && <p className="text-xs font-medium text-slate-500 mt-1 max-w-md leading-relaxed">{item.description}</p>}
                                                                                            <p className="text-sm font-black text-slate-800 mt-2">₹{item.price}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 w-full sm:w-auto">
                                                                                        <button onClick={() => toggleAvailability(item)} title={item.is_available ? 'Mark Unavailable' : 'Mark Available'} className="flex items-center justify-center w-full sm:w-auto gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm">
                                                                                            {item.is_available ? (
                                                                                                <><FiToggleRight className="text-emerald-500 w-5 h-5" /> <span className="text-xs font-bold text-slate-600">In Stock</span></>
                                                                                            ) : (
                                                                                                <><FiToggleLeft className="text-slate-400 w-5 h-5" /> <span className="text-xs font-bold text-slate-400">Out of Stock</span></>
                                                                                            )}
                                                                                        </button>
                                                                                        <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1" />
                                                                                        <div className="flex gap-1 w-full sm:w-auto mt-2 sm:mt-0">
                                                                                            <button onClick={() => toggleAddonSection(item.id)} className={`flex-1 sm:flex-none flex items-center justify-center text-xs font-bold px-4 py-2 rounded-xl transition border shadow-sm ${expandedAddonItemId === item.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Add-ons</button>
                                                                                            <button onClick={() => { setEditingItemId(item.id); setItemForm({ name: item.name, description: item.description || '', price: item.price.toString(), is_veg: item.is_veg, is_available: item.is_available }); }} className="flex-1 sm:flex-none flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 shadow-sm rounded-xl transition" title="Edit Item"><FiEdit2 size={14} /></button>
                                                                                            <button onClick={() => handleDeleteItem(item.id)} className="flex-1 sm:flex-none flex items-center justify-center p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 shadow-sm rounded-xl transition" title="Delete Item"><FiTrash2 size={14} /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Addons Section */}
                                                                            {expandedAddonItemId === item.id && (
                                                                                <div className="ml-0 sm:ml-10 mt-3 mb-6 p-5 sm:p-6 bg-slate-100/50 border border-slate-200 rounded-2xl shadow-inner">
                                                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                                                        <FiPlusCircle /> Add-ons for {item.name}
                                                                                    </h5>
                                                                                    {addons.length === 0 ? (
                                                                                        <p className="text-xs font-medium text-slate-400 italic mb-4 p-4 bg-white rounded-xl border border-slate-100 text-center">No add-ons created for this item yet.</p>
                                                                                    ) : (
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                                                                                            {addons.map(addon => (
                                                                                                <div key={addon.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                                                                                                    <span className="text-sm font-bold text-slate-800">{addon.name} <span className="text-blue-600 ml-1 font-black">+₹{addon.price.toFixed(2)}</span></span>
                                                                                                    <div className="flex gap-1 border-l border-slate-100 pl-2">
                                                                                                        <button onClick={() => { setEditingAddonId(addon.id); setAddonForm({ name: addon.name, price: addon.price.toString() }); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><FiEdit2 size={14} /></button>
                                                                                                        <button onClick={() => handleDeleteAddon(addon.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><FiTrash2 size={14} /></button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                    <form onSubmit={(e) => {
                                                                                        if (editingAddonId) { e.preventDefault(); handleUpdateAddon(editingAddonId, { name: addonForm.name, price: parseFloat(addonForm.price) || 0 }); }
                                                                                        else { handleAddAddon(item.id, e); }
                                                                                    }} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                                                        <input placeholder="Add-on Name (e.g. Extra Cheese)" value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium flex-1 w-full outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all" required />
                                                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                                                            <input type="number" step="0.01" placeholder="Price (₹)" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: e.target.value })} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium w-full sm:w-32 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all" required />
                                                                                            <button type="submit" className="h-11 bg-slate-900 text-white px-6 text-sm font-bold rounded-xl shadow-md hover:bg-slate-800 transition active:scale-95 shrink-0">{editingAddonId ? 'Update' : 'Add'}</button>
                                                                                            {editingAddonId && <button type="button" onClick={() => { setEditingAddonId(null); setAddonForm({ name: '', price: '' }); }} className="h-11 bg-slate-200 text-slate-700 px-4 text-sm font-bold rounded-xl hover:bg-slate-300 transition active:scale-95">Cancel</button>}
                                                                                        </div>
                                                                                    </form>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}

                                                                    {selectedCategoryForItem === cat.id ? (
                                                                        <form onSubmit={(e) => handleCreateItem(cat.id, e)} className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-5 sm:p-6 bg-slate-900 text-white rounded-2xl mt-4 shadow-lg animate-in slide-in-from-top-2">
                                                                            <div className="sm:col-span-12 mb-1 flex items-center justify-between border-b border-slate-700 pb-3">
                                                                                <p className="text-sm font-black flex items-center gap-2"><FiPlusCircle className="text-blue-400" /> Add New Item to {cat.name}</p>
                                                                                <button type="button" onClick={() => setSelectedCategoryForItem(null)} className="text-slate-400 hover:text-white transition"><FiX size={18} /></button>
                                                                            </div>
                                                                            <div className="sm:col-span-5"><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Name</label><input placeholder="E.g. Garlic Bread" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="h-11 w-full border border-slate-700 bg-slate-800 rounded-xl px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder:text-slate-500 transition-all" required /></div>
                                                                            <div className="sm:col-span-7"><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description (Optional)</label><input placeholder="Brief details about the dish..." value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} className="h-11 w-full border border-slate-700 bg-slate-800 rounded-xl px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder:text-slate-500 transition-all" /></div>
                                                                            <div className="sm:col-span-3"><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Price</label><input type="number" step="0.01" placeholder="₹ 0.00" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} className="h-11 w-full border border-slate-700 bg-slate-800 rounded-xl px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder:text-slate-500 transition-all" required /></div>
                                                                            <div className="sm:col-span-5 flex items-end pb-1 gap-4 px-2">
                                                                                <label className="flex items-center gap-2 text-sm cursor-pointer font-bold text-slate-300 bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 w-full justify-center transition-colors hover:bg-slate-700"><input type="checkbox" checked={itemForm.is_veg} onChange={e => setItemForm({ ...itemForm, is_veg: e.target.checked })} className="rounded text-green-500 h-4 w-4 border-slate-600 focus:ring-green-500 bg-slate-900" /> Veg</label>
                                                                                <label className="flex items-center gap-2 text-sm cursor-pointer font-bold text-slate-300 bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 w-full justify-center transition-colors hover:bg-slate-700"><input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })} className="rounded text-blue-500 h-4 w-4 border-slate-600 focus:ring-blue-500 bg-slate-900" /> Available</label>
                                                                            </div>
                                                                            <div className="sm:col-span-4 flex items-end justify-end mt-3 sm:mt-0 pb-1">
                                                                                <button type="submit" className="h-11 w-full bg-blue-600 text-white px-6 rounded-xl text-sm font-bold shadow-md hover:bg-blue-500 transition-all active:scale-95">Save Item</button>
                                                                            </div>
                                                                        </form>
                                                                    ) : (
                                                                        <button onClick={() => { setSelectedCategoryForItem(cat.id); setItemForm({ name: '', description: '', price: '', is_veg: true, is_available: true }); }} className="flex items-center justify-center gap-2 h-12 mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 text-sm font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm transition-all w-full group active:scale-95">
                                                                            <FiPlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" /> Add New Item to {cat.name}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <div className="mt-8 pt-8 border-t border-slate-200/60">
                                                            <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><FiLayers className="text-blue-500" /> Add New Category</h4>
                                                            <form onSubmit={(e) => handleCreateCategory(menu.id, e)} className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                                                <input placeholder="E.g. Starters, Main Course, Beverages..." value={categoryForm.name} onChange={e => setCategoryForm({ name: e.target.value })} className="h-12 border border-slate-200 bg-slate-50 rounded-xl px-5 flex-1 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white" required />
                                                                <button type="submit" className="h-12 bg-slate-900 text-white px-8 rounded-xl text-sm font-bold shadow-md transition-all hover:bg-slate-800 active:scale-95 flex items-center justify-center gap-2 shrink-0"><FiPlus /> Add Category</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ---------- Combos Tab ---------- */}
                        {activeTab === 'combos' && (
                            <div className="animate-in fade-in space-y-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manage Combo Meals</h3>

                                <form onSubmit={(e) => { e.preventDefault(); editingComboId ? handleUpdateCombo(editingComboId) : handleCreateCombo(e); }} className="p-6 sm:p-8 bg-slate-50 border border-slate-100 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                                    <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-200 pb-4">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FiLayers /></div>
                                        {editingComboId ? 'Edit Combo Meal' : 'Create New Combo'}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Combo Name</label>
                                            <input value={comboForm.name} onChange={e => setComboForm({ ...comboForm, name: e.target.value })} className="h-12 w-full border border-slate-200 rounded-2xl px-4 text-sm font-medium outline-none bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" required placeholder="e.g. Family Feast" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Combo Price (₹)</label>
                                            <input type="number" step="0.01" value={comboForm.combo_price} onChange={e => setComboForm({ ...comboForm, combo_price: e.target.value })} className="h-12 w-full border border-slate-200 rounded-2xl px-4 text-sm font-medium outline-none bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" required placeholder="599.00" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Description (Optional)</label>
                                            <textarea value={comboForm.description} onChange={e => setComboForm({ ...comboForm, description: e.target.value })} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" rows={2} placeholder="What's included in this combo?" />
                                        </div>
                                    </div>
                                    <div className="mb-8">
                                        <label className="block text-sm font-bold text-slate-700 mb-4">Select Items for Combo</label>
                                        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            {comboForm.items.map((item, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-slate-50 p-3 border border-slate-100 rounded-xl">
                                                    <div className="flex-1 w-full">
                                                        <select value={item.food_item_id} onChange={e => updateComboItem(idx, 'food_item_id', e.target.value)} className="h-11 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white" required>
                                                            <option value="">Select a Food Item from your menu...</option>
                                                            {allFoodItems?.map(fi => <option key={fi.id} value={fi.id}>{fi.name} (₹{fi.price})</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-3 w-full sm:w-auto items-center justify-end">
                                                        <span className="text-sm font-bold text-slate-400">Qty:</span>
                                                        <input type="number" min="1" value={item.quantity} onChange={e => updateComboItem(idx, 'quantity', e.target.value)} className="h-11 w-20 border border-slate-200 rounded-xl px-3 text-sm font-bold text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white" required />
                                                        {comboForm.items.length > 1 && <button type="button" onClick={() => removeComboItemRow(idx)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition shrink-0 shadow-sm"><FiTrash2 size={16} /></button>}
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={addComboItemRow} className="mt-2 h-11 w-full rounded-xl border-2 border-dashed border-slate-200 bg-white text-sm font-bold text-blue-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"><FiPlusCircle size={16} /> Add another item</button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-6 border-t border-slate-200">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer font-bold text-slate-700 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm mr-auto w-full sm:w-auto justify-center">
                                            <input type="checkbox" checked={comboForm.is_available} onChange={e => setComboForm({ ...comboForm, is_available: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> Mark Available in Menu
                                        </label>
                                        <div className="flex gap-3 w-full sm:w-auto">
                                            {editingComboId && <button type="button" onClick={() => { setEditingComboId(null); setComboForm({ name: '', description: '', combo_price: '', is_available: true, items: [{ food_item_id: '', quantity: 1 }] }); }} className="flex-1 sm:flex-none h-12 bg-white border border-slate-200 text-slate-700 px-6 rounded-xl text-sm font-bold shadow-sm transition hover:bg-slate-50 active:scale-95">Cancel Edit</button>}
                                            <button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60 border border-blue-500">{isSubmitting ? 'Saving...' : (editingComboId ? 'Update Combo' : 'Publish Combo')}</button>
                                        </div>
                                    </div>
                                </form>

                                {!combos || combos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                                        <div className="h-16 w-16 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-slate-300"><FiLayers className="h-6 w-6" /></div>
                                        <p className="text-slate-900 font-bold text-lg">No combo meals created yet.</p>
                                        <p className="text-slate-500 text-sm font-medium mt-1">Bundle items together to offer better value to customers.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {combos?.map(combo => (
                                            <div key={combo.id} className="border border-slate-100 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.02)] rounded-3xl p-6 hover:shadow-md transition-all hover:-translate-y-1 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-black text-xl text-slate-900 flex items-center gap-2 leading-tight">{combo.name}</h4>
                                                        <div className="mt-2">
                                                            {!combo.is_available ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200"><FiToggleLeft /> Unavailable</span> : <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-200"><FiToggleRight /> Available</span>}
                                                        </div>
                                                    </div>
                                                    <p className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(combo.combo_price)}</p>
                                                </div>
                                                {combo.description && <p className="text-sm font-medium text-slate-500 mb-5 leading-relaxed">{combo.description}</p>}
                                                <div className="mt-auto">
                                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Combo Includes:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {combo.items?.map(item => <span key={item.id} className="bg-white border border-slate-200 shadow-sm text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"><span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black">{item.quantity}x</span> {item.food_item_name}</span>)}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 pt-5 border-t border-slate-100 mt-5">
                                                        <button onClick={() => { setEditingComboId(combo.id); setComboForm({ name: combo.name, description: combo.description || '', combo_price: combo.combo_price.toString(), is_available: combo.is_available, items: combo.items?.map(i => ({ food_item_id: i.food_item_id.toString(), quantity: i.quantity })) || [] }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 flex items-center justify-center gap-2 h-10 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition shadow-sm active:scale-95"><FiEdit2 size={14} /> Edit Combo</button>
                                                        <button onClick={async () => { if (window.confirm('Are you sure you want to delete this combo?')) { handleDeleteCombo(combo.id); } }} className="flex-1 flex items-center justify-center gap-2 h-10 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:text-red-600 hover:border-red-300 hover:bg-red-50 rounded-xl transition shadow-sm active:scale-95"><FiTrash2 size={14} /> Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    return null;
};

export default MyRestaurant;