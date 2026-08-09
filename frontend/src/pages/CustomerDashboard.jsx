import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import CustomerTabs from '../components/CustomerTabs';
import {
    FiEdit2, FiTrash2, FiPlus, FiHeart, FiX, FiMapPin,
    FiDollarSign, FiBell, FiShoppingBag, FiStar,
    FiCreditCard, FiChevronRight, FiUser, FiPhone, FiSave, FiSettings, FiSearch
} from 'react-icons/fi';

// ---------- Tabs Definition ----------
const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'profile', label: 'Profile' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'saved-locations', label: 'Saved Locations' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'preferences', label: 'Preferences' },
];

// ---------- Helpers ----------
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

// ---------- Status Badge ----------
const OrderStatusBadge = ({ status }) => {
    const config = {
        PLACED: 'bg-blue-50 text-blue-600 border-blue-200',
        ACCEPTED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        PREPARING: 'bg-amber-50 text-amber-600 border-amber-200',
        READY: 'bg-purple-50 text-purple-600 border-purple-200',
        DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        CANCELLED: 'bg-red-50 text-red-600 border-red-200',
    };

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${config[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {status?.replace('_', ' ')}
        </span>
    );
};

// ---------- Loading Skeleton ----------
const DashboardSkeleton = () => (
    <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-40 bg-white rounded-3xl border border-slate-100 p-6">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl mb-4"></div>
                    <div className="h-6 w-32 bg-slate-200 rounded-lg mb-2"></div>
                    <div className="h-4 w-24 bg-slate-100 rounded-lg"></div>
                </div>
            ))}
        </div>
    </div>
);

