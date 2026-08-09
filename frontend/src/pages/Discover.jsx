import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiSearch,
    FiTrendingUp,
    FiUserCheck,
    FiCompass,
    FiSun,
    FiClock,
    FiMapPin,
    FiStar,
} from 'react-icons/fi';

const Discover = () => {
    const [trending, setTrending] = useState([]);
    const [forYou, setForYou] = useState([]);
    const [cuisines, setCuisines] = useState([]);
    const [meal, setMeal] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    // Fetch all recommendations
    const fetchAll = async () => {
        try {
            const [trendRes, youRes, cuiRes, mealRes] = await Promise.all([
                api.get('/recommendations/trending'),
                api.get('/recommendations/for-you'),
                api.get('/recommendations/cuisines'),
                api.get('/recommendations/meal'),
            ]);
            setTrending(trendRes.data || []);
            setForYou(youRes.data || []);
            setCuisines(cuiRes.data || []);
            setMeal(mealRes.data || []);
        } catch (err) {
            toast.error('Failed to load recommendations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    // Search handler
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await api.get(`/recommendations/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchResults(res.data || []);
            if (res.data.length === 0) {
                toast('No results found', { icon: '🔍' });
            }
        } catch {
            toast.error('Search failed');
        } finally {
            setSearching(false);
        }
    };

    // Clear search results when input is cleared
    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    // Determine meal period
    const getMealPeriod = () => {
        const hour = new Date().getHours();
        if (hour < 11) return 'Breakfast';
        if (hour < 14) return 'Lunch';
        if (hour < 17) return 'Snacks';
        return 'Dinner';
    };

    // ---------- Food Card Component ----------
    const FoodCard = ({ item, index }) => {
        const linkTo = item.restaurant_id
            ? `/restaurant/${item.restaurant_id}/menu`
            : '#';

        return (
            <Link
                to={linkTo}
                onClick={(e) => {
                    if (!item.restaurant_id) e.preventDefault();
                }}
                className={`group relative flex flex-col rounded-2xl bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${!item.restaurant_id ? 'cursor-not-allowed opacity-70' : ''
                    }`}
            >
                {/* Veg/Non‑Veg Badge */}
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-md">
                    <div
                        className={`h-3 w-3 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}
                        title={item.is_veg ? 'Veg' : 'Non-Veg'}
                    />
                </div>

                {/* Food Image Placeholder (color gradient) */}
                <div className="mb-3 h-36 w-full overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
                    <div className="flex h-full items-center justify-center text-4xl text-indigo-300">
                        🍽️
                    </div>
                </div>

                <h4 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                    {item.name}
                </h4>

                <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {item.description || 'Delicious food item'}
                </p>

                <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-black text-indigo-600">₹{item.price}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                        <FiMapPin className="h-3 w-3" />
                        {item.restaurant_name || 'Unknown'}
                    </span>
                </div>

                {/* Quick Add (optional) */}
                <button
                    className="mt-3 w-full rounded-xl bg-indigo-50 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 active:scale-95"
                    onClick={(e) => {
                        e.preventDefault();
                        // You can implement add-to-cart logic here
                        toast.success(`${item.name} added to cart!`, { icon: '🛒' });
                    }}
                >
                    Quick Add
                </button>
            </Link>
        );
    };

    // ---------- Skeleton Loader ----------
    const LoadingSkeleton = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="animate-pulse rounded-2xl bg-white p-4 shadow-sm"
                >
                    <div className="h-36 w-full rounded-xl bg-slate-200" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
                    <div className="mt-3 flex items-center justify-between">
                        <div className="h-5 w-1/4 rounded bg-slate-200" />
                        <div className="h-5 w-1/4 rounded bg-slate-200" />
                    </div>
                    <div className="mt-3 h-9 w-full rounded-xl bg-slate-200" />
                </div>
            ))}
        </div>
    );

    // ---------- Section Component ----------
    const Section = ({ title, icon: Icon, children, emptyMessage }) => (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            </div>
            {children || (
                <p className="text-sm text-slate-400">{emptyMessage || 'No items available'}</p>
            )}
        </section>
    );

    // ---------- Main Render ----------
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 px-4 py-8">
                <div className="mx-auto max-w-7xl space-y-8">
                    <h1 className="text-3xl font-black text-slate-900">Discover</h1>
                    <div className="h-12 w-full max-w-xl animate-pulse rounded-xl bg-slate-200" />
                    <LoadingSkeleton />
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4 py-8">
            <div className="mx-auto max-w-7xl space-y-12">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">
                            Discover
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Find your next favourite meal, curated just for you.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <FiClock className="h-3 w-3" />
                        {getMealPeriod()} time
                    </span>
                </div>

                {/* Search Bar */}
                <form
                    onSubmit={handleSearch}
                    className="group relative flex w-full max-w-2xl items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50"
                >
                    <FiSearch className="ml-4 h-5 w-5 text-slate-400 transition group-focus-within:text-indigo-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (!e.target.value) setSearchResults([]);
                        }}
                        placeholder="Search for a dish, cuisine, or restaurant..."
                        className="flex-1 border-none bg-transparent px-3 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="mr-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={searching || !searchQuery.trim()}
                        className="mr-2 flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {searching ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                            'Search'
                        )}
                    </button>
                </form>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <Section title="Search Results" icon={FiSearch}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {searchResults.map((item) => (
                                <FoodCard key={item.id} item={item} />
                            ))}
                        </div>
                    </Section>
                )}

                {/* For You */}
                <Section
                    title="For You"
                    icon={FiUserCheck}
                    emptyMessage="Order more to get personalised suggestions!"
                >
                    {forYou.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {forYou.map((item) => (
                                <FoodCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </Section>

                {/* Trending */}
                <Section
                    title="Trending Now"
                    icon={FiTrendingUp}
                    emptyMessage="Nothing trending at the moment."
                >
                    {trending.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {trending.map((item) => (
                                <FoodCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </Section>

                {/* Cuisines */}
                <Section title="Popular Cuisines" icon={FiCompass}>
                    {cuisines.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {cuisines.map((name, idx) => (
                                <span
                                    key={idx}
                                    className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300"
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">No cuisine data available.</p>
                    )}
                </Section>

                {/* Meal Time */}
                <Section title={`Perfect for ${getMealPeriod()}`} icon={FiSun}>
                    {meal.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {meal.map((item) => (
                                <FoodCard key={item.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">No meal suggestions at this time.</p>
                    )}
                </Section>
            </div>
        </main>
    );
};

export default Discover;