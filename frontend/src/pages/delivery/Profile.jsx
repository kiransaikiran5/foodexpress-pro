import { useState, useEffect } from 'react';
import { useAuth } from '../../store/authContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiTruck,
    FiFileText,
    FiCheckCircle,
    FiClock,
    FiPower,
    FiEdit2,
    FiSave,
    FiX,
    FiUploadCloud,
    FiUser
} from 'react-icons/fi';

const DeliveryProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        vehicle_type: '',
        vehicle_number: '',
        license_number: '',
        license_doc: null,
    });

    const fetchProfile = async () => {
        try {
            const res = await api.get('/delivery/me');
            setProfile(res.data);
            setForm({
                vehicle_type: res.data.vehicle_type || '',
                vehicle_number: res.data.vehicle_number || '',
                license_number: res.data.license_number || '',
                license_doc: null,
            });
        } catch (err) {
            // if 404, profile not created yet; that's fine
            if (err.response?.status !== 404) toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const data = new FormData();
        data.append('vehicle_type', form.vehicle_type);
        data.append('vehicle_number', form.vehicle_number);
        data.append('license_number', form.license_number);
        if (form.license_doc) data.append('license_doc', form.license_doc);

        try {
            let res;
            if (profile) {
                res = await api.put('/delivery/me', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                res = await api.post('/delivery/register', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            setProfile(res.data);
            setEditing(false);
            toast.success(profile ? 'Profile updated successfully!' : 'Profile created successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Save failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAvailability = async (isAvailable) => {
        try {
            await api.put('/delivery/availability', { is_available: isAvailable });
            setProfile({ ...profile, is_available: isAvailable });
            toast.success(isAvailable ? 'You are now Online 🟢' : 'You are now Offline 🔴');
        } catch (err) {
            toast.error('Failed to update availability');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading delivery profile...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-3xl">

                {/* ---------- Header ---------- */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Delivery Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-500">Manage your vehicle, documents, and active status.</p>
                    </div>
                    {profile && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 transition"
                        >
                            <FiEdit2 size={16} /> Edit Profile
                        </button>
                    )}
                </div>

                {/* ---------- Unregistered State / Edit Mode ---------- */}
                {(editing || !profile) ? (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all">
                        <div className="mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">{profile ? 'Edit Profile' : 'Register as a Delivery Partner'}</h2>
                            <p className="text-sm text-slate-500 mt-1">Please provide your accurate vehicle and license details below.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Vehicle Type */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Type</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <FiTruck size={18} />
                                        </div>
                                        <select
                                            value={form.vehicle_type}
                                            onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all bg-slate-50/50"
                                            required
                                        >
                                            <option value="" disabled>Select vehicle type</option>
                                            <option value="Bike">Motorcycle / Bike</option>
                                            <option value="Scooter">Scooter</option>
                                            <option value="Car">Car</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Vehicle Number */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. AP 02 AB 1234"
                                        value={form.vehicle_number}
                                        onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })}
                                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all bg-slate-50/50 uppercase"
                                        required
                                    />
                                </div>
                            </div>

                            {/* License Number */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Driving License Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <FiUser size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Enter your license number"
                                        value={form.license_number}
                                        onChange={e => setForm({ ...form, license_number: e.target.value.toUpperCase() })}
                                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all bg-slate-50/50 uppercase"
                                        required
                                    />
                                </div>
                            </div>

                            {/* License Document Upload */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">License Document (Image/PDF)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition relative">
                                    <div className="space-y-1 text-center">
                                        <FiUploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                                        <div className="flex text-sm text-slate-600 justify-center">
                                            <label className="relative cursor-pointer rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none">
                                                <span>Upload a file</span>
                                                <input
                                                    type="file"
                                                    className="sr-only"
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                    onChange={e => setForm({ ...form, license_doc: e.target.files[0] })}
                                                    required={!profile}
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-slate-500">PNG, JPG, PDF up to 5MB</p>
                                        {form.license_doc && (
                                            <p className="text-sm font-bold text-emerald-600 mt-2">Selected: {form.license_doc.name}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition disabled:opacity-70"
                                >
                                    {isSubmitting ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <>
                                            <FiSave size={18} /> {profile ? 'Update Profile' : 'Register Profile'}
                                        </>
                                    )}
                                </button>

                                {profile && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(false);
                                            // Reset form to current profile
                                            setForm({
                                                vehicle_type: profile.vehicle_type || '',
                                                vehicle_number: profile.vehicle_number || '',
                                                license_number: profile.license_number || '',
                                                license_doc: null,
                                            });
                                        }}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
                                    >
                                        <FiX size={18} /> Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                ) : (
                    /* ---------- Dashboard / View Mode ---------- */
                    <div className="space-y-6">

                        {/* Status & Availability Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Verification Status Card */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-center">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Account Status</p>
                                <div className="flex items-center gap-3">
                                    {profile.is_verified ? (
                                        <>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                                <FiCheckCircle size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">Verified</h3>
                                                <p className="text-sm text-emerald-600 font-medium">Ready to take orders</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                                <FiClock size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">Pending Verification</h3>
                                                <p className="text-sm text-amber-600 font-medium">Under review by admin</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Availability Toggle Card */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-center relative overflow-hidden">
                                {/* Decorative background element based on status */}
                                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl ${profile.is_available ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>

                                <div className="relative z-10 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Current Duty</p>
                                        <h3 className={`text-2xl font-black ${profile.is_available ? 'text-emerald-500' : 'text-slate-600'}`}>
                                            {profile.is_available ? 'ONLINE' : 'OFFLINE'}
                                        </h3>
                                    </div>

                                    <button
                                        onClick={() => handleAvailability(!profile.is_available)}
                                        disabled={!profile.is_verified}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all transform active:scale-95 ${!profile.is_verified
                                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                                : profile.is_available
                                                    ? 'bg-slate-800 hover:bg-slate-900'
                                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                                            }`}
                                    >
                                        <FiPower size={18} />
                                        {profile.is_available ? 'Go Offline' : 'Go Online'}
                                    </button>
                                </div>
                                {!profile.is_verified && (
                                    <p className="text-xs text-red-500 mt-3 font-medium">You must be verified to go online.</p>
                                )}
                            </div>
                        </div>

                        {/* Details Card */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-900">Your Information</h3>
                            </div>

                            <div className="p-6 divide-y divide-slate-100">
                                <div className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <FiTruck size={20} className="text-slate-400" />
                                        <span className="font-medium">Vehicle Details</span>
                                    </div>
                                    <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                                        {profile.vehicle_type} • {profile.vehicle_number}
                                    </span>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <FiUser size={20} className="text-slate-400" />
                                        <span className="font-medium">License Number</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{profile.license_number}</span>
                                </div>

                                <div className="py-4 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <FiFileText size={20} className="text-slate-400" />
                                        <span className="font-medium">License Document</span>
                                    </div>
                                    {profile.license_doc ? (
                                        <a
                                            href={`http://localhost:8000/${profile.license_doc}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition bg-red-50 px-4 py-2 rounded-xl"
                                        >
                                            View Document <FiCheckCircle size={16} />
                                        </a>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-400">Not Uploaded</span>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </main>
    );
};

export default DeliveryProfile;