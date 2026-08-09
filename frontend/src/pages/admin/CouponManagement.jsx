import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiEdit2, FiTrash2, FiPlus, FiTag, FiPercent, FiDollarSign,
    FiCalendar, FiActivity, FiX, FiCheckCircle, FiAlertCircle,
    FiUsers, FiMapPin, FiUserCheck
} from 'react-icons/fi';

const CouponManagement = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [couponToDelete, setCouponToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [restaurants, setRestaurants] = useState([]);

    const [form, setForm] = useState({
        code: '',
        discount_type: 'percentage',
        discount_percent: 10,
        max_discount: 50,
        min_order_value: 0,
        valid_from: '',
        valid_until: '',
        is_active: true,
        restaurant_id: '',
        campaign_name: '',
        usage_limit: '',
        coupon_type: 'general',
        generated_for_user_id: ''
    });

    // ---------- Fetch restaurants from PUBLIC endpoint ----------
    const fetchRestaurants = async () => {
        try {
            const res = await api.get('/restaurants');   // public, works for all roles
            const list = Array.isArray(res.data) ? res.data : [];
            setRestaurants(list);
        } catch (err) {
            console.warn('Could not load restaurants', err);
            setRestaurants([]);
        }
    };

    const fetchCoupons = async () => {
        try {
            const res = await api.get('/admin/coupons/');
            setCoupons(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
        fetchRestaurants();
    }, []);

    // ---------- Form submission (unchanged) ----------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = {
            ...form,
            code: form.code.toUpperCase(),
            discount_percent: parseFloat(form.discount_percent) || 0,
            max_discount: parseFloat(form.max_discount) || 0,
            min_order_value: parseFloat(form.min_order_value) || 0,
            restaurant_id: form.restaurant_id ? parseInt(form.restaurant_id) : null,
            usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
            coupon_type: form.coupon_type,
            generated_for_user_id: form.generated_for_user_id ? parseInt(form.generated_for_user_id) : null,
        };
        try {
            if (editingId) {
                await api.put(`/admin/coupons/${editingId}/`, payload);
                toast.success('Coupon updated successfully');
            } else {
                await api.post('/admin/coupons/', payload);
                toast.success('Coupon created successfully');
            }
            fetchCoupons();
            resetForm();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({
            code: '', discount_type: 'percentage', discount_percent: 10, max_discount: 50,
            min_order_value: 0, valid_from: '', valid_until: '', is_active: true,
            restaurant_id: '', campaign_name: '', usage_limit: '', coupon_type: 'general', generated_for_user_id: ''
        });
        setShowForm(false);
        setEditingId(null);
    };

    const handleEdit = (coupon) => {
        setForm({
            code: coupon.code,
            discount_type: coupon.discount_type || 'percentage',
            discount_percent: coupon.discount_percent || 0,
            max_discount: coupon.max_discount || 0,
            min_order_value: coupon.min_order_value || 0,
            valid_from: coupon.valid_from?.slice(0, 16) || '',
            valid_until: coupon.valid_until?.slice(0, 16) || '',
            is_active: coupon.is_active,
            restaurant_id: coupon.restaurant_id || '',
            campaign_name: coupon.campaign_name || '',
            usage_limit: coupon.usage_limit || '',
            coupon_type: coupon.coupon_type || 'general',
            generated_for_user_id: coupon.generated_for_user_id || ''
        });
        setEditingId(coupon.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        if (!couponToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/admin/coupons/${couponToDelete.id}/`);
            toast.success('Coupon deleted successfully');
            fetchCoupons();
        } catch (err) {
            toast.error('Failed to delete coupon');
        } finally {
            setIsDeleting(false);
            setCouponToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading coupon management...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 relative">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Advanced Coupons</h1>
                        <p className="mt-1 text-sm text-slate-500">Create referral, birthday, cashback, loyalty & restaurant‑specific promos.</p>
                    </div>
                    {!showForm && (
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition active:scale-95">
                            <FiPlus size={18} /> Add Coupon
                        </button>
                    )}
                </div>

                {showForm && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 mb-10">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                            <button onClick={resetForm} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><FiX size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Code */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coupon Code *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><FiTag size={16} /></div>
                                        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase outline-none" required />
                                    </div>
                                </div>

                                {/* Coupon Type */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coupon Type</label>
                                    <select value={form.coupon_type} onChange={(e) => setForm({ ...form, coupon_type: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none">
                                        <option value="general">General</option>
                                        <option value="referral">Referral</option>
                                        <option value="birthday">Birthday</option>
                                        <option value="cashback">Cashback</option>
                                        <option value="loyalty">Loyalty</option>
                                        <option value="restaurant_specific">Restaurant Specific</option>
                                    </select>
                                </div>

                                {/* Discount Type */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Discount Type</label>
                                    <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                        <option value="free_delivery">Free Delivery</option>
                                    </select>
                                </div>

                                {/* Discount Value */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Discount Value</label>
                                    <input type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" disabled={form.discount_type === 'free_delivery'} />
                                </div>

                                {/* Max Discount */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Discount (₹)</label>
                                    <input type="number" step="0.01" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" />
                                </div>

                                {/* Min Order Value */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Min Order Value (₹)</label>
                                    <input type="number" step="0.01" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" />
                                </div>

                                {/* Usage Limit */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Usage Limit</label>
                                    <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" placeholder="Unlimited" />
                                </div>

                                {/* Restaurant dropdown (only when type = restaurant_specific) */}
                                {form.coupon_type === 'restaurant_specific' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Restaurant</label>
                                        <select value={form.restaurant_id} onChange={(e) => setForm({ ...form, restaurant_id: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none">
                                            <option value="">Select Restaurant</option>
                                            {restaurants.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* User ID (for personal coupons) */}
                                {(form.coupon_type === 'referral' || form.coupon_type === 'birthday' || form.coupon_type === 'cashback' || form.coupon_type === 'loyalty') && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">User ID (optional)</label>
                                        <input type="number" value={form.generated_for_user_id} onChange={(e) => setForm({ ...form, generated_for_user_id: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" placeholder="Assign to specific user" />
                                    </div>
                                )}

                                {/* Valid From */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valid From</label>
                                    <input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" required />
                                </div>

                                {/* Valid Until */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valid Until</label>
                                    <input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" required />
                                </div>

                                {/* Campaign Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campaign Name</label>
                                    <input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-3 pt-4 border-t">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${form.is_active ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-300 text-transparent'}`}>
                                        <FiCheckCircle size={14} />
                                    </div>
                                    <input type="checkbox" className="hidden" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                                    <span className="text-sm font-bold text-slate-700">Active</span>
                                </label>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <button type="button" onClick={resetForm} className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-red-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-red-600 disabled:opacity-70">
                                    {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (editingId ? 'Save Changes' : 'Create Coupon')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Coupon List */}
                {coupons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-white">
                        <FiTag className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-900">No coupons yet</h3>
                        <p className="text-slate-500 mt-1">Create your first advanced coupon above.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {coupons.map(c => (
                            <div key={c.id} className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                                <div className="p-5 border-b flex justify-between items-start">
                                    <div>
                                        <h3 className="font-black text-lg uppercase">{c.code}</h3>
                                        <span className="text-xs text-slate-500">{c.coupon_type || 'general'}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {c.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="p-5 space-y-2">
                                    <p><strong>{c.discount_percent}% off</strong> (max ₹{c.max_discount})</p>
                                    <p className="text-xs text-slate-400">Min order: ₹{c.min_order_value} | Uses: {c.usage_limit || '∞'}</p>
                                    <p className="text-xs text-slate-400">Valid until: {new Date(c.valid_until).toLocaleDateString()}</p>
                                    {c.restaurant_id && <p className="text-xs flex items-center gap-1"><FiMapPin size={12} /> Restaurant #{c.restaurant_id}</p>}
                                    {c.generated_for_user_id && <p className="text-xs flex items-center gap-1"><FiUserCheck size={12} /> User #{c.generated_for_user_id}</p>}
                                </div>
                                <div className="p-4 flex gap-2 border-t">
                                    <button onClick={() => handleEdit(c)} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 rounded-xl text-sm font-bold"><FiEdit2 /> Edit</button>
                                    <button onClick={() => setCouponToDelete(c)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><FiTrash2 /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete Modal */}
                {couponToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl">
                            <div className="flex flex-col items-center">
                                <FiAlertCircle className="text-red-500 h-12 w-12 mb-4" />
                                <h3 className="text-xl font-bold">Delete {couponToDelete.code}?</h3>
                                <p className="text-sm text-slate-500 mt-2 text-center">This cannot be undone.</p>
                                <div className="flex gap-3 mt-6 w-full">
                                    <button onClick={() => setCouponToDelete(null)} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold">Cancel</button>
                                    <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold">{isDeleting ? '...' : 'Delete'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default CouponManagement;