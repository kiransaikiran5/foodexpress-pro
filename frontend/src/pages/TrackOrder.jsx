import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiArrowLeft,
    FiCheckCircle,
    FiClock,
    FiPackage,
    FiNavigation,
    FiMapPin
} from 'react-icons/fi';

const containerStyle = { width: '100%', height: '100%' };

// ---------- Helpers ----------
// Safely parses timestamp strings appending 'Z' to naive UTC strings
const formatTime = (dateValue) => {
    if (!dateValue) return '';
    let str = dateValue;
    if (typeof str === 'string' && !str.endsWith('Z') && !/([+-]\d{2}:?\d{2})$/.test(str)) {
        str = `${str}Z`;
    }
    const date = new Date(str);
    if (isNaN(date.getTime())) return dateValue;
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// ---------- Timeline Step Component ----------
const TimelineStep = ({ status, time, completed, isLast }) => (
    <div className="flex gap-4 relative">
        {!isLast && (
            <div className={`absolute left-[11px] top-7 bottom-[-10px] w-[2px] transition-colors duration-300 ${completed ? 'bg-blue-500' : 'bg-slate-200'}`} />
        )}
        <div className="relative z-10 flex flex-col items-center mt-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-[3px] transition-colors duration-300 ${completed ? 'bg-white border-blue-500' : 'bg-slate-50 border-slate-200'
                }`}>
                {completed && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
        </div>
        <div className="pb-8">
            <p className={`text-sm font-black uppercase tracking-wider transition-colors duration-300 ${completed ? 'text-slate-900' : 'text-slate-400'}`}>
                {status.replace(/_/g, ' ')}
            </p>
            {time && (
                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                    <FiClock size={12} className="text-slate-400" />
                    {formatTime(time)}
                </p>
            )}
        </div>
    </div>
);

// ---------- Main Component ----------
const TrackOrder = () => {
    const { orderId } = useParams();
    const [tracking, setTracking] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [mapError, setMapError] = useState(false);
    const [mapCenter, setMapCenter] = useState({ lat: 14.6819, lng: 77.6006 }); // fallback to Anantapur

    const fetchTracking = useCallback(async () => {
        try {
            const res = await api.get(`/orders/${orderId}/tracking`);
            setTracking(res.data);

            // center map on partner location if available
            if (res.data.partner_location?.lat && res.data.partner_location?.lng) {
                setMapCenter({
                    lat: res.data.partner_location.lat,
                    lng: res.data.partner_location.lng,
                });
            } else if (res.data.restaurant_lat && res.data.restaurant_lng) {
                setMapCenter({
                    lat: res.data.restaurant_lat,
                    lng: res.data.restaurant_lng,
                });
            }
        } catch (err) {
            toast.error('Failed to load tracking data');
        }
    }, [orderId]);

    const fetchTimeline = useCallback(async () => {
        try {
            const res = await api.get(`/orders/${orderId}/timeline`);
            setTimeline(res.data.timeline);
        } catch { }
    }, [orderId]);

    useEffect(() => {
        fetchTracking();
        fetchTimeline();
        const interval = setInterval(fetchTracking, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, [fetchTracking, fetchTimeline]);

    const getPath = () => {
        if (!tracking) return [];
        const points = [];
        if (tracking.restaurant_lat && tracking.restaurant_lng) {
            points.push({ lat: tracking.restaurant_lat, lng: tracking.restaurant_lng });
        }
        if (tracking.partner_location?.lat && tracking.partner_location?.lng) {
            points.push({ lat: tracking.partner_location.lat, lng: tracking.partner_location.lng });
        }
        if (tracking.delivery_lat && tracking.delivery_lng) {
            points.push({ lat: tracking.delivery_lat, lng: tracking.delivery_lng });
        }
        return points;
    };

    const path = getPath();

    if (!tracking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Locating your order...</p>
            </div>
        );
    }

    const isDelivered = tracking.delivery_status === 'DELIVERED';

    return (
        <div className="h-[calc(100vh-64px)] w-full flex flex-col lg:flex-row overflow-hidden bg-slate-50">

            {/* ---------- Left Sidebar (Scrollable Timeline) ---------- */}
            <div className="w-full lg:w-[420px] xl:w-[480px] h-[55vh] lg:h-full overflow-y-auto bg-white border-r border-slate-200 p-5 sm:p-8 flex flex-col gap-8 shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] order-2 lg:order-1 scrollbar-hide">

                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <Link to="/orders" className="h-10 w-10 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
                        <FiArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                            Order #{orderId}
                        </h1>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Live Tracking Dashboard</p>
                    </div>
                </div>

                {/* Delivery Success Card */}
                {isDelivered && (
                    <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[1.5rem] flex items-center gap-4 shadow-lg shadow-emerald-200">
                        <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center text-white shrink-0 backdrop-blur-md border border-white/30">
                            <FiCheckCircle size={24} />
                        </div>
                        <div className="text-white">
                            <h3 className="font-black text-lg leading-tight">Delivered</h3>
                            <p className="font-medium text-emerald-50 text-xs mt-0.5">Your food arrived safely. Enjoy!</p>
                        </div>
                    </div>
                )}

                {/* Status Card */}
                <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 sm:p-7">
                    <h3 className="font-black text-sm text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <FiNavigation className="text-blue-500" /> Current Status
                    </h3>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <span className="text-xs font-bold text-slate-500">Order Stage</span>
                            <span className="font-black text-sm text-slate-900">{tracking.status.replace(/_/g, ' ')}</span>
                        </div>

                        {tracking.delivery_status && (
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-500">Delivery Stage</span>
                                <span className="font-black text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100/50">
                                    {tracking.delivery_status.replace(/_/g, ' ')}
                                </span>
                            </div>
                        )}

                        {tracking.estimated_delivery && !isDelivered && (
                            <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-col items-center justify-center text-center">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <FiClock /> Estimated Arrival
                                </div>
                                <p className="text-4xl font-black text-slate-900">
                                    {formatTime(tracking.estimated_delivery)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1">
                    <h3 className="font-black text-sm text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <FiPackage className="text-indigo-500" /> Journey Timeline
                    </h3>
                    <div className="pl-3">
                        {timeline.length === 0 ? (
                            <p className="text-sm font-medium text-slate-500">Updating timeline...</p>
                        ) : (
                            timeline.map((step, idx) => (
                                <TimelineStep
                                    key={idx}
                                    status={step.status}
                                    time={step.time}
                                    completed={step.completed}
                                    isLast={idx === timeline.length - 1}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ---------- Right Map Area (100% Height) ---------- */}
            <div className="h-[45vh] lg:h-full flex-1 relative bg-slate-200 order-1 lg:order-2 z-0">
                <LoadScript
                    googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
                    onError={() => setMapError(true)}
                >
                    {mapError ? (
                        <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-500 p-8 text-center">
                            <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                <FiMapPin size={24} />
                            </div>
                            <p className="text-xl font-black text-slate-900 mb-2">Map Unavailable</p>
                            <p className="text-sm font-medium">We couldn't load Google Maps. Please check your connection.</p>
                        </div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={mapCenter}
                            zoom={14}
                            options={{
                                disableDefaultUI: false,
                                zoomControl: true,
                                streetViewControl: false,
                                mapTypeControl: false,
                                styles: [
                                    {
                                        featureType: 'poi',
                                        elementType: 'labels',
                                        stylers: [{ visibility: 'off' }]
                                    }
                                ]
                            }}
                        >
                            {/* Restaurant Marker */}
                            {tracking.restaurant_lat && tracking.restaurant_lng && (
                                <Marker
                                    position={{ lat: tracking.restaurant_lat, lng: tracking.restaurant_lng }}
                                    label={{ text: 'R', color: 'white', fontWeight: 'bold', fontSize: '12px' }}
                                    options={{
                                        icon: {
                                            path: window.google?.maps?.SymbolPath?.CIRCLE,
                                            fillColor: '#f59e0b',
                                            fillOpacity: 1,
                                            strokeWeight: 0,
                                            scale: 16,
                                        }
                                    }}
                                />
                            )}

                            {/* Delivery Address Marker */}
                            {tracking.delivery_lat && tracking.delivery_lng && (
                                <Marker
                                    position={{ lat: tracking.delivery_lat, lng: tracking.delivery_lng }}
                                    label={{ text: 'H', color: 'white', fontWeight: 'bold', fontSize: '12px' }}
                                    options={{
                                        icon: {
                                            path: window.google?.maps?.SymbolPath?.CIRCLE,
                                            fillColor: '#10b981',
                                            fillOpacity: 1,
                                            strokeWeight: 0,
                                            scale: 16,
                                        }
                                    }}
                                />
                            )}

                            {/* Delivery Partner Marker */}
                            {tracking.partner_location?.lat && tracking.partner_location?.lng && (
                                <Marker
                                    position={{
                                        lat: tracking.partner_location.lat,
                                        lng: tracking.partner_location.lng,
                                    }}
                                    options={{
                                        icon: {
                                            path: window.google?.maps?.SymbolPath?.CIRCLE,
                                            fillColor: '#3b82f6', // Clean Blue Circle instead of breaking image
                                            fillOpacity: 1,
                                            strokeColor: '#ffffff',
                                            strokeWeight: 3,
                                            scale: 12,
                                        }
                                    }}
                                    zIndex={999}
                                />
                            )}

                            {/* Path Polyline */}
                            {path.length >= 2 && (
                                <Polyline
                                    path={path}
                                    options={{
                                        strokeColor: '#3b82f6',
                                        strokeOpacity: 0.8,
                                        strokeWeight: 5,
                                        geodesic: true,
                                    }}
                                />
                            )}
                        </GoogleMap>
                    )}
                </LoadScript>

                {/* Live Tracking Floating Pill */}
                {!mapError && tracking.partner_location?.lat && !isDelivered && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-700 flex items-center gap-3">
                        <div className="h-2.5 w-2.5 bg-blue-500 rounded-full animate-ping relative">
                            <div className="absolute inset-0 h-full w-full bg-blue-500 rounded-full" />
                        </div>
                        <span className="text-xs font-bold tracking-wider text-white uppercase">Live GPS Active</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackOrder;