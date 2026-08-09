import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiCreditCard,
    FiDollarSign,
    FiSmartphone,
    FiTruck,
    FiLock,
    FiCheckCircle,
    FiShield,
    FiAlertCircle
} from 'react-icons/fi';

const paymentMethods = [
    { id: 'UPI', label: 'UPI (GPay, PhonePe, Paytm)', icon: FiSmartphone, desc: 'Instant & secure transfer' },
    { id: 'CARD', label: 'Credit / Debit Card', icon: FiCreditCard, desc: 'Visa, MasterCard, RuPay & more' },
    { id: 'WALLET', label: 'FoodExpress Wallet', icon: FiDollarSign, desc: 'Pay using your account balance' },
    { id: 'NETBANKING', label: 'Net Banking', icon: FiDollarSign, desc: 'All major Indian banks supported' },
    { id: 'COD', label: 'Cash on Delivery', icon: FiTruck, desc: 'Pay with cash upon arrival' },
];

const Checkout = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [method, setMethod] = useState('UPI');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);

    const fetchOrder = async () => {
        try {
            const res = await api.get(`/orders/${orderId}`);
            const orderData = res.data;

            if (orderData.payment && orderData.payment.status === 'SUCCESS') {
                toast.error('This order has already been paid.');
                navigate('/orders');
                return;
            }

            setOrder(orderData);
        } catch (err) {
            toast.error('Failed to load order details');
            navigate('/orders');
        }
    };

    const fetchWallet = async () => {
        try {
            const res = await api.get('/wallet');
            setWalletBalance(res.data.balance || 0);
        } catch (err) {
            console.error('Wallet fetch failed', err);
        }
    };

    useEffect(() => {
        if (orderId) {
            const initializeCheckout = async () => {
                setFetching(true);
                await Promise.all([fetchOrder(), fetchWallet()]);
                setFetching(false);
            };
            initializeCheckout();
        }
    }, [orderId]);

    const handlePayment = async () => {
        setLoading(true);
        try {
            await api.post('/payments/initiate', { order_id: parseInt(orderId), method });
            toast.success('Payment successful! Order confirmed. 🎉');
            navigate('/orders');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    const isWalletInsufficient = method === 'WALLET' && order && walletBalance < order.total_amount;

    if (fetching) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] w-full flex-col items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Preparing secure checkout...</p>
            </div>
        );
    }

    if (!order) return null;

    return (
        /* Reduced vertical padding (py-4) and flex-centering to fit viewport */
        <main className="min-h-[calc(100vh-80px)] w-full bg-gradient-to-br from-slate-50 to-slate-100 py-4 px-4 sm:px-6 flex flex-col items-center justify-center">

            <div className="w-full max-w-xl mx-auto flex flex-col justify-center">

                {/* ---------- Compact Header ---------- */}
                <div className="mb-4 text-center flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                        <FiShield size={24} className="text-red-500" />
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Secure Checkout</h1>
                    </div>
                    <p className="text-xs text-slate-500">Complete your payment to confirm your order.</p>
                </div>

                {/* ---------- Main Checkout Card ---------- */}
                {/* Reduced padding (p-5 sm:p-6) and spacing (space-y-5) */}
                <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5 w-full">

                    {/* Order Summary Banner */}
                    <div className="flex flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Order Ref</span>
                            <h2 className="font-bold text-slate-900 text-sm">#{order.id}</h2>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Payable</span>
                            <p className="text-xl font-black text-red-500 tracking-tight">₹{order.total_amount?.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Failed Payment Warning Banner */}
                    {order.payment && order.payment.status !== 'SUCCESS' && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl shadow-sm">
                            <FiAlertCircle className="shrink-0 mt-0.5 h-4 w-4" />
                            <div>
                                <h4 className="font-bold text-xs">Previous Attempt Failed</h4>
                                <p className="text-xs mt-0.5 opacity-90">A previous payment attempt was unsuccessful. You can try again below.</p>
                            </div>
                        </div>
                    )}

                    {/* Payment Methods Selection */}
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Select Payment Method
                        </h3>

                        {/* Reduced spacing between items (space-y-2) */}
                        <div className="space-y-2">
                            {paymentMethods.map(pm => {
                                const Icon = pm.icon;
                                const isSelected = method === pm.id;

                                return (
                                    <div key={pm.id} className="flex flex-col gap-1">
                                        <label
                                            className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected
                                                    ? 'border-red-500 bg-red-50/30 shadow-sm ring-1 ring-red-100'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${isSelected ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                    }`}>
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <span className={`block font-bold text-sm transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                        {pm.label}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400">{pm.desc}</span>
                                                </div>
                                            </div>

                                            <div className="shrink-0 ml-3">
                                                <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${isSelected ? 'border-red-500 bg-red-500' : 'border-slate-300'
                                                    }`}>
                                                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={pm.id}
                                                    checked={isSelected}
                                                    onChange={(e) => setMethod(e.target.value)}
                                                    className="hidden"
                                                />
                                            </div>
                                        </label>

                                        {/* Contextual Wallet Information */}
                                        {pm.id === 'WALLET' && isSelected && (
                                            <div className={`ml-[52px] mt-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${isWalletInsufficient ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {isWalletInsufficient ? (
                                                    <><FiAlertCircle size={12} /> Balance: ₹{walletBalance.toFixed(2)} (Please recharge)</>
                                                ) : (
                                                    <><FiCheckCircle size={12} /> Balance: ₹{walletBalance.toFixed(2)}</>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Payment CTA Button */}
                    <div className="pt-1">
                        <button
                            onClick={handlePayment}
                            disabled={loading || isWalletInsufficient}
                            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-lg transition duration-200 focus:outline-none focus:ring-4 ${isWalletInsufficient
                                    ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-500 to-orange-500 shadow-red-200 hover:-translate-y-0.5 hover:shadow-xl hover:from-red-600 hover:to-orange-600 focus:ring-red-100 disabled:opacity-50 disabled:hover:translate-y-0'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Processing...</span>
                                </>
                            ) : isWalletInsufficient ? (
                                <span>Insufficient Wallet Balance</span>
                            ) : (
                                <>
                                    <FiLock size={16} />
                                    <span>Pay ₹{order.total_amount?.toFixed(2)} Securely</span>
                                </>
                            )}
                        </button>

                        {/* Security Footer Notice */}
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 justify-center mt-3">
                            <FiCheckCircle size={12} /> 256-Bit Encrypted Transaction
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Checkout;