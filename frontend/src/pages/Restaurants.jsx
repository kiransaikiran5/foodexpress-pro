import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiClock, FiMapPin, FiSearch, FiCoffee } from 'react-icons/fi';

const Restaurants = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const res = await api.get('/restaurants/public/list');
                // Ensure fallback to empty array to prevent crashes
                setRestaurants(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to load restaurants:', err);
                setRestaurants([]);
            } finally {
                setLoading(false);
            }
        };
        fetchRestaurants();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Discovering restaurants near you...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 sm:mb-12">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                        Restaurants Near You
                    </h1>
                    <p className="mt-2 text-base text-slate-500">
                        Explore the best food spots around and order your favorites.
                    </p>
                </div>

                {!restaurants || restaurants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-5">
                            <FiSearch className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No restaurants found</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm">
                            We couldn't find any restaurants available right now. Please check back later!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {restaurants.map((r) => (
                            <Link
                                key={r.id}
                                to={`/restaurant/${r.id}/menu`}
                                className="group flex flex-col bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
                            >
                                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                                    {r.images?.[0]?.image_path ? (
                                        <img
                                            src={`http://localhost:8000/${r.images[0].image_path}`}
                                            alt={r.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                            <FiCoffee className="h-12 w-12 mb-2" />
                                            <span className="text-xs font-semibold uppercase tracking-widest">No Image</span>
                                        </div>
                                    )}
                                    {/* Subtle gradient overlay to make images pop */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>

                                <div className="p-5 sm:p-6 flex flex-col flex-1">
                                    <h2 className="text-xl font-bold text-slate-900 line-clamp-1 mb-1.5">
                                        {r.name}
                                    </h2>
                                    <p className="text-sm text-slate-500 line-clamp-2 flex-1 mb-4">
                                        {r.description || 'Delicious meals prepared fresh for you.'}
                                    </p>

                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600 font-medium">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md">
                                            <FiClock className="text-slate-400" />
                                            <span>{r.opening_time} - {r.closing_time}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-red-500 font-semibold bg-red-50 px-2.5 py-1 rounded-md">
                                            <FiMapPin />
                                            <span>{r.delivery_radius_km} km</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default Restaurants;