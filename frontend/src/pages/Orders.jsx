import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/cartContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiRefreshCw,
    FiPackage,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiTruck,
    FiMapPin,
    FiCreditCard,
    FiStar,
    FiDollarSign,
} from 'react-icons/fi';
import StarRating from '../components/StarRating';

// ---------- Status Badge ----------
const OrderStatusBadge = ({ status }) => {
    const config = {
        PLACED: { style: 'bg-blue-100 text-blue-700 border-blue-200', icon: FiClock, label: 'Placed' },
        ACCEPTED: { style: 'bg-amber-100 text-amber-700 border-amber-200', icon: FiPackage, label: 'Accepted' },
        PREPARING: { style: 'bg-orange-100 text-orange-700 border-orange-200', icon: FiPackage, label: 'Preparing' },
        READY: { style: 'bg-purple-100 text-purple-700 border-purple-200', icon: FiTruck, label: 'Ready' },
        DELIVERED: { style: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: FiCheckCircle, label: 'Delivered' },
        CANCELLED: { style: 'bg-red-100 text-red-700 border-red-200', icon: FiXCircle, label: 'Cancelled' },
    };

    const currentConfig = config[status] || { style: 'bg-slate-100 text-slate-700 border-slate-200', icon: FiPackage, label: status };
    const Icon = currentConfig.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${currentConfig.style}`}>
            <Icon className="h-3.5 w-3.5" />
            {currentConfig.label}
        </span>
    );
};

// ---------- Payment Badge ----------
const PaymentBadge = ({ payment }) => {
    if (!payment) return null;
    const methodLabel = payment.method?.replace('_', ' ');
    const statusColor =
        payment.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-100' :
            payment.status === 'FAILED' ? 'text-red-700 bg-red-100' : 'text-gray-700 bg-gray-100';

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
            <FiCreditCard size={12} />
            {methodLabel} • {payment.status}
        </span>
    );
};

// ---------- Refund Badge ----------
const RefundBadge = ({ refund }) => {
    if (!refund) return null;
    const statusColors = {
        PENDING: 'bg-yellow-100 text-yellow-700',
        APPROVED: 'bg-green-100 text-green-700',
        REJECTED: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${statusColors[refund.status] || 'bg-gray-100 text-gray-600'}`}>
            <FiDollarSign size={12} />
            Refund {refund.status}
        </span>
    );
};

