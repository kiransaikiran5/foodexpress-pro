import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiMinus,
    FiTrash2,
    FiCopy,
    FiUsers,
    FiShoppingCart,
    FiDollarSign,
    FiCheck,
    FiLock,
    FiAlertTriangle,
    FiUser
} from 'react-icons/fi';
import { useAuth } from '../store/authContext';

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

const StatusBadge = ({ status }) => {
    const config = {
        OPEN: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        FINALIZED: 'bg-blue-50 text-blue-600 border-blue-200',
        ORDERED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        CANCELLED: 'bg-red-50 text-red-600 border-red-200',
    };

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${config[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {status}
        </span>
    );
};

// ---------- Main Component ----------
const GroupOrderDetail = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [foodList, setFoodList] = useState([]);
    const [selectedFood, setSelectedFood] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);

    // Modal State
    const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    const fetchGroup = async () => {
        try {
            const res = await api.get(`/group-orders/${groupId}`);
            setGroup(res.data);

            // Only fetch menu if the group is still open to add items
            if (res.data.status === 'OPEN') {
                const menuRes = await api.get(`/restaurants/public/${res.data.restaurant_id}/menu`);
                const items = [];
                menuRes.data.categories?.forEach((cat) => {
                    cat.items?.forEach((item) => items.push(item));
                });
                setFoodList(items);
            }
        } catch (err) {
            toast.error('Failed to load group details');
            navigate('/group-orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]);

    const handleAddItem = async () => {
        if (!selectedFood) return;
        setAdding(true);
        try {
            await api.post(`/group-orders/${groupId}/cart`, {
                food_item_id: parseInt(selectedFood),
                quantity: parseInt(quantity) || 1,
            });
            toast.success('Item added to group cart!');
            fetchGroup();
            setQuantity(1);
            setSelectedFood('');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add item');
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateQuantity = async (itemId, newQty) => {
        if (newQty < 1) return handleRemove(itemId);
        try {
            await api.put(`/group-orders/${groupId}/cart/${itemId}?quantity=${newQty}`);
            fetchGroup();
        } catch (err) {
            toast.error('Failed to update quantity');
        }
    };

    const handleRemove = async (itemId) => {
        try {
            await api.delete(`/group-orders/${groupId}/cart/${itemId}`);
            fetchGroup();
            toast.success('Item removed');
        } catch (err) {
            toast.error('Failed to remove item');
        }
    };

    const executeFinalize = async () => {
        setFinalizing(true);
        setFinalizeModalOpen(false); // Close modal immediately
        try {
            await api.post(`/group-orders/${groupId}/finalize`);
            toast.success('Group order locked and finalized!');
            fetchGroup();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to finalize order');
        } finally {
            setFinalizing(false);
        }
    };

    const handlePay = () => {
        if (group.order_id) {
            navigate(`/checkout/${group.order_id}`);
        } else {
            toast.error('No order found to pay for.');
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(group.share_code);
        toast.success('Share code copied to clipboard!');
    };

    if (loading || !group) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading group order...</p>
            </div>
        );
    }

    const isUserCreator = user && group.creator_id === user.id;

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header Area */}
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                                {group.restaurant_name}
                            </h1>
                            <StatusBadge status={group.status} />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Group Order Lobby</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-4 pr-1.5 py-1.5 rounded-xl flex-1 lg:flex-none">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Code:</span>
                            <span className="text-sm font-black text-slate-900 tracking-widest">{group.share_code}</span>
                            <button
                                onClick={copyCode}
                                className="ml-2 p-2 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm border border-slate-200 transition-colors"
                                title="Copy share code"
                            >
                                <FiCopy size={16} />
                            </button>
                        </div>

                        {isUserCreator && group.status === 'OPEN' && (
                            <button
                                onClick={() => setFinalizeModalOpen(true)}
                                disabled={finalizing || group.cart_items?.length === 0}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold transition hover:bg-slate-800 shadow-md active:scale-95 disabled:opacity-50"
                            >
                                <FiLock /> {finalizing ? 'Locking...' : 'Finalize & Lock Order'}
                            </button>
                        )}

                        {isUserCreator && group.status === 'FINALIZED' && (
                            <button
                                onClick={handlePay}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-white px-8 py-3 rounded-xl text-sm font-bold transition hover:bg-emerald-600 shadow-md shadow-emerald-200 active:scale-95"
                            >
                                <FiDollarSign size={18} /> Pay Now
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Cart & Ordering */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Add Item Section */}
                        {group.status === 'OPEN' && (
                            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
                                <h2 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2">
                                    <FiPlus className="text-blue-500" /> Add to Shared Cart
                                </h2>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1">
                                        <select
                                            value={selectedFood}
                                            onChange={(e) => setSelectedFood(e.target.value)}
                                            className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all cursor-pointer"
                                        >
                                            <option value="">Select a food item...</option>
                                            {foodList.map((fi) => (
                                                <option key={fi.id} value={fi.id}>
                                                    {fi.name} – ₹{fi.price}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-4 sm:w-auto">
                                        <div className="relative w-24">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Qty</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                                className="h-12 w-full border border-slate-200 rounded-xl pl-10 pr-3 text-sm font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-center"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddItem}
                                            disabled={adding || !selectedFood}
                                            className="h-12 flex items-center justify-center gap-2 bg-blue-600 text-white px-8 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
                                        >
                                            {adding ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Shared Cart Section */}
                        <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
                            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                                    <FiShoppingCart className="text-indigo-500" /> Shared Cart
                                </h2>
                                <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1 rounded-lg">
                                    {group.cart_items?.length || 0} Items
                                </span>
                            </div>

                            <div className="p-6 sm:p-8">
                                {group.cart_items?.length === 0 ? (
                                    <div className="text-center py-10">
                                        <FiShoppingCart className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                        <p className="text-slate-500 font-medium text-sm">The shared cart is currently empty.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {group.cart_items.map((item) => (
                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition-colors shadow-sm hover:shadow-md">

                                                <div className="flex-1">
                                                    <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                                                        {item.food_name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                            {formatCurrency(item.unit_price)} each
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                            <FiUser size={12} /> Added by {item.user_name}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                                    <p className="font-black text-lg text-slate-900">
                                                        {formatCurrency(item.total_price)}
                                                    </p>

                                                    {group.status === 'OPEN' && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                                                                <button
                                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                                    className="h-7 w-7 flex items-center justify-center rounded-md bg-white text-slate-600 hover:text-blue-600 shadow-sm border border-slate-200 transition-colors"
                                                                >
                                                                    <FiMinus size={14} />
                                                                </button>
                                                                <span className="w-8 text-center font-bold text-sm text-slate-800">{item.quantity}</span>
                                                                <button
                                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                                    className="h-7 w-7 flex items-center justify-center rounded-md bg-white text-slate-600 hover:text-blue-600 shadow-sm border border-slate-200 transition-colors"
                                                                >
                                                                    <FiPlus size={14} />
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemove(item.id)}
                                                                className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                                                title="Remove item"
                                                            >
                                                                <FiTrash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Subtotal</p>
                                    <p className="text-3xl font-black text-slate-900">{formatCurrency(group.total_amount)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Members */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 sticky top-24">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                                    <FiUsers className="text-purple-500" /> Members
                                </h2>
                                <span className="bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1 rounded-lg">
                                    {group.members?.length || 0}
                                </span>
                            </div>

                            <ul className="space-y-3">
                                {group.members?.map((m) => {
                                    const isCreator = m.user_id === group.creator_id;
                                    return (
                                        <li key={m.user_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 font-bold uppercase shrink-0">
                                                {m.user_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{m.user_name}</p>
                                                {isCreator ? (
                                                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider">Creator</p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member</p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------- Finalize Confirmation Modal ---------- */}
            {finalizeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-5 mb-8">
                            <div className="p-4 rounded-2xl shrink-0 bg-blue-100 text-blue-600">
                                <FiAlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    Finalize Order?
                                </h3>
                                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                                    Are you sure you want to finalize this order? Once locked, members will no longer be able to add or remove items from the shared cart.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setFinalizeModalOpen(false)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition active:scale-95"
                            >
                                Keep Open
                            </button>
                            <button
                                onClick={executeFinalize}
                                className="flex-1 font-bold py-3.5 rounded-xl transition shadow-md active:scale-95 text-white bg-blue-600 hover:bg-blue-700 shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                <FiCheck size={18} /> Yes, Finalize
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default GroupOrderDetail;