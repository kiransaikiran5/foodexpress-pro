import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/authContext';
import {
    FiCheck,
    FiX,
    FiZap,
    FiShield,
    FiStar,
    FiAlertCircle,
    FiAward,
    FiCalendar,
    FiTrendingUp,
    FiTruck
} from 'react-icons/fi';

// ---------- Helpers ----------
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
};

const getPlanStyles = (name, index) => {
    const lowerName = name.toLowerCase();
    const isPopular = lowerName.includes('gold') || index === 1; // Highlight the middle/gold plan

    if (lowerName.includes('platinum')) {
        return {
            isPopular,
            icon: FiStar,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            cardBorder: isPopular ? 'border-purple-400' : 'border-slate-100',
            button: 'bg-slate-900 hover:bg-black text-white',
            badge: 'bg-purple-100 text-purple-700',
            glow: 'from-purple-400/20 to-fuchsia-400/20'
        };
    }
    if (lowerName.includes('gold')) {
        return {
            isPopular,
            icon: FiShield,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            cardBorder: isPopular ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-100',
            button: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200',
            badge: 'bg-amber-100 text-amber-700',
            glow: 'from-amber-400/20 to-orange-400/20'
        };
    }
    // Default / Silver / Basic
    return {
        isPopular,
        icon: FiZap,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        cardBorder: isPopular ? 'border-blue-400' : 'border-slate-100',
        button: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
        badge: 'bg-blue-100 text-blue-700',
        glow: 'from-blue-400/20 to-cyan-400/20'
    };
};

