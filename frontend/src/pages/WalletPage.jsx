import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiDollarSign,
    FiStar,
    FiGift,
    FiPlus,
    FiArrowDownLeft,
    FiArrowUpRight,
    FiCopy,
    FiCheckCircle,
    FiClock,
    FiTrendingUp,
    FiCalendar
} from 'react-icons/fi';

const WalletPage = () => {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);

    // Recharge
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [isRecharging, setIsRecharging] = useState(false);

    // Loyalty redeem (for discount coupon)
    const [redeemPoints, setRedeemPoints] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redeemedCode, setRedeemedCode] = useState('');

    // Referral
    const [referralCode, setReferralCode] = useState('');
    const [showReferralInput, setShowReferralInput] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [myReferralCode, setMyReferralCode] = useState('');
    const [isGeneratingRef, setIsGeneratingRef] = useState(false);

    // Birthday
    const [birthdayCoupon, setBirthdayCoupon] = useState(null);
    const [isClaimingBday, setIsClaimingBday] = useState(false);

    const fetchWallet = async () => {
        try {
            const res = await api.get('/wallet');
            setWallet(res.data);
        } catch (err) {
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
        fetchMyReferralCode();
    }, []);

    // ---------- Referral: get my own code ----------
    const fetchMyReferralCode = async () => {
        try {
            const res = await api.post('/coupons/referral/generate');
            setMyReferralCode(res.data.referral_code);
        } catch (e) {
            // maybe already exists – we can silently ignore
        }
    };

    const handleRecharge = async (e) => {
        e.preventDefault();
        if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) return;
        setIsRecharging(true);
        try {
            await api.post('/wallet/recharge', { amount: parseFloat(rechargeAmount) });
            toast.success('Wallet recharged successfully! 💳');
            setRechargeAmount('');
            fetchWallet();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Recharge failed');
        } finally {
            setIsRecharging(false);
        }
    };

    // ---------- Loyalty Redeem (for discount coupon) ----------
    const handleRedeem = async (e) => {
        e.preventDefault();
        if (!redeemPoints || parseInt(redeemPoints) <= 0) return;
        setIsRedeeming(true);
        try {
            const res = await api.post('/coupons/loyalty/redeem', { points: parseInt(redeemPoints) });
            setRedeemedCode(res.data.code);
            toast.success(`Coupon generated! Use code ${res.data.code} for ${res.data.discount_percent}% off`);
            setRedeemPoints('');
            fetchWallet(); // points deducted
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Redemption failed');
        } finally {
            setIsRedeeming(false);
        }
    };

    // ---------- Apply Referral Code ----------
    const handleApplyReferral = async () => {
        if (!referralCode.trim()) return;
        setIsApplying(true);
        try {
            await api.post('/coupons/referral/apply-self', { referral_code: referralCode.trim().toUpperCase() });
            toast.success('Referral applied! You got a 15% off coupon.');
            setReferralCode('');
            setShowReferralInput(false);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Invalid referral code');
        } finally {
            setIsApplying(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied!');
    };

    // ---------- Claim Birthday Coupon ----------
    const handleClaimBirthday = async () => {
        setIsClaimingBday(true);
        try {
            const res = await api.post('/coupons/birthday/generate');
            setBirthdayCoupon(res.data);
            toast.success('Happy Birthday! 🎂 Enjoy 25% off.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Not your birthday or already claimed');
        } finally {
            setIsClaimingBday(false);
        }
    };

    if (loading) return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900 mb-4"></div>
            <p className="text-slate-500 font-medium">Loading your wallet...</p>
        </div>
    );

    if (!wallet) return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-red-50 p-4 text-red-500">
                <FiDollarSign className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Unable to load wallet</h2>
            <p className="text-slate-500 mt-2">Please try refreshing the page.</p>
        </div>
    );

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-4xl">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Wallet</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage your balance, earn coupons, and track transactions.</p>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-900 p-8 rounded-3xl shadow-lg relative overflow-hidden text-white">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-slate-800 opacity-50 blur-2xl"></div>
                        <div className="relative z-10 flex items-center gap-2 text-slate-300 mb-4 font-medium uppercase tracking-wider text-xs">
                            <FiDollarSign className="w-4 h-4 text-emerald-400" />
                            <span>Cash Balance</span>
                        </div>
                        <p className="text-5xl font-black tracking-tight">₹{wallet.balance?.toFixed(2)}</p>
                        <p className="text-sm text-slate-400 mt-2">Use for quick checkout</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl shadow-sm border border-amber-100 relative">
                        <div className="absolute -right-6 -bottom-6 text-amber-100 opacity-50"><FiStar size={120} /></div>
                        <div className="relative z-10 flex items-center gap-2 text-amber-700 mb-4 font-bold uppercase tracking-wider text-xs">
                            <FiStar className="w-4 h-4" /> Reward Points
                        </div>
                        <p className="text-5xl font-black text-amber-600">{wallet.reward_points || 0}</p>
                        <p className="text-sm text-amber-700 mt-2">1 Point = ₹1 discount value</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Recharge */}
                    <form onSubmit={handleRecharge} className="bg-white p-6 rounded-3xl shadow-sm border">
                        <h3 className="font-bold mb-4">Add Cash</h3>
                        <div className="flex gap-3">
                            <input type="number" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} placeholder="Amount" className="flex-1 border rounded-xl px-4 py-2" required />
                            <button disabled={isRecharging} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">Recharge</button>
                        </div>
                    </form>

                    {/* Loyalty Redeem (for coupon) */}
                    <form onSubmit={handleRedeem} className="bg-white p-6 rounded-3xl shadow-sm border">
                        <h3 className="font-bold mb-2">Redeem Points for Discount</h3>
                        <p className="text-xs text-slate-500 mb-3">Get a discount coupon for your next order.</p>
                        <div className="flex gap-3">
                            <input type="number" value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)} placeholder={`Max ${wallet.reward_points || 0}`} max={wallet.reward_points || 0} className="flex-1 border rounded-xl px-4 py-2" required />
                            <button disabled={isRedeeming || !redeemPoints} className="bg-amber-500 text-white px-6 py-2 rounded-xl font-bold">Redeem</button>
                        </div>
                        {redeemedCode && <p className="mt-2 text-sm text-green-600 font-bold">Coupon code: {redeemedCode}</p>}
                    </form>
                </div>

                {/* Referral Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border mb-8">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><FiGift className="text-indigo-500" /> Refer & Earn Coupons</h3>
                    {myReferralCode ? (
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-black text-indigo-600">{myReferralCode}</span>
                            <button onClick={() => copyToClipboard(myReferralCode)} className="p-2 bg-indigo-50 rounded-lg"><FiCopy /></button>
                        </div>
                    ) : (
                        <button onClick={fetchMyReferralCode} className="text-indigo-600 font-bold">Generate My Referral Code</button>
                    )}
                    <div className="mt-4">
                        {!showReferralInput ? (
                            <button onClick={() => setShowReferralInput(true)} className="text-sm text-indigo-600 font-bold">Have a referral code?</button>
                        ) : (
                            <div className="flex gap-2">
                                <input value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} placeholder="Enter code" className="border rounded-xl px-3 py-1.5 flex-1" />
                                <button onClick={handleApplyReferral} disabled={isApplying} className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-bold">Apply</button>
                                <button onClick={() => setShowReferralInput(false)} className="text-slate-500">Cancel</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Birthday Coupon */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border mb-8">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><FiCalendar className="text-pink-500" /> Birthday Reward</h3>
                    {birthdayCoupon ? (
                        <p className="text-green-600 font-bold">Coupon code: {birthdayCoupon.code} (25% off)</p>
                    ) : (
                        <button onClick={handleClaimBirthday} disabled={isClaimingBday} className="bg-pink-100 text-pink-600 px-5 py-2 rounded-xl font-bold hover:bg-pink-200">🎂 Claim Your Birthday Coupon</button>
                    )}
                    <p className="text-xs text-slate-400 mt-2">Available only on your birthday.</p>
                </div>

                {/* Transactions */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><FiClock className="text-slate-400" /> Transaction History</h3>
                    {!wallet.transactions || wallet.transactions.length === 0 ? (
                        <p className="text-slate-500">No transactions yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {wallet.transactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl">
                                    <div>
                                        <p className="font-bold">{tx.description}</p>
                                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString('en-IN')}</p>
                                    </div>
                                    <span className={`font-black ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                        {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default WalletPage;