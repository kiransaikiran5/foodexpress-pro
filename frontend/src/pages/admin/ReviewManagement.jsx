import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiTrash2,
    FiStar,
    FiMessageSquare,
    FiTag,
    FiTruck,
    FiUser,
    FiAlertCircle,
    FiX,
    FiShield
} from 'react-icons/fi';
import StarRating from '../../components/StarRating';

const ReviewManagement = () => {
    const [restaurantReviews, setRestaurantReviews] = useState([]);
    const [foodReviews, setFoodReviews] = useState([]);
    const [deliveryReviews, setDeliveryReviews] = useState([]);
    const [tab, setTab] = useState('restaurant');
    const [loading, setLoading] = useState(true);

    // Custom Delete Confirmation Modal State
    const [reviewToDelete, setReviewToDelete] = useState(null); // { type, id }
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchAll = async () => {
        try {
            const [rRes, fRes, dRes] = await Promise.all([
                api.get('/admin/reviews/restaurants'),
                api.get('/admin/reviews/foods'),
                api.get('/admin/reviews/deliveries'),
            ]);
            setRestaurantReviews(Array.isArray(rRes.data) ? rRes.data : []);
            setFoodReviews(Array.isArray(fRes.data) ? fRes.data : []);
            setDeliveryReviews(Array.isArray(dRes.data) ? dRes.data : []);
        } catch (err) {
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const confirmDelete = async () => {
        if (!reviewToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/admin/reviews/${reviewToDelete.type}/${reviewToDelete.id}`);
            toast.success('Review deleted successfully');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Delete failed');
        } finally {
            setIsDeleting(false);
            setReviewToDelete(null);
        }
    };

    // ---------- Loading Skeleton ----------
    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading review management...</p>
            </div>
        );
    }

    const currentReviews = tab === 'restaurant' ? restaurantReviews :
        tab === 'food' ? foodReviews : deliveryReviews;

    const tabs = [
        { id: 'restaurant', label: 'Restaurant Reviews', count: restaurantReviews.length, icon: FiMessageSquare },
        { id: 'food', label: 'Food Reviews', count: foodReviews.length, icon: FiTag },
        { id: 'delivery', label: 'Delivery Reviews', count: deliveryReviews.length, icon: FiTruck },
    ];

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 relative">
            <div className="mx-auto max-w-5xl">

                {/* ---------- Header ---------- */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Review Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Monitor, moderate, and remove user reviews across the platform.</p>
                </div>

                {/* ---------- Tabs Navigation ---------- */}
                <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const isActive = tab === t.id;

                        return (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Icon size={16} />
                                <span>{t.label}</span>
                                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ---------- Reviews List / Empty State ---------- */}
                {!currentReviews || currentReviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-5">
                            <FiMessageSquare className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No {tab} reviews found</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm">
                            There are no user reviews submitted in this category yet.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentReviews.map(rev => (
                            <div
                                key={rev.id}
                                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md"
                            >
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    {/* User Avatar Placeholder */}
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 font-bold uppercase">
                                        {rev.customer_name ? rev.customer_name.charAt(0) : <FiUser size={20} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="font-bold text-slate-900 text-base truncate">
                                                {rev.customer_name || 'Anonymous User'}
                                            </p>
                                            <div className="bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50 shrink-0">
                                                <StarRating rating={rev.rating || 0} interactive={false} size="sm" />
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100/50 my-2">
                                            {rev.comment || <span className="italic text-slate-400">No comment provided</span>}
                                        </p>

                                        <p className="text-xs font-medium text-slate-400">
                                            {rev.created_at ? new Date(rev.created_at).toLocaleString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            }) : 'Date unavailable'}
                                        </p>
                                    </div>
                                </div>

                                {/* Delete Action */}
                                <div className="shrink-0 self-end sm:self-center">
                                    <button
                                        onClick={() => setReviewToDelete({ type: tab, id: rev.id })}
                                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition"
                                        title="Delete Review"
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ---------- Custom Delete Confirmation Modal ---------- */}
            {reviewToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 mb-6 mx-auto">
                            <FiAlertCircle size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Delete Review?</h3>
                        <p className="text-sm text-slate-500 text-center mb-8">
                            Are you sure you want to delete this review? This action is permanent and cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setReviewToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 flex items-center justify-center bg-red-500 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-red-600 transition disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    'Yes, Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ReviewManagement;