// ---------- Main Component ----------
const CustomerDashboard = () => {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [profileData, setProfileData] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/customers/me');
            setProfileData(res.data);
        } catch (err) {
            toast.error('Failed to load profile');
        }
    };

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/customer/dashboard/summary');
            setDashboardData(res.data);
        } catch (err) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchDashboard();
    }, []);

    // ----- Address Handlers -----
    const handleAddressAdd = async (newAddr) => {
        try {
            const res = await api.post('/customers/addresses', newAddr);
            setProfileData((prev) => ({ ...prev, addresses: [...prev.addresses, res.data] }));
            toast.success('Address added successfully');
            fetchDashboard();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add address');
        }
    };

    const handleAddressUpdate = async (id, updated) => {
        try {
            const res = await api.put(`/customers/addresses/${id}`, updated);
            setProfileData((prev) => ({
                ...prev,
                addresses: prev.addresses.map((a) => (a.id === id ? res.data : a)),
            }));
            toast.success('Address updated');
        } catch (err) {
            toast.error('Failed to update address');
        }
    };

    const handleAddressDelete = async (id) => {
        try {
            await api.delete(`/customers/addresses/${id}`);
            setProfileData((prev) => ({
                ...prev,
                addresses: prev.addresses.filter((a) => a.id !== id),
            }));
            toast.success('Address deleted');
            fetchDashboard();
        } catch (err) {
            toast.error('Failed to delete address');
        }
    };

    const handleSetDefault = async (id) => {
        await handleAddressUpdate(id, { is_default: true });
    };

    // ----- Saved Locations Handlers -----
    const handleSavedLocationAdd = async (newLoc) => {
        try {
            const res = await api.post('/customers/saved-locations', newLoc);
            setProfileData((prev) => ({
                ...prev,
                saved_locations: [...(prev.saved_locations || []), res.data],
            }));
            toast.success('Location saved');
        } catch (err) {
            toast.error('Failed to save location');
        }
    };

    const handleSavedLocationUpdate = async (id, updated) => {
        try {
            const res = await api.put(`/customers/saved-locations/${id}`, updated);
            setProfileData((prev) => ({
                ...prev,
                saved_locations: prev.saved_locations.map((l) => l.id === id ? res.data : l),
            }));
            toast.success('Location updated');
        } catch (err) {
            toast.error('Failed to update location');
        }
    };

    const handleSavedLocationDelete = async (id) => {
        try {
            await api.delete(`/customers/saved-locations/${id}`);
            setProfileData((prev) => ({
                ...prev,
                saved_locations: prev.saved_locations.filter((l) => l.id !== id),
            }));
            toast.success('Location deleted');
        } catch (err) {
            toast.error('Failed to delete location');
        }
    };

    // ----- Favorites Handlers -----
    const handleToggleFavorite = async (restaurantId, isFavorite) => {
        try {
            if (isFavorite) {
                await api.delete(`/customers/favorites/${restaurantId}`);
            } else {
                await api.post(`/customers/favorites/${restaurantId}`);
            }
            fetchProfile();
            fetchDashboard();
            toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
        } catch (err) {
            toast.error('Action failed');
        }
    };

    // ----- Preferences Handlers -----
    const handleSavePreferences = async (preferences) => {
        try {
            const res = await api.put('/customers/preferences', { preferences });
            setProfileData(res.data);
            toast.success('Preferences saved successfully');
        } catch (err) {
            toast.error('Failed to save preferences');
        }
    };

    if (loading) return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="h-10 w-48 bg-slate-200 rounded-xl mb-8 animate-pulse"></div>
            <div className="h-14 bg-slate-200 rounded-2xl mb-8 animate-pulse"></div>
            <DashboardSkeleton />
        </div>
    );

    if (!profileData) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <FiX size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Unable to load profile</h2>
            <p className="text-slate-500 mt-2">Please try refreshing the page.</p>
        </div>
    );

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">My Account</h1>
                    <p className="text-slate-500 mt-2 font-medium">Welcome back, {user?.name || 'User'}!</p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 overflow-x-auto scrollbar-hide">
                    <CustomerTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={TABS} />
                </div>

                {/* Content Area */}
                <div className="mt-8 bg-white overflow-hidden rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 transition-all">

                    {/* ========== DASHBOARD TAB ========== */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 animate-in fade-in">
                            {dashboardData ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">

                                    {/* Recent Orders Card */}
                                    <Link to="/orders" className="group bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all hover:-translate-y-1 flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                                <FiShoppingBag size={22} />
                                            </div>
                                            <FiChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-4">Recent Orders</h3>

                                        <div className="flex-1">
                                            {dashboardData.recent_orders.length === 0 ? (
                                                <p className="text-sm text-slate-400 font-medium">No orders placed yet.</p>
                                            ) : (
                                                <ul className="space-y-3">
                                                    {dashboardData.recent_orders.slice(0, 3).map(order => (
                                                        <li key={order.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                            <div>
                                                                <span className="text-xs font-bold text-slate-900 block mb-1">#{order.id}</span>
                                                                <OrderStatusBadge status={order.status} />
                                                            </div>
                                                            <span className="font-black text-slate-900">{formatCurrency(order.total)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Favorite Restaurants Card */}
                                    <Link to="/restaurants" className="group bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all hover:-translate-y-1 flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                                <FiHeart size={22} className="fill-red-100" />
                                            </div>
                                            <FiChevronRight className="text-slate-300 group-hover:text-red-500 transition-colors" size={20} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-4">Favorites</h3>

                                        <div className="flex-1">
                                            {dashboardData.favorite_restaurants.length === 0 ? (
                                                <p className="text-sm text-slate-400 font-medium">No favorite spots yet.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {dashboardData.favorite_restaurants.slice(0, 4).map(r => (
                                                        <li key={r.id} className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 truncate">
                                                            <FiStar className="text-amber-400 shrink-0 fill-amber-100" />
                                                            <span className="truncate">{r.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Wallet Balance Card */}
                                    <Link to="/wallet" className="group bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full text-white">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-400">
                                                <FiDollarSign size={22} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">Pay</span>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-300 mb-1">Wallet Balance</h3>
                                        <p className="text-4xl font-black text-white mb-6">
                                            {formatCurrency(dashboardData.wallet_balance)}
                                        </p>
                                        <div className="mt-auto flex items-center justify-between text-sm font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                                            Recharge Wallet <FiChevronRight />
                                        </div>
                                    </Link>

                                    {/* Saved Addresses Card */}
                                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                                <FiMapPin size={22} />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-1">Saved Addresses</h3>
                                        <p className="text-3xl font-black text-slate-900 mb-4">{dashboardData.saved_addresses_count}</p>
                                        <button
                                            onClick={() => setActiveTab('addresses')}
                                            className="mt-auto flex items-center justify-between w-full text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 hover:bg-emerald-100 px-4 py-3 rounded-xl"
                                        >
                                            Manage Addresses <FiChevronRight />
                                        </button>
                                    </div>

                                    {/* Unread Notifications Card */}
                                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                                                <FiBell size={22} />
                                            </div>
                                            {dashboardData.unread_notifications > 0 && (
                                                <span className="flex h-3 w-3 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-1">Notifications</h3>
                                        <p className="text-3xl font-black text-slate-900 mb-1">{dashboardData.unread_notifications}</p>
                                        <p className="text-sm font-medium text-slate-400 mb-4">Unread alerts</p>
                                        <div className="mt-auto text-xs font-bold text-amber-600 uppercase tracking-wider">
                                            Check notification bell ↗
                                        </div>
                                    </div>

                                    {/* Quick Links Card */}
                                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                <FiCreditCard size={22} />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900">Quick Links</h3>
                                        </div>
                                        <div className="space-y-3 mt-auto">
                                            <Link to="/cart" className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold transition">
                                                My Cart <FiChevronRight className="text-slate-400" />
                                            </Link>
                                            <Link to="/payments" className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-xl text-sm font-bold transition">
                                                Payment Methods <FiChevronRight className="text-slate-400" />
                                            </Link>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <DashboardSkeleton />
                            )}
                        </div>
                    )}

                    {/* ---------- Sub-Sections ---------- */}
                    {activeTab === 'profile' && (
                        <ProfileSection user={user} onUpdate={() => { refreshUser(); fetchProfile(); }} />
                    )}
                    {activeTab === 'addresses' && (
                        <AddressSection
                            addresses={profileData.addresses || []}
                            onAdd={handleAddressAdd}
                            onUpdate={handleAddressUpdate}
                            onDelete={handleAddressDelete}
                            onSetDefault={handleSetDefault}
                        />
                    )}
                    {activeTab === 'saved-locations' && (
                        <SavedLocationsSection
                            savedLocations={profileData.saved_locations || []}
                            onAdd={handleSavedLocationAdd}
                            onUpdate={handleSavedLocationUpdate}
                            onDelete={handleSavedLocationDelete}
                        />
                    )}
                    {activeTab === 'favorites' && (
                        <FavoritesSection
                            favorites={profileData.favorite_restaurants || []}
                            onToggle={handleToggleFavorite}
                        />
                    )}
                    {activeTab === 'preferences' && (
                        <PreferencesSection
                            preferences={profileData.preferences}
                            onSave={handleSavePreferences}
                        />
                    )}
                </div>
            </div>
        </main>
    );
};

// ---------- Profile Section ----------
const ProfileSection = ({ user, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState(user.full_name || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await api.put(`/users/${user.id}`, {
                full_name: fullName,
                phone,
            });
            onUpdate();
            toast.success('Profile updated successfully');
            setIsEditing(false);
        } catch (err) {
            toast.error('Update failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in">
            <div className="mb-8 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-blue-50 text-blue-600 shadow-inner border border-blue-100">
                    <FiUser className="h-10 w-10" />
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{user.full_name || 'User'}</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">{user.email}</p>
                </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
                {!isEditing ? (
                    <div className="space-y-6">
                        <div className="flex items-start space-x-4 rounded-3xl border border-slate-100 bg-slate-50 p-6 w-full md:w-1/2">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                                <FiPhone className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</p>
                                <p className="font-bold text-slate-900">{user.phone || <span className="italic text-slate-400">Not provided</span>}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 active:scale-95"
                        >
                            <FiEdit2 className="h-4 w-4" />
                            <span>Edit Profile</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5 md:w-2/3 animate-in fade-in">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">Full Name</label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">Phone</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white"
                            />
                        </div>
                        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60 disabled:hover:translate-y-0 active:scale-95"
                            >
                                <FiSave className="h-4 w-4" />
                                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex h-14 items-center justify-center rounded-xl bg-slate-100 px-8 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------- Addresses Section ----------
const AddressSection = ({ addresses, onAdd, onUpdate, onDelete, onSetDefault }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        label: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false,
    });

    const resetForm = () => setForm({ label: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) onUpdate(editingId, form);
        else onAdd(form);
        setEditingId(null);
        setShowAdd(false);
        resetForm();
    };

    const startEdit = (addr) => {
        setEditingId(addr.id);
        setForm({
            label: addr.label, address_line1: addr.address_line1, address_line2: addr.address_line2 || '',
            city: addr.city, state: addr.state, pincode: addr.pincode, is_default: addr.is_default,
        });
        setShowAdd(true);
    };

    return (
        <div className="animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Addresses</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage where your food gets delivered.</p>
                </div>
                {!showAdd && (
                    <button
                        onClick={() => { setShowAdd(true); setEditingId(null); resetForm(); }}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
                    >
                        <FiPlus className="h-4 w-4" /> <span>Add New Address</span>
                    </button>
                )}
            </div>

            {showAdd && (
                <form onSubmit={handleSubmit} className="mb-10 p-6 sm:p-8 border border-slate-100 bg-slate-50 rounded-3xl space-y-6 animate-in slide-in-from-top-4">
                    <h4 className="font-black text-lg text-slate-900">{editingId ? 'Edit Address' : 'New Address'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Label (e.g. Home, Work)</label>
                            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Address Line 1</label>
                            <input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Address Line 2 (Optional)</label>
                            <input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">City</label>
                            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">State</label>
                            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Pincode</label>
                            <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div className="md:col-span-2 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-200 rounded-xl bg-white">
                                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm font-bold text-slate-700">Set as default delivery address</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                        <button type="submit" className="flex h-12 w-full sm:w-auto items-center justify-center bg-blue-600 px-8 text-sm font-bold text-white rounded-xl shadow-md transition-all hover:bg-blue-700 active:scale-95">
                            {editingId ? 'Update Address' : 'Save Address'}
                        </button>
                        <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="flex h-12 w-full sm:w-auto items-center justify-center bg-slate-200 px-8 text-sm font-bold text-slate-700 rounded-xl transition-all hover:bg-slate-300 active:scale-95">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {addresses.length === 0 && !showAdd ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4 text-slate-400">
                        <FiMapPin size={24} />
                    </div>
                    <p className="text-slate-900 font-bold text-lg">No addresses saved yet.</p>
                    <p className="text-slate-500 text-sm mt-1">Add your first address to start ordering.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {addresses.map((addr) => (
                        <div key={addr.id} className={`relative p-6 border rounded-3xl transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)] ${addr.is_default ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 hover:border-slate-300 bg-white'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-black text-slate-900 text-lg flex items-center gap-3">
                                    {addr.label}
                                    {addr.is_default && (
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-600 px-2.5 py-1 rounded-md border border-blue-200">
                                            Default
                                        </span>
                                    )}
                                </h4>
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                    <button onClick={() => startEdit(addr)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm" title="Edit">
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button onClick={() => onDelete(addr.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm" title="Delete">
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="text-sm font-medium text-slate-500 space-y-1.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <p>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</p>
                                <p>{addr.city}, {addr.state} {addr.pincode}</p>
                            </div>
                            {!addr.is_default && (
                                <button onClick={() => onSetDefault(addr.id)} className="mt-5 w-full flex items-center justify-center py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 transition-all border border-slate-100">
                                    Set as Default
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ---------- Saved Locations Section ----------
const SavedLocationsSection = ({ savedLocations, onAdd, onUpdate, onDelete }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '' });

    const resetForm = () => setForm({ name: '', address: '', latitude: '', longitude: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            name: form.name, address: form.address,
            latitude: form.latitude ? parseFloat(form.latitude) : null,
            longitude: form.longitude ? parseFloat(form.longitude) : null,
        };
        if (editingId) onUpdate(editingId, payload);
        else onAdd(payload);
        setEditingId(null);
        setShowAdd(false);
        resetForm();
    };

    const startEdit = (loc) => {
        setEditingId(loc.id);
        setForm({
            name: loc.name, address: loc.address,
            latitude: loc.latitude?.toString() || '', longitude: loc.longitude?.toString() || '',
        });
        setShowAdd(true);
    };

    return (
        <div className="animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Saved Locations</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage custom spots via coordinates.</p>
                </div>
                {!showAdd && (
                    <button
                        onClick={() => { setShowAdd(true); setEditingId(null); resetForm(); }}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
                    >
                        <FiPlus className="h-4 w-4" /> <span>Add Location</span>
                    </button>
                )}
            </div>

            {showAdd && (
                <form onSubmit={handleSubmit} className="mb-10 p-6 sm:p-8 border border-slate-100 bg-slate-50 rounded-3xl space-y-6 animate-in slide-in-from-top-4">
                    <h4 className="font-black text-lg text-slate-900">{editingId ? 'Edit Location' : 'New Location'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Location Name</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Address Description</label>
                            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Latitude (optional)</label>
                            <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Longitude (optional)</label>
                            <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                        <button type="submit" className="flex h-12 w-full sm:w-auto items-center justify-center bg-blue-600 px-8 text-sm font-bold text-white rounded-xl shadow-md transition-all hover:bg-blue-700 active:scale-95">
                            {editingId ? 'Update Location' : 'Save Location'}
                        </button>
                        <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="flex h-12 w-full sm:w-auto items-center justify-center bg-slate-200 px-8 text-sm font-bold text-slate-700 rounded-xl transition-all hover:bg-slate-300 active:scale-95">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {savedLocations.length === 0 && !showAdd ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4 text-slate-400">
                        <FiMapPin size={24} />
                    </div>
                    <p className="text-slate-900 font-bold text-lg">No saved locations yet.</p>
                    <p className="text-slate-500 text-sm mt-1">Add custom GPS coordinates for precise drops.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {savedLocations.map((loc) => (
                        <div key={loc.id} className="relative p-6 border border-slate-100 rounded-3xl bg-white hover:border-slate-300 hover:shadow-md transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-black text-slate-900 text-lg">{loc.name}</h4>
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                    <button onClick={() => startEdit(loc)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm" title="Edit">
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button onClick={() => onDelete(loc.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm" title="Delete">
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-sm font-medium text-slate-600 mb-2">{loc.address}</p>
                                {(loc.latitude || loc.longitude) && (
                                    <p className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                                        <FiMapPin /> GPS: {loc.latitude?.toFixed(6)}, {loc.longitude?.toFixed(6)}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ---------- Favorites Section ----------
const FavoritesSection = ({ favorites, onToggle }) => {
    const [restaurantIdInput, setRestaurantIdInput] = useState('');

    const handleAddById = (e) => {
        e.preventDefault();
        const id = parseInt(restaurantIdInput, 10);
        if (isNaN(id)) return toast.error('Please enter a valid ID');
        onToggle(id, false);
        setRestaurantIdInput('');
    };

    return (
        <div className="animate-in fade-in">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Favorite Restaurants</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Quickly access the places you love.</p>
            </div>

            <form onSubmit={handleAddById} className="mb-10 flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                <div className="relative w-full flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="number"
                        placeholder="Restaurant ID (Test)..."
                        value={restaurantIdInput}
                        onChange={(e) => setRestaurantIdInput(e.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50 focus:bg-white"
                    />
                </div>
                <button type="submit" className="h-14 w-full sm:w-auto rounded-2xl bg-red-500 px-8 text-sm font-bold text-white transition-all shadow-md hover:bg-red-600 active:scale-95 shrink-0">
                    Add Favorite
                </button>
            </form>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4 text-slate-300">
                        <FiHeart size={24} />
                    </div>
                    <p className="text-slate-900 font-bold text-lg">No favorites yet.</p>
                    <p className="text-slate-500 text-sm mt-1">Tap the heart icon on a restaurant to save it here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {favorites.map((rest) => (
                        <div key={rest.id} className="flex justify-between items-center p-5 border border-slate-100 rounded-3xl bg-white hover:border-red-200 hover:shadow-md transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)] group">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500 shrink-0">
                                    <FiHeart className="h-5 w-5 fill-current" />
                                </div>
                                <div>
                                    <span className="font-black text-slate-900 text-base">{rest.name}</span>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Restaurant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onToggle(rest.id, true)}
                                className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Remove from favorites"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ---------- Preferences Section ----------
const PreferencesSection = ({ preferences, onSave }) => {
    const [form, setForm] = useState({
        dietary: preferences?.dietary || '',
        spice_level: preferences?.spice_level || '',
        allergies: preferences?.allergies?.join(', ') || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const prefs = {
            dietary: form.dietary || null,
            spice_level: form.spice_level || null,
            allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        };
        onSave(prefs);
    };

    return (
        <div className="animate-in fade-in">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Order Preferences</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Let restaurants know your default dietary needs.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] max-w-2xl space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Dietary Preference</label>
                        <select
                            value={form.dietary}
                            onChange={(e) => setForm({ ...form, dietary: e.target.value })}
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white cursor-pointer"
                        >
                            <option value="">None specified</option>
                            <option value="veg">Vegetarian</option>
                            <option value="non-veg">Non-Vegetarian</option>
                            <option value="vegan">Vegan</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Spice Level</label>
                        <select
                            value={form.spice_level}
                            onChange={(e) => setForm({ ...form, spice_level: e.target.value })}
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white cursor-pointer"
                        >
                            <option value="">None specified</option>
                            <option value="mild">Mild</option>
                            <option value="medium">Medium</option>
                            <option value="hot">Hot</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Allergies</label>
                    <input
                        value={form.allergies}
                        onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                        placeholder="e.g. peanuts, dairy, shellfish (comma separated)"
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white placeholder:text-slate-400"
                    />
                </div>
                <div className="pt-4 border-t border-slate-100">
                    <button
                        type="submit"
                        className="flex h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-10 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200"
                    >
                        <FiSettings size={18} />
                        <span>Save Preferences</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomerDashboard;