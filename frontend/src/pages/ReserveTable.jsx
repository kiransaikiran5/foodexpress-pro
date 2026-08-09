import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiCalendar,
    FiClock,
    FiUsers,
    FiAlignLeft,
    FiMapPin,
    FiCheckCircle
} from 'react-icons/fi';

const ReserveTable = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [guests, setGuests] = useState(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const res = await api.get('/restaurants/public/list');
                setRestaurants(res.data);
            } catch (err) {
                toast.error('Failed to load restaurants');
            }
        };
        fetchRestaurants();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRestaurant || !dateTime) {
            toast.error('Please select a restaurant and date/time');
            return;
        }
        setLoading(true);
        try {
            await api.post('/reservations', {
                restaurant_id: parseInt(selectedRestaurant),
                reservation_date: dateTime,
                guests,
                notes: notes || null,
            });
            toast.success('Table reserved successfully!');
            navigate('/my-reservations');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to reserve table');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden">

            {/* Background Decorative Blobs */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">

                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className="mx-auto h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
                        <FiCalendar size={28} />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                        Reserve a Table
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        Book your perfect dining experience in advance.
                    </p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">

                    {/* Restaurant Selection */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FiMapPin className="text-blue-500" /> Select Restaurant
                        </label>
                        <select
                            value={selectedRestaurant}
                            onChange={(e) => setSelectedRestaurant(e.target.value)}
                            className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all cursor-pointer text-slate-700"
                            required
                        >
                            <option value="" disabled>Choose a location...</option>
                            {restaurants.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date, Time & Guests */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <FiClock className="text-blue-500" /> Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={dateTime}
                                onChange={(e) => setDateTime(e.target.value)}
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-slate-700"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <FiUsers className="text-blue-500" /> Number of Guests
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={guests}
                                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                                className="h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    {/* Special Requests */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FiAlignLeft className="text-blue-500" /> Special Requests <span className="text-slate-300 normal-case tracking-normal font-medium">(Optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400 resize-none"
                            rows={3}
                            placeholder="E.g., Window seat preferred, celebrating an anniversary, food allergies..."
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 border-t border-slate-100 mt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-14 w-full bg-blue-600 text-white rounded-xl text-base font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Confirming...
                                </>
                            ) : (
                                <>
                                    <FiCheckCircle size={20} />
                                    Confirm Reservation
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default ReserveTable;