// ---------- Main Component ----------
const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [ratingDeliveryId, setRatingDeliveryId] = useState(null);
    const [deliveryReviews, setDeliveryReviews] = useState({});
    const [refunds, setRefunds] = useState([]);                     // all refunds for this customer
    const [refundOrder, setRefundOrder] = useState(null);           // order being refunded (modal)
    const [refundReason, setRefundReason] = useState('');
    const navigate = useNavigate();
    const { refreshCartCount } = useCart();

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders');
            setOrders(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error('Failed to load orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveryReviews = async () => {
        try {
            const res = await api.get('/reviews/my-deliveries');
            const map = {};
            res.data.forEach(rev => {
                map[rev.delivery_id] = rev;
            });
            setDeliveryReviews(map);
        } catch (err) {
            // silent
        }
    };

    const fetchRefunds = async () => {
        try {
            const res = await api.get('/refunds/my');
            setRefunds(res.data);
        } catch { }
    };

    useEffect(() => {
        fetchOrders();
        fetchDeliveryReviews();
        fetchRefunds();
    }, []);

    // ---------- Cancel / Reorder / Rating Handlers (existing) ----------
    const handleCancel = async (orderId) => {
        setProcessingId(`cancel-${orderId}`);
        try {
            await api.put(`/orders/${orderId}/cancel`);
            toast.success('Order cancelled successfully');
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to cancel order');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReorder = async (orderId) => {
        setProcessingId(`reorder-${orderId}`);
        try {
            await api.post(`/orders/${orderId}/reorder`);
            if (refreshCartCount) refreshCartCount();
            toast.success('Items added to your cart!', { icon: '🛒' });
            navigate('/cart');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to reorder');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRateDelivery = async (deliveryId, rating) => {
        try {
            const res = await api.post(`/reviews/delivery/${deliveryId}`, { rating, comment: '' });
            toast.success('Thank you for your feedback!');
            setDeliveryReviews(prev => ({ ...prev, [deliveryId]: res.data }));
            setRatingDeliveryId(null);
        } catch (err) {
            if (err.response?.status === 400) {
                toast.error(err.response.data.detail);
                setDeliveryReviews(prev => ({ ...prev, [deliveryId]: { rating: null, comment: null } }));
                setRatingDeliveryId(null);
            } else {
                toast.error(err.response?.data?.detail || 'Failed to submit rating');
            }
        }
    };

    // ---------- Refund Handlers ----------
    const isEligibleForRefund = (order) => {
        if (!order.payment || order.payment.status !== 'SUCCESS') return false;
        const existing = refunds.find(r => r.order_id === order.id && r.status !== 'REJECTED');
        return !existing;
    };

    const handleRequestRefund = (order) => {
        setRefundOrder(order);
        setRefundReason('');
    };

    const submitRefund = async () => {
        if (!refundOrder || !refundReason.trim()) {
            toast.error('Please provide a reason');
            return;
        }
        try {
            await api.post('/refunds/request', {
                order_id: refundOrder.id,
                reason: refundReason.trim(),
            });
            toast.success('Refund request submitted');
            setRefundOrder(null);
            fetchRefunds();
            fetchOrders(); // refresh to hide button
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Request failed');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading your orders...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Orders</h1>
                    <p className="mt-1 text-sm text-slate-500">Track, manage, and reorder your past purchases.</p>
                </div>

                {!orders || orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-5">
                            <FiPackage className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No orders yet</h3>
                        <p className="text-slate-500 mt-2 mb-6">Looks like you haven't placed any orders with us.</p>
                        <Link
                            to="/restaurants"
                            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 text-sm font-semibold text-white transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200"
                        >
                            Browse Restaurants
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => {
                            const finalTotal = order.total_amount || 0;
                            const discount = order.discount || 0;
                            const subtotal = finalTotal + discount;
                            const existingReview = order.delivery_id ? deliveryReviews[order.delivery_id] : null;
                            const refund = refunds.find(r => r.order_id === order.id);   // existing refund

                            return (
                                <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-md">
                                    {/* Order Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-slate-900 text-lg">Order #{order.id}</h3>
                                                <OrderStatusBadge status={order.status} />
                                                <PaymentBadge payment={order.payment} />
                                                <RefundBadge refund={refund} />   {/* show refund status */}
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                                <FiClock className="h-3.5 w-3.5" />
                                                {new Date(order.created_at).toLocaleString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Order Total</p>
                                            <p className="text-2xl font-black text-red-500">₹{finalTotal.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Order Summary */}
                                    <div className="p-6 sm:p-8">
                                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Order Summary</h4>

                                            <div className="space-y-3 mb-4">
                                                {order.items?.map(item => (
                                                    <div key={item.id} className="flex justify-between items-start gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700 shrink-0 shadow-sm mt-0.5">
                                                                {item.quantity}x
                                                            </span>
                                                            <div>
                                                                <p className="font-semibold text-slate-900 text-sm leading-tight">{item.food_name}</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-medium text-slate-700 text-sm shrink-0">
                                                            ₹{item.total_price?.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="border-t border-slate-200 pt-4 space-y-2">
                                                <div className="flex justify-between text-sm font-medium text-slate-500">
                                                    <span>Subtotal</span>
                                                    <span>₹{subtotal.toFixed(2)}</span>
                                                </div>
                                                {discount > 0 && (
                                                    <div className="flex justify-between text-sm font-medium text-emerald-600">
                                                        <span>
                                                            Discount
                                                            {order.coupon?.code && <span className="ml-1 uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px]">{order.coupon.code}</span>}
                                                        </span>
                                                        <span>-₹{discount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-200 mt-3">
                                                    <span>Total Paid</span>
                                                    <span>₹{finalTotal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
                                            {['PLACED', 'ACCEPTED'].includes(order.status) && (
                                                <button
                                                    onClick={() => handleCancel(order.id)}
                                                    disabled={processingId === `cancel-${order.id}`}
                                                    className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white border border-red-200 px-6 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:ring-4 focus:ring-red-50 disabled:opacity-50"
                                                >
                                                    {processingId === `cancel-${order.id}` ? 'Cancelling...' : 'Cancel Order'}
                                                </button>
                                            )}

                                            {order.delivery_id && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                                                <Link
                                                    to={`/track-order/${order.id}`}
                                                    className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-6 text-sm font-semibold shadow-md transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-200"
                                                >
                                                    <FiMapPin className="h-4 w-4" />
                                                    Track Order
                                                </Link>
                                            )}

                                            {/* Delivery Rating */}
                                            {order.status === 'DELIVERED' && order.delivery_id && (
                                                <div className="flex items-center gap-2">
                                                    {existingReview ? (
                                                        <div className="flex items-center gap-2">
                                                            <StarRating rating={existingReview.rating || 0} interactive={false} />
                                                            <span className="text-xs text-gray-500">Rated</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {ratingDeliveryId === order.delivery_id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <StarRating
                                                                        rating={0}
                                                                        onRate={(r) => handleRateDelivery(order.delivery_id, r)}
                                                                    />
                                                                    <button onClick={() => setRatingDeliveryId(null)} className="text-gray-400 text-sm hover:underline">Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setRatingDeliveryId(order.delivery_id)}
                                                                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-yellow-500 text-white px-6 text-sm font-semibold shadow-md transition hover:bg-yellow-600"
                                                                >
                                                                    <FiStar className="w-4 h-4" />
                                                                    Rate Delivery
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* Refund Request Button */}
                                            {isEligibleForRefund(order) && (
                                                <button
                                                    onClick={() => handleRequestRefund(order)}
                                                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-white px-6 text-sm font-semibold shadow-md transition hover:bg-orange-600"
                                                >
                                                    <FiDollarSign className="w-4 h-4" />
                                                    Request Refund
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleReorder(order.id)}
                                                disabled={processingId === `reorder-${order.id}`}
                                                className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 disabled:opacity-50 disabled:hover:translate-y-0"
                                            >
                                                {processingId === `reorder-${order.id}` ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                ) : (
                                                    <FiRefreshCw className="h-4 w-4" />
                                                )}
                                                <span>Reorder Items</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ---------- Refund Request Modal ---------- */}
            {refundOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow w-full max-w-md">
                        <h3 className="font-bold mb-4">Request Refund for Order #{refundOrder.id}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                            Total: ₹{refundOrder.total_amount.toFixed(2)}
                        </p>
                        <textarea
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="Please explain the reason..."
                            className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
                            rows={4}
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={submitRefund}
                                className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm"
                            >
                                Submit
                            </button>
                            <button
                                onClick={() => setRefundOrder(null)}
                                className="bg-gray-200 px-4 py-2 rounded-lg text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Orders;