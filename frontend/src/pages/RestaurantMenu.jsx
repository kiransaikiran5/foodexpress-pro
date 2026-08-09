import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { useCart } from '../store/cartContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiShoppingCart,
    FiInfo,
    FiArrowLeft,
    FiFileText,
    FiClock,
    FiCheck,
    FiStar,
    FiUser,
    FiAlertCircle
} from 'react-icons/fi';
import StarRating from '../components/StarRating';
import ReviewForm from '../components/ReviewForm';

const RestaurantMenu = () => {
    const { restaurantId } = useParams();
    const { user } = useAuth();
    const { refreshCartCount } = useCart();
    const navigate = useNavigate();

    const parsedId = parseInt(restaurantId, 10);
    const validRestaurantId = isNaN(parsedId) ? null : parsedId;

    const [menu, setMenu] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addingItem, setAddingItem] = useState(null);
    const [cartCount, setCartCount] = useState(0);
    const [activeCategory, setActiveCategory] = useState(null);

    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const [foodRatingItemId, setFoodRatingItemId] = useState(null);
    const [foodRatings, setFoodRatings] = useState({});   // { [foodItemId]: rating }
    const [foodReviewData, setFoodReviewData] = useState({}); // { [foodItemId]: { avg: number, count: number } }

    const categoryRefs = useRef({});

    // Fetch menu
    useEffect(() => {
        if (!validRestaurantId) return;

        const fetchMenu = async () => {
            try {
                const res = await api.get(`/restaurants/public/${validRestaurantId}/menu`);
                setMenu(res.data);
                if (res.data?.categories?.length > 0) {
                    setActiveCategory(res.data.categories[0].id);
                }
            } catch (err) {
                toast.error('Failed to load menu');
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, [validRestaurantId]);

    // Fetch restaurant reviews
    useEffect(() => {
        if (!validRestaurantId) return;

        const fetchReviews = async () => {
            setReviewsLoading(true);
            try {
                const res = await api.get(`/reviews/restaurant/${validRestaurantId}`);
                setReviews(res.data);
            } catch {
                // silent
            } finally {
                setReviewsLoading(false);
            }
        };
        fetchReviews();
    }, [validRestaurantId]);

    // Fetch food ratings for all items once the menu is loaded
    useEffect(() => {
        if (!menu || !menu.categories) return;

        const fetchAllFoodReviews = async () => {
            const newData = {};
            for (const cat of menu.categories) {
                for (const item of cat.items || []) {
                    try {
                        const res = await api.get(`/reviews/food/${item.id}`);
                        const itemReviews = res.data;
                        if (itemReviews.length > 0) {
                            const avg = itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length;
                            newData[item.id] = { avg: avg.toFixed(1), count: itemReviews.length };
                        }
                    } catch {
                        // no reviews yet
                    }
                }
            }
            setFoodReviewData(newData);
        };
        fetchAllFoodReviews();
    }, [menu]);

    // Cart count
    useEffect(() => {
        const fetchCartCount = async () => {
            if (!user) return;
            try {
                const res = await api.get('/cart');
                if (res.data?.items) {
                    const total = res.data.items.reduce((acc, i) => acc + i.quantity, 0);
                    setCartCount(total);
                }
            } catch (err) {
                console.error('Cart count error', err);
            }
        };
        fetchCartCount();
    }, [user]);

    const addToCart = async (foodItemId) => {
        if (!user) {
            toast.error('Please log in to add items to your cart.');
            navigate('/login');
            return;
        }
        setAddingItem(foodItemId);
        try {
            await api.post('/cart/items', { food_item_id: foodItemId, quantity: 1 });
            setCartCount((prev) => prev + 1);
            if (refreshCartCount) refreshCartCount();
            toast.success('Added to cart! 🛒');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add item');
        } finally {
            setAddingItem(null);
        }
    };

    const scrollToCategory = (categoryId) => {
        const ref = categoryRefs.current[categoryId];
        if (ref) {
            const yOffset = -120;
            const y = ref.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
            setActiveCategory(categoryId);
        }
    };

    const handleReviewSubmit = async (reviewData) => {
        if (!user) { navigate('/login'); return; }
        try {
            await api.post(`/reviews/restaurant/${validRestaurantId}`, reviewData);
            toast.success('Review submitted successfully! 🎉');
            const res = await api.get(`/reviews/restaurant/${validRestaurantId}`);
            setReviews(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to submit review');
        }
    };

    const handleRateFood = async (foodItemId, rating) => {
        if (!user) { navigate('/login'); return; }
        try {
            const res = await api.post(`/reviews/food/${foodItemId}`, { rating, comment: '' });
            toast.success('Thank you for rating this item! ⭐');
            setFoodRatings(prev => ({ ...prev, [foodItemId]: res.data.rating }));
            setFoodRatingItemId(null);

            // Refresh the food reviews for this item
            try {
                const reviewsRes = await api.get(`/reviews/food/${foodItemId}`);
                const itemReviews = reviewsRes.data;
                if (itemReviews.length > 0) {
                    const avg = itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length;
                    setFoodReviewData(prev => ({
                        ...prev,
                        [foodItemId]: { avg: avg.toFixed(1), count: itemReviews.length },
                    }));
                }
            } catch { }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Could not rate food');
        }
    };

    // ---------- Early Return: Invalid ID ----------
    if (!validRestaurantId) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center text-center px-4 bg-slate-50">
                <div className="mb-5 rounded-full bg-red-50 p-5 text-red-500 shadow-sm">
                    <FiAlertCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Invalid Restaurant</h2>
                <p className="text-slate-500 mt-2 max-w-sm">The restaurant ID provided is missing or invalid.</p>
                <Link to="/restaurants" className="mt-8 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition hover:bg-slate-800 shadow-md">
                    <FiArrowLeft /> Browse Restaurants
                </Link>
            </div>
        );
    }

    // ---------- Loading Skeleton ----------
    if (loading) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
                <div className="mx-auto max-w-5xl animate-pulse">
                    <div className="h-6 w-32 bg-slate-200 rounded-lg mb-8" />
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                        <div className="h-10 w-3/4 max-w-md bg-slate-200 rounded-xl mb-4" />
                        <div className="h-5 w-1/3 bg-slate-100 rounded-lg" />
                    </div>
                    <div className="mt-8 space-y-8">
                        {[1, 2].map((i) => (
                            <div key={i} className="space-y-4">
                                <div className="h-8 w-40 bg-slate-200 rounded-xl mb-6" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 lg:gap-8">
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                                            <div className="flex gap-4 items-start">
                                                <div className="h-4 w-4 bg-slate-200 rounded-full shrink-0 mt-1" />
                                                <div className="flex-1 space-y-3">
                                                    <div className="h-5 w-3/4 bg-slate-200 rounded-lg" />
                                                    <div className="h-4 w-1/4 bg-slate-100 rounded-lg" />
                                                    <div className="h-12 w-full bg-slate-50 rounded-lg" />
                                                </div>
                                            </div>
                                            <div className="h-12 w-full bg-slate-100 rounded-xl mt-auto" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ---------- Menu not found ----------
    if (!menu) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center text-center px-4 bg-slate-50">
                <div className="mb-5 rounded-full bg-red-50 p-5 text-red-500 shadow-sm">
                    <FiInfo className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Menu Not Found</h2>
                <p className="text-slate-500 mt-2 max-w-sm">
                    The menu you are looking for doesn't exist or is currently unavailable.
                </p>
                <Link
                    to="/"
                    className="mt-8 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition hover:bg-slate-800 shadow-md"
                >
                    <FiArrowLeft /> Back to Restaurants
                </Link>
            </div>
        );
    }

    const categories = menu.categories || [];
    const hasItems = categories.some((cat) => cat.items?.length > 0);

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-28">
            {/* ---------- Header ---------- */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-sm">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <FiArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Restaurants</span>
                            <span className="sm:hidden">Back</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate max-w-[180px] sm:max-w-xs">
                                {menu.restaurant?.name || 'Menu'}
                            </h1>
                            {cartCount > 0 && (
                                <Link
                                    to="/cart"
                                    className="relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-red-50 text-red-600 border border-red-100 transition hover:bg-red-100"
                                >
                                    <FiShoppingCart className="h-5 w-5" />
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
                                        {cartCount}
                                    </span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Category Tabs */}
                    {categories.length > 0 && (
                        <div className="mt-4 flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => scrollToCategory(cat.id)}
                                    className={`snap-start whitespace-nowrap rounded-xl px-5 py-2 text-sm font-bold transition-all duration-200 ${activeCategory === cat.id
                                        ? 'bg-slate-900 text-white shadow-md scale-105'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ---------- Main Content ---------- */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-10">
                {!hasItems ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-5">
                            <FiFileText className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">No items available</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm">
                            This menu is currently empty. Please check back later!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {categories.map((cat) => {
                            const items = cat.items || [];
                            if (items.length === 0) return null;

                            return (
                                <section
                                    key={cat.id}
                                    ref={(el) => (categoryRefs.current[cat.id] = el)}
                                    className="scroll-mt-36"
                                >
                                    <div className="flex items-center gap-4 mb-8">
                                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 shrink-0">
                                            {cat.name}
                                        </h2>
                                        <div className="h-px flex-1 bg-slate-200/80 mt-2" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
                                        {items.map((item) => {
                                            const ratingData = foodReviewData[item.id];
                                            const userRating = foodRatings[item.id];

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`group relative flex flex-col bg-white rounded-[2rem] border transition-all duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 ${!item.is_available
                                                        ? 'opacity-60 grayscale-[40%] border-slate-200'
                                                        : 'border-slate-100 hover:border-red-100'
                                                        }`}
                                                >
                                                    <div className="flex items-start p-5 sm:p-6 gap-4 sm:gap-5">
                                                        {/* Veg/Non-Veg Indicator */}
                                                        <div className="mt-1 flex-shrink-0">
                                                            <div
                                                                className={`h-5 w-5 flex items-center justify-center rounded-md border-2 ${item.is_veg
                                                                    ? 'border-emerald-500 bg-emerald-50'
                                                                    : 'border-red-500 bg-red-50'
                                                                    }`}
                                                                title={item.is_veg ? 'Veg' : 'Non-Veg'}
                                                            >
                                                                <div className={`h-2 w-2 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                                                    {item.name}
                                                                </h3>
                                                                <span className="text-xl font-black tracking-tight text-slate-800 shrink-0">
                                                                    ₹{item.price}
                                                                </span>
                                                            </div>

                                                            {/* Food Rating Display */}
                                                            {ratingData || userRating ? (
                                                                <div className="mt-2 flex items-center gap-1.5">
                                                                    <StarRating
                                                                        rating={userRating || parseFloat(ratingData?.avg) || 0}
                                                                        interactive={false}
                                                                        size="sm"
                                                                    />
                                                                    <span className="text-xs font-bold text-slate-500 mt-0.5">
                                                                        {userRating ? 'Your rating' : ratingData?.avg ? `${ratingData.avg} (${ratingData.count})` : ''}
                                                                    </span>
                                                                </div>
                                                            ) : null}

                                                            {item.description && (
                                                                <p className="mt-2.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                                                    {item.description}
                                                                </p>
                                                            )}

                                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                {item.preparation_time_min && (
                                                                    <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                                                        <FiClock className="h-3.5 w-3.5" /> {item.preparation_time_min} min
                                                                    </span>
                                                                )}
                                                                {item.is_available && (
                                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">
                                                                        <FiCheck className="h-3.5 w-3.5" /> Available
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Food Rating Inline UI */}
                                                            {user && user.role === 'CUSTOMER' && item.is_available && (
                                                                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center">
                                                                    {foodRatingItemId === item.id ? (
                                                                        <div className="flex items-center gap-3 bg-amber-50/50 px-3 py-2 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-left-2 w-full justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Rate:</span>
                                                                                <StarRating
                                                                                    rating={0}
                                                                                    onRate={(r) => handleRateFood(item.id, r)}
                                                                                    size="sm"
                                                                                />
                                                                            </div>
                                                                            <button
                                                                                onClick={() => setFoodRatingItemId(null)}
                                                                                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setFoodRatingItemId(item.id)}
                                                                            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors uppercase tracking-wider"
                                                                        >
                                                                            <FiStar className="h-3.5 w-3.5" /> Rate this item
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                        </div>
                                                    </div>

                                                    {/* Action Button */}
                                                    <div className="px-5 pb-5 mt-auto">
                                                        <button
                                                            onClick={() => addToCart(item.id)}
                                                            disabled={!item.is_available || addingItem === item.id}
                                                            className={`flex w-full items-center justify-center gap-2 rounded-xl h-12 text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-4 ${!item.is_available
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 focus:ring-red-100'
                                                                }`}
                                                        >
                                                            {addingItem === item.id ? (
                                                                <>
                                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                                                    <span>Adding...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FiPlus className="h-4 w-4" /> Add to Cart
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Unavailable badge */}
                                                    {!item.is_available && (
                                                        <div className="absolute -top-0 -right-0 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl rounded-tr-[2rem] shadow-sm">
                                                            Unavailable
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}

                        {/* ---------- Restaurant Reviews Section ---------- */}
                        <section className="border-t border-slate-200 pt-12 pb-16">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                    Restaurant Reviews
                                </h2>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                    {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                                {/* Left Col: Review Form */}
                                <div className="lg:col-span-5 lg:sticky lg:top-24">
                                    {user && user.role === 'CUSTOMER' ? (
                                        <ReviewForm onSubmit={handleReviewSubmit} />
                                    ) : (
                                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 text-center">
                                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm mb-4">
                                                <FiStar size={24} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-2">Share Your Experience</h3>
                                            <p className="text-sm text-slate-500 mb-6">Log in to leave a review and let others know how you liked the food.</p>
                                            <Link to="/login" className="inline-flex justify-center items-center h-12 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition shadow-md">
                                                Log In to Review
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Right Col: Reviews List */}
                                <div className="lg:col-span-7">
                                    {reviewsLoading ? (
                                        <div className="flex justify-center py-12">
                                            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500"></div>
                                        </div>
                                    ) : reviews.length === 0 ? (
                                        <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
                                            <FiStar className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">No reviews yet</h3>
                                            <p className="text-sm text-slate-500">Be the first to share your experience!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {reviews.map((rev) => (
                                                <div key={rev.id} className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 transition hover:shadow-md">
                                                    <div className="flex items-start justify-between gap-4 mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold uppercase">
                                                                {rev.customer_name ? rev.customer_name.charAt(0) : <FiUser />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{rev.customer_name || 'Anonymous User'}</p>
                                                                <p className="text-xs font-medium text-slate-400">
                                                                    {new Date(rev.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100/50">
                                                            <StarRating rating={rev.rating} interactive={false} size="sm" />
                                                        </div>
                                                    </div>
                                                    {rev.comment && (
                                                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                                            "{rev.comment}"
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {/* ---------- Floating Cart FAB ---------- */}
            {cartCount > 0 && (
                <Link
                    to="/cart"
                    className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl shadow-red-500/40 transition-all duration-300 hover:scale-105 hover:bg-red-600 active:scale-95 border-4 border-white"
                >
                    <div className="relative">
                        <FiShoppingCart className="h-6 w-6" />
                        <span className="absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white shadow-md ring-2 ring-white">
                            {cartCount}
                        </span>
                    </div>
                </Link>
            )}
        </main>
    );
};

export default RestaurantMenu;