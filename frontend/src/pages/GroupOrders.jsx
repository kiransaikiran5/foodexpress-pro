import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiUsers,
    FiUserPlus,
    FiCopy,
    FiChevronRight,
    FiClock,
    FiShoppingBag
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

const formatDate = (dateString) => {
    if (!dateString) return '-';

    // Parse the date normally without forcing a UTC offset
    const date = new Date(dateString);

    // Fallback just in case the backend sends an unparseable string
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
        OPEN: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        LOCKED: 'bg-amber-50 text-amber-600 border-amber-200',
        ORDERED: 'bg-blue-50 text-blue-600 border-blue-200',
        CANCELLED: 'bg-red-50 text-red-600 border-red-200',
    };

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${config[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {status}
        </span>
    );
};

// ---------- Main Component ----------
const GroupOrders = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchGroups = async () => {
        try {
            const res = await api.get('/group-orders/my');
            setGroups(res.data);
        } catch (err) {
            toast.error('Failed to load group orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleJoin = async () => {
        if (!joinCode.trim()) {
            toast.error('Please enter a share code');
            return;
        }
        setActionLoading(true);
        try {
            await api.post('/group-orders/join', { share_code: joinCode.trim() });
            toast.success('Successfully joined the group!');
            setJoinCode('');
            fetchGroups();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to join group');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        setActionLoading(true);
        // Using restaurant_id 1 as a placeholder/default for group creation initialization
        try {
            await api.post('/group-orders', { restaurant_id: 1 });
            toast.success('New group order created!');
            fetchGroups();
        } catch (err) {
            toast.error('Failed to create group');
        } finally {
            setActionLoading(false);
        }
    };

    const copyToClipboard = (e, code) => {
        e.preventDefault(); // Prevent navigating when clicking the copy button inside the Link
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        toast.success('Share code copied to clipboard!');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading group orders...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiUsers className="text-blue-500" /> Group Orders
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Order together with friends, family, or colleagues.</p>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <button
                        onClick={handleCreateGroup}
                        disabled={actionLoading}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                    >
                        <FiPlus size={18} /> Start New Group
                    </button>

                    <div className="flex items-center w-full lg:w-auto gap-3">
                        <div className="flex items-center gap-4 w-full">
                            <div className="h-10 w-px bg-slate-200 hidden lg:block mx-2" />
                            <input
                                type="text"
                                placeholder="Enter Share Code..."
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                className="h-12 w-full lg:w-48 border border-slate-200 rounded-xl px-4 text-sm font-bold uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-slate-50 focus:bg-white"
                            />
                            <button
                                onClick={handleJoin}
                                disabled={actionLoading || !joinCode.trim()}
                                className="h-12 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                            >
                                <FiUserPlus size={18} /> Join
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                        <div className="h-16 w-16 bg-blue-50 border border-blue-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-blue-500">
                            <FiUsers size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-lg">No Group Orders Yet</p>
                        <p className="text-slate-500 text-sm font-medium mt-1 max-w-sm">Start a new group order or enter a friend's share code above to join theirs.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groups.map(group => (
                            <Link
                                key={group.id}
                                to={`/group-order/${group.id}`}
                                className="block bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all hover:shadow-md hover:-translate-y-0.5 group"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                                    {/* Left Side: Info */}
                                    <div className="flex items-start gap-4 w-full sm:w-auto">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                                            <FiShoppingBag size={24} />
                                        </div>
                                        <div className="flex flex-col justify-center h-14">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-black text-slate-900 text-lg truncate max-w-[200px] sm:max-w-xs">{group.restaurant_name}</h3>
                                                <StatusBadge status={group.status} />
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <span className="flex items-center gap-1"><FiUsers /> {group.members?.length || 0} Members</span>
                                                <span className="flex items-center gap-1"><FiClock /> {formatDate(group.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Total & Code */}
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 mt-2 sm:mt-0">
                                        <div className="text-left sm:text-right">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Group Total</p>
                                            <p className="font-black text-xl text-slate-900">{formatCurrency(group.total_amount)}</p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-0 sm:mt-3">
                                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-3 pr-1 py-1 rounded-xl">
                                                <span className="text-xs font-bold text-slate-500 tracking-widest">{group.share_code}</span>
                                                <button
                                                    onClick={(e) => copyToClipboard(e, group.share_code)}
                                                    className="p-1.5 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm border border-slate-200 transition-colors"
                                                    title="Copy share code"
                                                >
                                                    <FiCopy size={14} />
                                                </button>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                                <FiChevronRight size={18} />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default GroupOrders;