// ---------- Main Component ----------
const Membership = () => {
    const { user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [myMembership, setMyMembership] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);

    const fetchPlans = async () => {
        try {
            const res = await api.get('/membership/plans');
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to fetch plans', err);
            setError('Could not load plans. Please try again later.');
        }
    };

    const fetchMyMembership = async () => {
        try {
            const res = await api.get('/membership/my');
            setMyMembership(res.data.active_membership);
        } catch {
            setMyMembership(null);
        }
    };

    useEffect(() => {
        const load = async () => {
            await Promise.all([fetchPlans(), fetchMyMembership()]);
            setLoading(false);
        };
        load();
    }, []);

    const handleSubscribe = async (planId) => {
        setProcessingId(planId);
        try {
            await api.post('/membership/subscribe', { plan_id: planId });
            toast.success('Subscribed successfully! Welcome to the club.');
            fetchMyMembership();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Subscription failed');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm tracking-wide">Loading memberships...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-64px)] bg-slate-50 py-8 px-4 sm:px-6 relative overflow-hidden flex flex-col items-center justify-center">

            {/* Soft Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none" />
            <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-[5%] -left-[5%] w-[500px] h-[500px] bg-purple-400/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="max-w-6xl w-full mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">
                        Unlock <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Premium</span> Membership
                    </h1>
                    <p className="text-sm sm:text-base font-medium text-slate-500 max-w-xl mx-auto">
                        Get unlimited free deliveries, massive priority discounts, and VIP customer support.
                    </p>
                </div>

                {/* Compact Horizontal Active Membership Card */}
                {myMembership && (
                    <div className="w-full max-w-4xl mx-auto mb-10 animate-in zoom-in-95 duration-500">
                        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)] overflow-hidden text-white border border-slate-700/50 group flex flex-col md:flex-row items-center justify-between gap-6">

                            {/* Card shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                            {/* Left Side: Identity */}
                            <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                                    <FiAward size={28} className="text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h2 className="text-xl font-black tracking-wide text-white">
                                            {user?.full_name || 'Valued Member'}
                                        </h2>
                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                                            Active
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {myMembership.plan_name} Tier
                                    </p>
                                </div>
                            </div>

                            {/* Right Side: Quick Stats */}
                            <div className="flex flex-wrap items-center gap-6 relative z-10 w-full md:w-auto border-t md:border-t-0 border-slate-700 pt-4 md:pt-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                                        <FiTrendingUp size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Discount</p>
                                        <p className="text-sm font-bold text-white">{myMembership.discount_percent}% Flat</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-purple-400">
                                        <FiTruck size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Delivery</p>
                                        <p className="text-sm font-bold text-white">{myMembership.free_delivery ? 'Free' : 'Standard'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                                        <FiCalendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Renews On</p>
                                        <p className="text-sm font-bold text-white">{formatDate(myMembership.end_date)}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Error handling */}
                {error && (
                    <div className="max-w-xl mx-auto bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8 flex items-start gap-3 shadow-sm w-full">
                        <FiAlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p className="font-semibold text-sm">{error}</p>
                    </div>
                )}

                {/* Plans Grid */}
                {!error && plans.length === 0 && !loading && (
                    <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl shadow-sm max-w-xl mx-auto w-full">
                        <FiZap className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm font-medium">No membership plans are currently available.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-center max-w-5xl mx-auto w-full relative z-10">
                    {plans.map((plan, index) => {
                        const style = getPlanStyles(plan.name, index);
                        const Icon = style.icon;
                        const isCurrentPlan = myMembership?.plan_name === plan.name;
                        const isSubscribedToOther = !!myMembership && !isCurrentPlan;

                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col bg-white rounded-3xl p-6 sm:p-7 transition-all duration-300 group ${style.isPopular ? 'md:-translate-y-2 shadow-[0_15px_30px_rgba(0,0,0,0.06)] z-10' : 'shadow-[0_4px_15px_rgba(0,0,0,0.02)]'
                                    } border-2 ${style.cardBorder}`}
                            >
                                {/* Subtle background glow on hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${style.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl -z-10 blur-xl`} />

                                {/* "Most Popular" Ribbon */}
                                {style.isPopular && !isCurrentPlan && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${style.badge}`}>
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                {/* "Current Plan" Ribbon */}
                                {isCurrentPlan && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md bg-slate-900 text-white">
                                            Current Plan
                                        </span>
                                    </div>
                                )}

                                {/* Card Header */}
                                <div className="mb-5">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 mb-4 ${style.bg} ${style.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-1.5 min-h-[36px] leading-relaxed">
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="mb-6 flex items-baseline gap-1 border-b border-slate-100 pb-6">
                                    <span className="text-xl font-bold text-slate-400">₹</span>
                                    <span className="text-4xl font-black text-slate-900 tracking-tight">{plan.monthly_price}</span>
                                    <span className="text-xs font-bold text-slate-400 ml-1">/ mo</span>
                                </div>

                                {/* Features List */}
                                <ul className="text-sm font-semibold space-y-3.5 mb-8 flex-1 text-slate-700">
                                    <li className="flex items-start gap-3">
                                        <div className={`mt-0.5 p-1 rounded-full shrink-0 ${style.bg} ${style.color}`}>
                                            <FiCheck size={10} strokeWidth={4} />
                                        </div>
                                        <span className="text-xs sm:text-sm"><strong className="text-slate-900">{plan.discount_percent}% extra off</strong> orders</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        {plan.free_delivery ? (
                                            <div className={`mt-0.5 p-1 rounded-full shrink-0 ${style.bg} ${style.color}`}>
                                                <FiCheck size={10} strokeWidth={4} />
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 p-1 rounded-full shrink-0 bg-slate-100 text-slate-400">
                                                <FiX size={10} strokeWidth={4} />
                                            </div>
                                        )}
                                        <span className={`text-xs sm:text-sm ${!plan.free_delivery ? 'text-slate-400 line-through decoration-slate-300' : ''}`}>
                                            {plan.free_delivery ? <strong className="text-slate-900">Unlimited Free Delivery</strong> : 'Standard Delivery'}
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className={`mt-0.5 p-1 rounded-full shrink-0 ${style.bg} ${style.color}`}>
                                            <FiCheck size={10} strokeWidth={4} />
                                        </div>
                                        <span className="text-xs sm:text-sm">Priority 24/7 Support</span>
                                    </li>
                                </ul>

                                {/* CTA Button */}
                                <div className="mt-auto">
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={!!myMembership || processingId === plan.id}
                                        className={`h-12 w-full rounded-xl text-sm font-bold flex items-center justify-center transition-all duration-200 ${isCurrentPlan
                                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                                            : isSubscribedToOther
                                                ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                                                : `${style.button} shadow-md active:scale-95`
                                            }`}
                                    >
                                        {processingId === plan.id ? (
                                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                                        ) : isCurrentPlan ? (
                                            'Currently Active'
                                        ) : isSubscribedToOther ? (
                                            'Upgrade Unavailable'
                                        ) : (
                                            'Subscribe'
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
};

export default Membership;