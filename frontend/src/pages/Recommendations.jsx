import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

import {
    FiHeart,
    FiTrendingUp,
    FiTag,
    FiPackage,
    FiClock,
    FiZap,
    FiChevronRight,
    FiCoffee,
    FiSun,
    FiMoon,
    FiShoppingBag,
    FiAward,
    FiSearch,
    FiCopy,
    FiCheck,
    FiStar,
    FiRefreshCw,
} from 'react-icons/fi';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const formatDate = (dateString) => {
    if (!dateString) return '-';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';

    return 'Good evening';
};

const getMealIcon = (mealType) => {
    const type = String(mealType || '').toLowerCase();

    if (type.includes('breakfast')) {
        return <FiCoffee className="h-4 w-4" />;
    }

    if (type.includes('lunch')) {
        return <FiSun className="h-4 w-4" />;
    }

    if (type.includes('dinner')) {
        return <FiMoon className="h-4 w-4" />;
    }

    return <FiClock className="h-4 w-4" />;
};

// --------------------------------------------------
// Main Component
// --------------------------------------------------

const Recommendations = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [search, setSearch] = useState('');
    const [copiedCode, setCopiedCode] = useState('');

    const fetchRecommendations = async ({ silent = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await api.get('/customer/recommendations');

            setData(response.data || {});
        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                'Could not load recommendations'
            );

            if (!silent) {
                setData({});
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const favorites = data?.favorite_restaurants || [];

    const filteredFavorites = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return favorites;
        }

        return favorites.filter((restaurant) =>
            String(restaurant.name || '')
                .toLowerCase()
                .includes(query)
        );
    }, [favorites, search]);

    const handleCopyCoupon = async (code) => {
        if (!code) return;

        try {
            await navigator.clipboard.writeText(code);

            setCopiedCode(code);

            toast.success('Coupon copied');

            window.setTimeout(() => {
                setCopiedCode('');
            }, 1500);
        } catch {
            toast.error('Unable to copy coupon');
        }
    };

    if (loading) {
        return <LoadingPage />;
    }

    return (
        <main className="min-h-[calc(100vh-72px)] bg-[#f8fafc] px-3 py-4 sm:px-5 lg:px-6">
            <div className="mx-auto w-full max-w-[1180px]">

                {/* ================= HEADER ================= */}

                <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 shadow-sm">
                    <div className="px-5 py-5 sm:px-6 sm:py-6">

                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                            {/* Left */}
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">
                                    <FiZap className="h-3 w-3" />
                                    Smart recommendations
                                </div>

                                <p className="mt-3 text-xs font-semibold text-slate-400">
                                    {getGreeting()}
                                </p>

                                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                                    Recommended for{' '}
                                    <span className="text-blue-400">
                                        You
                                    </span>
                                </h1>

                                <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400 sm:text-sm">
                                    Personalized restaurants, dishes and offers
                                    based on your ordering activity.
                                </p>
                            </div>

                            {/* Search */}
                            <div className="w-full lg:w-[340px]">
                                <div className="relative">
                                    <FiSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                    <input
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        placeholder="Search favorites..."
                                        className="
                                            h-10 w-full rounded-xl
                                            border border-white/10
                                            bg-white/10
                                            pl-10 pr-4
                                            text-sm text-white
                                            outline-none
                                            placeholder:text-slate-400
                                            focus:border-blue-400
                                            focus:ring-2 focus:ring-blue-500/20
                                        "
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Compact Stats */}
                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <MiniStat
                                icon={<FiHeart />}
                                label="Favorites"
                                value={favorites.length}
                            />

                            <MiniStat
                                icon={<FiPackage />}
                                label="Frequent"
                                value={
                                    data?.frequently_ordered_items
                                        ?.length || 0
                                }
                            />

                            <MiniStat
                                icon={<FiTag />}
                                label="Offers"
                                value={
                                    data?.personalized_offers
                                        ?.length || 0
                                }
                            />

                            <MiniStat
                                icon={<FiTrendingUp />}
                                label="Trending"
                                value={
                                    data?.smart_suggestions
                                        ?.length || 0
                                }
                            />
                        </div>
                    </div>
                </section>

                {/* ================= TOP ACTION ================= */}

                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            Your recommendations
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Updated from your recent activity
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            fetchRecommendations({
                                silent: true,
                            })
                        }
                        disabled={refreshing}
                        className="
                            inline-flex h-9 items-center gap-2
                            rounded-lg border border-slate-200
                            bg-white px-3
                            text-xs font-bold text-slate-600
                            shadow-sm transition
                            hover:bg-slate-50
                            disabled:opacity-60
                        "
                    >
                        <FiRefreshCw
                            className={`h-3.5 w-3.5 ${refreshing
                                ? 'animate-spin'
                                : ''
                                }`}
                        />

                        Refresh
                    </button>
                </div>

                {/* ================= OFFERS ================= */}

                {data?.personalized_offers?.length > 0 && (
                    <section className="mt-5">

                        <CompactSectionHeader
                            icon={<FiTag />}
                            title="Exclusive Offers"
                            subtitle="Deals selected for you"
                            badge={`${data.personalized_offers.length} available`}
                        />

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {data.personalized_offers.map(
                                (offer, index) => (
                                    <OfferCard
                                        key={
                                            offer.id ||
                                            `${offer.code}-${index}`
                                        }
                                        offer={offer}
                                        copied={
                                            copiedCode ===
                                            offer.code
                                        }
                                        onCopy={() =>
                                            handleCopyCoupon(
                                                offer.code
                                            )
                                        }
                                    />
                                )
                            )}
                        </div>
                    </section>
                )}

                {/* ================= MAIN CONTENT ================= */}

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">

                    {/* LEFT */}
                    <div className="space-y-4 lg:col-span-7">

                        {/* Favorites */}
                        <Card>

                            <CompactSectionHeader
                                icon={<FiHeart />}
                                title="Favorite Restaurants"
                                subtitle="Places you order from often"
                            />

                            {filteredFavorites.length === 0 ? (
                                <EmptyState
                                    icon={<FiHeart />}
                                    title="No favorites yet"
                                    description={
                                        search
                                            ? 'No restaurant matches your search.'
                                            : 'Your favorite restaurants will appear here.'
                                    }
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {filteredFavorites.map(
                                        (restaurant) => (
                                            <Link
                                                key={restaurant.id}
                                                to={`/restaurant/${restaurant.id}/menu`}
                                                className="
                                                    group rounded-xl
                                                    border border-slate-200
                                                    bg-white p-4
                                                    transition
                                                    hover:border-red-200
                                                    hover:shadow-md
                                                "
                                            >
                                                <div className="flex items-start justify-between">

                                                    <div className="
                                                        flex h-10 w-10
                                                        items-center justify-center
                                                        rounded-xl
                                                        bg-red-50
                                                        text-red-500
                                                    ">
                                                        <FiShoppingBag className="h-4 w-4" />
                                                    </div>

                                                    <FiChevronRight className="
                                                        h-4 w-4
                                                        text-slate-300
                                                        transition
                                                        group-hover:translate-x-0.5
                                                        group-hover:text-red-500
                                                    " />
                                                </div>

                                                <h3 className="mt-3 truncate text-sm font-black text-slate-900">
                                                    {restaurant.name}
                                                </h3>

                                                <div className="mt-2 flex items-center gap-2">

                                                    <span className="
                                                        inline-flex items-center
                                                        gap-1 rounded-md
                                                        bg-amber-50
                                                        px-2 py-1
                                                        text-[10px]
                                                        font-bold
                                                        text-amber-700
                                                    ">
                                                        <FiStar className="h-3 w-3 fill-current" />
                                                        Favorite
                                                    </span>

                                                    <span className="text-[11px] text-slate-500">
                                                        {restaurant.orders_placed || 0} orders
                                                    </span>
                                                </div>
                                            </Link>
                                        )
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* Frequently Ordered */}
                        <Card>

                            <CompactSectionHeader
                                icon={<FiPackage />}
                                title="Frequently Ordered"
                                subtitle="Your regular food picks"
                            />

                            {!data?.frequently_ordered_items
                                ?.length ? (
                                <EmptyState
                                    icon={<FiPackage />}
                                    title="No frequent items yet"
                                    description="Your regular items will appear here after more orders."
                                />
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {data.frequently_ordered_items.map(
                                        (item, index) => (
                                            <div
                                                key={
                                                    item.food_item_id ||
                                                    index
                                                }
                                                className="
                                                    flex items-center
                                                    justify-between gap-3
                                                    py-3
                                                "
                                            >
                                                <div className="flex min-w-0 items-center gap-3">

                                                    <div className="
                                                        flex h-9 w-9
                                                        shrink-0 items-center
                                                        justify-center
                                                        rounded-lg
                                                        bg-blue-50
                                                        text-xs font-black
                                                        text-blue-700
                                                    ">
                                                        #{index + 1}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-900">
                                                            {item.name}
                                                        </p>

                                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                                            Frequently purchased
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="
                                                    shrink-0 rounded-lg
                                                    bg-slate-100
                                                    px-2.5 py-1
                                                    text-[11px]
                                                    font-black
                                                    text-slate-600
                                                ">
                                                    {item.times_ordered || 0}×
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4 lg:col-span-5">

                        {/* Meal Recommendations */}
                        <section className="
                            overflow-hidden
                            rounded-2xl
                            bg-gradient-to-br
                            from-slate-900
                            to-indigo-950
                            p-5 text-white
                            shadow-sm
                        ">
                            <div className="flex items-center gap-3">

                                <div className="
                                    flex h-10 w-10
                                    items-center justify-center
                                    rounded-xl
                                    bg-white/10
                                    text-amber-300
                                ">
                                    {getMealIcon(
                                        data?.meal_recommendations
                                            ?.meal_type
                                    )}
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Meal Pick
                                    </p>

                                    <h3 className="mt-0.5 text-base font-black">
                                        Perfect for{' '}
                                        {data?.meal_recommendations
                                            ?.meal_type ||
                                            'Now'}
                                    </h3>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">

                                {!data?.meal_recommendations
                                    ?.suggested_items?.length ? (
                                    <div className="
                                        rounded-xl
                                        border border-white/10
                                        bg-white/5
                                        px-4 py-7
                                        text-center
                                        text-xs
                                        text-slate-400
                                    ">
                                        No recommendations right now.
                                    </div>
                                ) : (
                                    data.meal_recommendations
                                        .suggested_items.map(
                                            (item, index) => (
                                                <div
                                                    key={
                                                        item.food_item_id ||
                                                        index
                                                    }
                                                    className="
                                                        flex items-center
                                                        justify-between
                                                        gap-3 rounded-xl
                                                        border border-white/10
                                                        bg-white/5
                                                        px-3.5 py-3
                                                    "
                                                >
                                                    <p className="min-w-0 truncate text-sm font-semibold">
                                                        {item.name}
                                                    </p>

                                                    <span className="
                                                        shrink-0
                                                        rounded-md
                                                        bg-white/10
                                                        px-2 py-1
                                                        text-[10px]
                                                        font-bold
                                                        text-slate-300
                                                    ">
                                                        {item.times_ordered || 0} orders
                                                    </span>
                                                </div>
                                            )
                                        )
                                )}
                            </div>
                        </section>

                        {/* Trending */}
                        <Card>

                            <CompactSectionHeader
                                icon={<FiTrendingUp />}
                                title="Trending Near You"
                                subtitle="Popular local choices"
                            />

                            {!data?.smart_suggestions?.length ? (
                                <EmptyState
                                    icon={<FiTrendingUp />}
                                    title="No trending data"
                                    description="Trending items will appear here."
                                />
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {data.smart_suggestions.map(
                                        (item, index) => (
                                            <div
                                                key={
                                                    item.food_item_id ||
                                                    index
                                                }
                                                className="
                                                    flex items-center
                                                    gap-3 py-3
                                                "
                                            >
                                                <div className="
                                                    flex h-9 w-9
                                                    shrink-0 items-center
                                                    justify-center
                                                    rounded-lg
                                                    bg-purple-50
                                                    text-purple-600
                                                ">
                                                    <FiAward className="h-4 w-4" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-slate-900">
                                                        {item.name}
                                                    </p>

                                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                                        {item.total_orders || 0}{' '}
                                                        local orders
                                                    </p>
                                                </div>

                                                <span className="
                                                    rounded-md
                                                    bg-purple-50
                                                    px-2 py-1
                                                    text-[10px]
                                                    font-black
                                                    text-purple-700
                                                ">
                                                    #{index + 1}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
};

// --------------------------------------------------
// Components
// --------------------------------------------------

const MiniStat = ({ icon, label, value }) => {
    return (
        <div className="
            flex items-center gap-2.5
            rounded-xl
            border border-white/10
            bg-white/[0.06]
            px-3 py-2.5
        ">
            <div className="
                flex h-8 w-8
                shrink-0 items-center
                justify-center
                rounded-lg
                bg-white/10
                text-blue-300
            ">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </p>

                <p className="mt-0.5 text-base font-black text-white">
                    {value}
                </p>
            </div>
        </div>
    );
};

const Card = ({ children }) => {
    return (
        <section className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-4
            shadow-[0_4px_16px_rgba(15,23,42,0.04)]
            sm:p-5
        ">
            {children}
        </section>
    );
};

const CompactSectionHeader = ({
    icon,
    title,
    subtitle,
    badge,
}) => {
    return (
        <div className="mb-3.5 flex items-start justify-between gap-3">

            <div>
                <div className="flex items-center gap-2">
                    <span className="text-blue-500">
                        {icon}
                    </span>

                    <h2 className="text-base font-black text-slate-900">
                        {title}
                    </h2>
                </div>

                {subtitle && (
                    <p className="mt-1 text-[11px] text-slate-500">
                        {subtitle}
                    </p>
                )}
            </div>

            {badge && (
                <span className="
                    shrink-0 rounded-full
                    bg-emerald-50
                    px-2.5 py-1
                    text-[9px]
                    font-black uppercase
                    tracking-wider
                    text-emerald-700
                ">
                    {badge}
                </span>
            )}
        </div>
    );
};

const OfferCard = ({
    offer,
    copied,
    onCopy,
}) => {
    return (
        <article className="
            relative overflow-hidden
            rounded-2xl
            border border-emerald-400/20
            bg-gradient-to-r
            from-emerald-500
            to-teal-600
            p-4
            text-white
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:shadow-md
        ">
            <div className="flex items-start justify-between gap-3">

                <span className="
                    rounded-full
                    border border-white/20
                    bg-white/15
                    px-2.5 py-1
                    text-[10px]
                    font-black
                    tracking-widest
                ">
                    {offer.code}
                </span>

                <button
                    type="button"
                    onClick={onCopy}
                    className="
                        flex h-8 w-8
                        items-center justify-center
                        rounded-lg
                        bg-white/15
                        transition
                        hover:bg-white/25
                    "
                >
                    {copied ? (
                        <FiCheck className="h-3.5 w-3.5" />
                    ) : (
                        <FiCopy className="h-3.5 w-3.5" />
                    )}
                </button>
            </div>

            <p className="mt-3 min-h-[38px] text-sm font-bold leading-5">
                {offer.description}
            </p>

            <div className="
                mt-3 flex items-center
                gap-1.5 border-t
                border-white/15
                pt-3
                text-[10px]
                font-medium
                text-emerald-50
            ">
                <FiClock className="h-3 w-3" />

                Valid until {formatDate(offer.valid_until)}
            </div>
        </article>
    );
};

const EmptyState = ({
    icon,
    title,
    description,
}) => {
    return (
        <div className="
            flex min-h-36
            flex-col items-center
            justify-center
            rounded-xl
            border border-dashed
            border-slate-200
            bg-slate-50
            px-5 py-6
            text-center
        ">
            <div className="text-2xl text-slate-300">
                {icon}
            </div>

            <p className="mt-2 text-sm font-bold text-slate-700">
                {title}
            </p>

            <p className="mt-1 max-w-xs text-[11px] leading-5 text-slate-400">
                {description}
            </p>
        </div>
    );
};

const LoadingPage = () => {
    return (
        <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-4">
            <div className="mx-auto max-w-[1180px]">

                <div className="
                    h-[215px]
                    animate-pulse
                    rounded-2xl
                    bg-slate-200
                " />

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="
                                h-36
                                animate-pulse
                                rounded-2xl
                                bg-slate-200
                            "
                        />
                    ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">

                    <div className="space-y-4 lg:col-span-7">
                        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
                        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
                    </div>

                    <div className="space-y-4 lg:col-span-5">
                        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
                        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Recommendations;