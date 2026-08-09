import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiMinus,
    FiTrash2,
    FiTag,
    FiShoppingCart,
    FiX,
    FiArrowRight,
    FiCheckCircle,
    FiClock,
} from 'react-icons/fi';
import { useCart } from '../store/cartContext';

const CartPage = () => {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [couponCode, setCouponCode] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState([]);

    // ----- Scheduled Order State -----
    const [scheduleModal, setScheduleModal] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('');
    const [recurrence, setRecurrence] = useState('none');

    const navigate = useNavigate();
    const { refreshCartCount } = useCart();

    // ---------- Fetch Cart ----------
    const fetchCart = async () => {
        try {
            const res = await api.get('/cart');
            setCart(res.data);
        } catch (err) {
            toast.error('Failed to load cart');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
        // Fetch available coupons for the quick‑apply section
        const fetchAvailable = async () => {
            try {
                const res = await api.get('/cart/available-coupons');
                setAvailableCoupons(res.data);
            } catch { }
        };
        fetchAvailable();
    }, []);

    // ---------- Update / Remove Item ----------
    const updateQuantity = async (itemId, newQty) => {
        if (newQty < 1) {
            try {
                await api.delete(`/cart/items/${itemId}`);
                fetchCart();
                refreshCartCount();
                toast.success('Item removed');
            } catch (err) {
                toast.error('Failed to remove item');
            }
            return;
        }
        try {
            await api.put(`/cart/items/${itemId}`, { quantity: newQty });
            fetchCart();
            refreshCartCount();
        } catch (err) {
            toast.error('Failed to update quantity');
        }
    };

    const removeItem = async (itemId) => {
        try {
            await api.delete(`/cart/items/${itemId}`);
            fetchCart();
            refreshCartCount();
            toast.success('Item removed');
        } catch (err) {
            toast.error('Failed to remove item');
        }
    };

    // ---------- Coupon logic ----------
    const applyCouponCode = async (code) => {
        setApplyingCoupon(true);
        try {
            await api.post('/cart/apply-coupon', { code });
            fetchCart();
            setCouponCode('');
            toast.success('Coupon applied successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Invalid coupon');
        } finally {
            setApplyingCoupon(false);
        }
    };

    const removeCoupon = async () => {
        try {
            await api.delete('/cart/coupon');
            fetchCart();
            toast.success('Coupon removed');
        } catch (err) {
            toast.error('Failed to remove coupon');
        }
    };

    const handlePlaceOrder = async () => {
        setPlacingOrder(true);
        try {
            const res = await api.post('/orders');
            toast.success('Order placed successfully!');
            refreshCartCount();
            fetchCart(); // clear local cart display
            navigate(`/checkout/${res.data.id}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to place order');
        } finally {
            setPlacingOrder(false);
        }
    };

    // ---------- Schedule Order Handlers ----------
    const handleScheduleOrder = () => {
        setScheduleModal(true);
    };

    const submitSchedule = async () => {
        if (!scheduleTime) {
            toast.error('Please select a delivery time');
            return;
        }
        try {
            const items = cart.items.map(item => ({
                food_item_id: item.food_item_id,
                quantity: item.quantity,
            }));
            const payload = {
                items,
                scheduled_time: scheduleTime,
                recurrence_type: recurrence,
                coupon_code: cart.coupon?.code || null,
                address_id: null,   // optionally let user pick an address
            };
            await api.post('/scheduled-orders', payload);
            // Clear the cart after scheduling
            await api.delete('/cart');
            toast.success('Order scheduled!');
            setScheduleModal(false);
            setScheduleTime('');
            setRecurrence('none');
            fetchCart();                // now returns empty cart
            refreshCartCount();        // badge becomes 0
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to schedule');
        }
    };

    // ---------- Loading State ----------
    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading your cart...</p>
            </div>
        );
    }

    // ---------- Error State ----------
    if (!cart && !loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-red-50 p-4 text-red-500">
                    <FiX className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Unable to load cart</h2>
                <p className="text-slate-500 mt-2">Please try refreshing the page.</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Cart</h1>
                    <p className="mt-1 text-sm text-slate-500">Review your items and proceed to checkout.</p>
                </div>

                {/* Empty Cart */}
                {!cart?.items || cart.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-5">
                            <FiShoppingCart className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Your cart is empty</h3>
                        <p className="text-slate-500 mt-2 mb-6">Looks like you haven't added anything to your cart yet.</p>
                        <Link
                            to="/restaurants"
                            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 text-sm font-semibold text-white transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200"
                        >
                            Browse Restaurants
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column – Items */}
                        <div className="lg:col-span-8 space-y-4">
                            {cart.items.map(item => (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition hover:shadow-md gap-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        <img
                                            src={item.food_image ? `http://localhost:8000/${item.food_image}` : '/placeholder-food.png'}
                                            alt={item.food_name}
                                            className="h-20 w-20 object-cover rounded-2xl border border-slate-100 bg-slate-50 shrink-0"
                                        />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className={`h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] ${item.is_veg ? 'border-emerald-500 bg-emerald-100' : 'border-red-500 bg-red-100'}`}
                                                    title={item.is_veg ? 'Veg' : 'Non-Veg'}
                                                />
                                                <h3 className="font-bold text-slate-900 text-lg leading-tight">{item.food_name}</h3>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">₹{item.food_price?.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm hover:bg-slate-100 transition"
                                            >
                                                <FiMinus size={14} />
                                            </button>
                                            <span className="w-10 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm hover:bg-slate-100 transition"
                                            >
                                                <FiPlus size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <p className="font-black text-slate-900 text-lg whitespace-nowrap">₹{item.total_price?.toFixed(2)}</p>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition shrink-0"
                                                title="Remove item"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right Column – Coupon & Summary */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Coupon Section */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <FiTag className="text-slate-400" /> Apply Coupon
                                </h3>

                                {cart.coupon ? (
                                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                                <FiCheckCircle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <span className="block font-bold text-emerald-800 uppercase tracking-wide">{cart.coupon.code}</span>
                                                <span className="text-xs font-medium text-emerald-600">
                                                    {cart.coupon.discount_percent}% off (Max ₹{cart.coupon.max_discount})
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={removeCoupon}
                                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                                            title="Remove Coupon"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Available coupons quick‑apply */}
                                        {availableCoupons.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium text-slate-600 mb-2">Available Coupons</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableCoupons.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => applyCouponCode(c.code)}
                                                            className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium hover:bg-green-100 border border-green-200 transition"
                                                        >
                                                            {c.code} ({c.discount_percent}% off)
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                applyCouponCode(couponCode);
                                            }}
                                            className="flex gap-2"
                                        >
                                            <input
                                                type="text"
                                                placeholder="Enter promo code"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium uppercase outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50 placeholder:normal-case placeholder:font-normal"
                                            />
                                            <button
                                                type="submit"
                                                disabled={applyingCoupon || !couponCode.trim()}
                                                className="h-12 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 shrink-0"
                                            >
                                                {applyingCoupon ? '...' : 'Apply'}
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>

                            {/* Order Summary */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Order Summary</h3>

                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between text-slate-600 font-medium text-sm">
                                        <span>Subtotal</span>
                                        <span className="text-slate-900">₹{cart.subtotal?.toFixed(2)}</span>
                                    </div>

                                    {cart.discount > 0 && (
                                        <div className="flex justify-between text-emerald-600 font-medium text-sm">
                                            <span>Discount</span>
                                            <span>-₹{cart.discount?.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-slate-600 font-medium text-sm">
                                        <span>Taxes & Fees</span>
                                        <span className="text-slate-900">Calculated at checkout</span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4 mb-6">
                                    <div className="flex justify-between items-end">
                                        <span className="font-bold text-slate-900">Total</span>
                                        <span className="text-2xl font-black text-red-500">₹{cart.total?.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 text-right">Includes all applicable taxes</p>
                                </div>

                                {/* --- Place Order --- */}
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={placingOrder}
                                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-6 text-base font-bold text-white shadow-lg shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:to-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {placingOrder ? (
                                        <>
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Proceed to Checkout</span>
                                            <FiArrowRight className="h-5 w-5" />
                                        </>
                                    )}
                                </button>

                                {/* --- Schedule Order --- */}
                                <button
                                    onClick={handleScheduleOrder}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 text-sm font-bold text-white shadow-md shadow-blue-200 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100 mt-3"
                                >
                                    <FiClock className="h-4 w-4" />
                                    Schedule Order
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ---------- Schedule Order Modal ---------- */}
            {scheduleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">Schedule Order</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium">Delivery Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={scheduleTime}
                                    onChange={e => setScheduleTime(e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Repeat</label>
                                <select
                                    value={recurrence}
                                    onChange={e => setRecurrence(e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="none">None</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={submitSchedule}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                    Schedule
                                </button>
                                <button
                                    onClick={() => setScheduleModal(false)}
                                    className="bg-gray-200 px-4 py-2 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default CartPage;