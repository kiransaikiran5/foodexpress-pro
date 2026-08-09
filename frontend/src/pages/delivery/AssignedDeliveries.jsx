import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiAlertCircle,
    FiCalendar,
    FiCheckCircle,
    FiClock,
    FiCrosshair,
    FiEdit2,
    FiMap,
    FiMapPin,
    FiNavigation,
    FiPackage,
    FiRefreshCw,
    FiShoppingBag,
    FiTruck,
} from 'react-icons/fi';

/* -------- Status Configuration -------- */
const STATUS_CONFIG = {
    ASSIGNED: {
        label: 'Assigned',
        icon: FiPackage,
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
        gradient: 'from-blue-500 to-cyan-500',
    },
    PICKED_UP: {
        label: 'Picked Up',
        icon: FiShoppingBag,
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
        gradient: 'from-amber-500 to-orange-500',
    },
    IN_TRANSIT: {
        label: 'In Transit',
        icon: FiNavigation,
        badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        dot: 'bg-indigo-500',
        gradient: 'from-indigo-500 to-violet-500',
    },
    DELIVERED: {
        label: 'Delivered',
        icon: FiCheckCircle,
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
        gradient: 'from-emerald-500 to-green-500',
    },
};

/* -------- Main Component -------- */
const AssignedDeliveries = () => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationMessage, setLocationMessage] = useState('');
    const [lastLocation, setLastLocation] = useState(null);
    const [etaInput, setEtaInput] = useState({});

    // ----- Fetch deliveries -----
    const fetchDeliveries = useCallback(async ({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        try {
            const response = await api.get('/delivery/assigned');
            setDeliveries(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            setDeliveries([]);
            toast.error(error.response?.data?.detail || 'Failed to load deliveries');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDeliveries();
        const interval = setInterval(() => fetchDeliveries({ silent: true }), 30000);
        return () => clearInterval(interval);
    }, [fetchDeliveries]);

    // ----- Stats -----
    const dashboardStats = useMemo(() => {
        const active = deliveries.filter(d => d.status !== 'DELIVERED').length;
        const inTransit = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
        const delivered = deliveries.filter(d => d.status === 'DELIVERED').length;
        const totalValue = deliveries.reduce(
            (sum, d) => sum + Number(d.order_summary?.total || d.order_summary?.total_amount || 0),
            0
        );
        return { total: deliveries.length, active, inTransit, delivered, totalValue };
    }, [deliveries]);

    // ----- Location helpers -----
    const updateLocation = async (latitude, longitude) => {
        setLocationLoading(true);
        setLocationMessage('');
        try {
            await api.put('/delivery/update-location', { latitude, longitude });
            setLastLocation({ latitude, longitude, updatedAt: new Date() });
            setLocationMessage('Location updated successfully.');
            toast.success('Your current location has been updated');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update location');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleShareLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by this browser');
            return;
        }
        setLocationLoading(true);
        setLocationMessage('Requesting your current location...');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                await updateLocation(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                setLocationLoading(false);
                setLocationMessage('');
                let msg = 'Unable to retrieve your location';
                if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied. Please allow access.';
                else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Your current location is unavailable.';
                else if (error.code === error.TIMEOUT) msg = 'Location request timed out. Try again.';
                toast.error(msg);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const handleManualLocation = async (e) => {
        e.preventDefault();
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (isNaN(lat) || isNaN(lng)) {
            toast.error('Enter valid latitude and longitude');
            return;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            toast.error('Coordinates out of range');
            return;
        }
        await updateLocation(lat, lng);
        setManualLat('');
        setManualLng('');
    };

    // ----- Update status -----
    const updateStatus = async (deliveryId, status, estimatedDelivery = null) => {
        if (processingId) return;
        setProcessingId(deliveryId);
        try {
            const payload = { status };
            if (estimatedDelivery) {
                const etaDate = new Date(estimatedDelivery);
                if (isNaN(etaDate.getTime())) {
                    toast.error('Please select a valid ETA');
                    setProcessingId(null);
                    return;
                }
                payload.estimated_delivery = etaDate.toISOString();
            }
            await api.put(`/delivery/update-status/${deliveryId}`, payload);
            toast.success(getStatusSuccessMessage(status));

            // Clear local ETA override once successfully saved
            setEtaInput(prev => {
                const updated = { ...prev };
                delete updated[deliveryId];
                return updated;
            });

            await fetchDeliveries({ silent: true });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update delivery status');
        } finally {
            setProcessingId(null);
        }
    };

    // ----- Handlers -----
    const handlePickup = (id) => updateStatus(id, 'PICKED_UP');

    const handleStartTransit = (id, currentEtaValue) => {
        const finalEta = currentEtaValue || new Date(Date.now() + 30 * 60 * 1000).toISOString();
        updateStatus(id, 'IN_TRANSIT', finalEta);
    };

    const handleUpdateEta = (id, currentEtaValue) => {
        if (!currentEtaValue) {
            toast.error('Please select a new estimated delivery time');
            return;
        }
        const delivery = deliveries.find(d => (d.delivery_id || d.id) === id);
        if (!delivery) return;
        updateStatus(id, delivery.status, currentEtaValue);
    };

    const handleMarkDelivered = (id) => updateStatus(id, 'DELIVERED');

    // ----- Render -----
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                {/* Header / Stats */}
                <section className="relative mb-8 overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-2xl sm:px-10">
                    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-950/30">
                                <FiTruck className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">FoodExpress Pro</p>
                                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">My Deliveries</h1>
                                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                                    Track assigned orders, share your location, manage ETA, and update delivery status.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchDeliveries({ silent: true })}
                            disabled={refreshing}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh Deliveries'}
                        </button>
                    </div>

                    <div className="relative z-10 mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <SummaryCard label="Assigned" value={dashboardStats.total} icon={<FiPackage />} />
                        <SummaryCard label="Active" value={dashboardStats.active} icon={<FiTruck />} />
                        <SummaryCard label="In Transit" value={dashboardStats.inTransit} icon={<FiNavigation />} />
                        <SummaryCard label="Delivered" value={dashboardStats.delivered} icon={<FiCheckCircle />} />
                        <SummaryCard label="Order Value" value={formatCurrency(dashboardStats.totalValue)} icon={<FiShoppingBag />} />
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
                    {/* Location Panel */}
                    <aside className="xl:sticky xl:top-6 xl:self-start">
                        <LocationPanel
                            manualLat={manualLat}
                            manualLng={manualLng}
                            setManualLat={setManualLat}
                            setManualLng={setManualLng}
                            locationLoading={locationLoading}
                            locationMessage={locationMessage}
                            lastLocation={lastLocation}
                            onShareLocation={handleShareLocation}
                            onManualSubmit={handleManualLocation}
                        />
                    </aside>

                    {/* Deliveries List */}
                    <section>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Active assignments</h2>
                                <p className="mt-1 text-sm text-slate-500">Auto‑refreshes every 30 seconds.</p>
                            </div>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                                {deliveries.length} {deliveries.length === 1 ? 'delivery' : 'deliveries'}
                            </span>
                        </div>

                        {loading ? (
                            <LoadingState />
                        ) : deliveries.length === 0 ? (
                            <EmptyState refreshing={refreshing} onRefresh={() => fetchDeliveries({ silent: true })} />
                        ) : (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {deliveries.map((delivery) => {
                                    const dId = delivery.delivery_id || delivery.id;

                                    return (
                                        <DeliveryCard
                                            key={dId}
                                            delivery={delivery}
                                            etaValue={etaInput[dId]}
                                            onEtaChange={(value) =>
                                                setEtaInput((prev) => ({ ...prev, [dId]: value }))
                                            }
                                            isProcessing={processingId === dId}
                                            onPickup={handlePickup}
                                            onStartTransit={handleStartTransit}
                                            onUpdateEta={handleUpdateEta}
                                            onMarkDelivered={handleMarkDelivered}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
};

/* -------- Sub‑components -------- */

const LocationPanel = ({
    manualLat,
    manualLng,
    setManualLat,
    setManualLng,
    locationLoading,
    locationMessage,
    lastLocation,
    onShareLocation,
    onManualSubmit,
}) => {
    const hasCoordinates = manualLat.trim() && manualLng.trim();
    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                        <FiMap className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold">Location Tracking</h2>
                        <p className="text-xs text-blue-100">Keep your current position updated</p>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                        <FiCrosshair className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Use live GPS</p>
                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                Allow browser location access to update your current coordinates.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onShareLocation}
                        disabled={locationLoading}
                        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                        {locationLoading ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <FiCrosshair className="h-4 w-4" />
                                Update Using GPS
                            </>
                        )}
                    </button>
                </div>

                {locationMessage && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                        <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {locationMessage}
                    </div>
                )}

                {lastLocation && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Last shared location</p>
                        <div className="mt-3 space-y-2">
                            <CoordinateRow label="Latitude" value={lastLocation.latitude} />
                            <CoordinateRow label="Longitude" value={lastLocation.longitude} />
                        </div>
                        <p className="mt-3 text-xs text-slate-400">
                            Updated at {lastLocation.updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                )}

                <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Manual coordinates</span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={onManualSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="latitude" className="mb-2 block text-sm font-semibold text-slate-700">
                            Latitude
                        </label>
                        <div className="relative">
                            <FiMapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                id="latitude"
                                type="number"
                                step="any"
                                value={manualLat}
                                onChange={(e) => setManualLat(e.target.value)}
                                placeholder="12.9716"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="longitude" className="mb-2 block text-sm font-semibold text-slate-700">
                            Longitude
                        </label>
                        <div className="relative">
                            <FiNavigation className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                id="longitude"
                                type="number"
                                step="any"
                                value={manualLng}
                                onChange={(e) => setManualLng(e.target.value)}
                                placeholder="77.5946"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!hasCoordinates || locationLoading}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FiMap className="h-4 w-4" />
                        Save Coordinates
                    </button>
                </form>
            </div>
        </section>
    );
};

const DeliveryCard = ({
    delivery,
    etaValue,
    onEtaChange,
    isProcessing,
    onPickup,
    onStartTransit,
    onUpdateEta,
    onMarkDelivered,
}) => {
    const order = delivery.order_summary || {};
    const dId = delivery.delivery_id || delivery.id;
    const statusConfig = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.ASSIGNED;

    // Safely parse existing ETA to perfectly populate the datetime-local input
    const currentEtaValue = etaValue !== undefined
        ? etaValue
        : getLocalDatetime(delivery.estimated_delivery);

    const totalItems = (order.items || []).reduce(
        (sum, item) => sum + Number(item.qty ?? item.quantity ?? 0),
        0
    );
    const showEtaEditor = ['PICKED_UP', 'IN_TRANSIT'].includes(delivery.status);

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className={`h-1.5 bg-gradient-to-r ${statusConfig.gradient}`} />
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusConfig.dot}`} />
                        <h3 className="truncate text-xl font-bold text-slate-900">Order #{delivery.order_id}</h3>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <FiClock className="h-3.5 w-3.5" />
                        {formatDateTime(delivery.pickup_time || delivery.created_at)}
                    </p>
                </div>
                <DeliveryStatusBadge status={delivery.status} />
            </div>

            <div className="flex flex-1 flex-col p-5">
                {/* Order Value */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-4 text-white">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Order value</p>
                        <p className="mt-1 text-xl font-black">{formatCurrency(order.total ?? order.total_amount)}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-blue-300">
                        <FiShoppingBag className="h-5 w-5" />
                    </div>
                </div>

                {/* Route */}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="relative space-y-5">
                        <div className="absolute bottom-7 left-[17px] top-7 w-px border-l-2 border-dashed border-slate-300" />
                        <LocationPoint
                            icon={<FiMapPin />}
                            iconClass="bg-red-50 text-red-500"
                            label="Pickup location"
                            title={order.restaurant_name || 'Restaurant'}
                            description={order.restaurant_address || 'Collect the order from this restaurant.'}
                        />
                        <LocationPoint
                            icon={<FiNavigation />}
                            iconClass="bg-emerald-50 text-emerald-600"
                            label="Delivery destination"
                            title={order.customer_name || 'Customer'}
                            description={order.delivery_address || order.customer_address || 'Customer delivery address'}
                        />
                    </div>
                </div>

                {/* Items */}
                <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Items to deliver</h4>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                        {order.items?.length ? (
                            order.items.map((item, idx) => (
                                <DeliveryItem key={item.id || `${item.name}-${idx}`} item={item} />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                                No order items available
                            </div>
                        )}
                    </div>
                </div>

                {/* Live ETA Display */}
                {delivery.estimated_delivery && (
                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-700">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                            <FiClock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider">Estimated arrival</p>
                            <p className="mt-1 text-sm font-semibold">{formatDateTime(delivery.estimated_delivery)}</p>
                        </div>
                    </div>
                )}

                {/* ETA Editor */}
                {showEtaEditor && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label htmlFor={`eta-${dId}`} className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <FiCalendar className="h-4 w-4" />
                            Set or update ETA
                        </label>
                        <input
                            id={`eta-${dId}`}
                            type="datetime-local"
                            min={getMinimumDateTime()}
                            value={currentEtaValue}
                            onChange={(e) => onEtaChange(e.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                        />
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                            Leave empty when starting transit to use a default ETA of 30 minutes.
                        </p>
                        {delivery.status === 'IN_TRANSIT' && (
                            <button
                                type="button"
                                onClick={() => onUpdateEta(dId, currentEtaValue)}
                                disabled={isProcessing || !currentEtaValue}
                                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FiEdit2 className="h-4 w-4" />
                                Update ETA
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-5">
                    <DeliveryAction
                        delivery={delivery}
                        isProcessing={isProcessing}
                        hasCustomEta={Boolean(currentEtaValue)}
                        onPickup={() => onPickup(dId)}
                        onStartTransit={() => onStartTransit(dId, currentEtaValue)}
                        onMarkDelivered={() => onMarkDelivered(dId)}
                    />
                </div>
            </div>
        </article>
    );
};

const DeliveryAction = ({
    delivery,
    isProcessing,
    hasCustomEta,
    onPickup,
    onStartTransit,
    onMarkDelivered,
}) => {
    if (isProcessing) {
        return (
            <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
                Updating delivery...
            </div>
        );
    }

    switch (delivery.status) {
        case 'ASSIGNED':
            return (
                <button
                    type="button"
                    onClick={onPickup}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-bold text-white shadow-md shadow-amber-200 transition hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-4 focus:ring-amber-100"
                >
                    <FiCheckCircle className="h-5 w-5" />
                    Confirm Pickup
                </button>
            );
        case 'PICKED_UP':
            return (
                <button
                    type="button"
                    onClick={onStartTransit}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:from-indigo-600 hover:to-violet-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                    <FiNavigation className="h-5 w-5" />
                    {hasCustomEta ? 'Set ETA & Start Transit' : 'Start Transit — 30 Min ETA'}
                </button>
            );
        case 'IN_TRANSIT':
            return (
                <button
                    type="button"
                    onClick={onMarkDelivered}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-green-600 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                    <FiCheckCircle className="h-5 w-5" />
                    Mark as Delivered
                </button>
            );
        case 'DELIVERED':
            return (
                <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">
                    <FiCheckCircle className="h-5 w-5" />
                    Delivery Completed
                </div>
            );
        default:
            return null;
    }
};

const DeliveryStatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.ASSIGNED;
    const Icon = config.icon;
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${config.badge}`}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </span>
    );
};

const DeliveryItem = ({ item }) => {
    const quantity = Number(item.qty ?? item.quantity ?? 0);
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-blue-100 hover:bg-blue-50/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200">
                {quantity}×
            </span>
            <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-5 text-slate-900">{item.name || item.food_name || 'Food item'}</p>
                {item.special_instructions && (
                    <p className="mt-1 line-clamp-2 text-xs text-orange-600">Note: {item.special_instructions}</p>
                )}
            </div>
        </div>
    );
};

const LocationPoint = ({ icon, iconClass, label, title, description }) => (
    <div className="relative z-10 flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-1 break-words text-xs leading-5 text-slate-500">{description}</p>
        </div>
    </div>
);

const CoordinateRow = ({ label, value }) => (
    <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="truncate font-semibold text-slate-800">{Number(value).toFixed(6)}</span>
    </div>
);

const SummaryCard = ({ label, value, icon }) => (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg text-blue-300">{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">{label}</p>
            <p className="mt-1 truncate text-lg font-bold text-white sm:text-xl">{value}</p>
        </div>
    </div>
);

const LoadingState = () => (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="h-1.5 animate-pulse bg-slate-200" />
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                    <div>
                        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
                </div>
                <div className="space-y-4 p-5">
                    <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                </div>
            </div>
        ))}
    </div>
);

const EmptyState = ({ refreshing, onRefresh }) => (
    <div className="flex min-h-[450px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-300">
                <FiTruck className="h-11 w-11" />
            </div>
            <span className="absolute bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white">
                <FiCheckCircle className="h-4 w-4" />
            </span>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-900">No active deliveries</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            You do not currently have any assigned deliveries. Stay available and refresh to check for new assignments.
        </p>
        <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Checking...' : 'Check for Deliveries'}
        </button>
    </div>
);

/* -------- Utilities -------- */
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(amount || 0));

// Safely appends 'Z' to string dates that don't have a timezone offset specified, ensuring UTC conversion.
const ensureUTC = (dateValue) => {
    if (typeof dateValue !== 'string') return dateValue;
    if (!dateValue.endsWith('Z') && !/([+-]\d{2}:?\d{2})$/.test(dateValue)) {
        return `${dateValue}Z`;
    }
    return dateValue;
};

// Explicitly forces AM/PM (12-hour) format
const formatDateTime = (dateValue) => {
    if (!dateValue) return 'Time not available';
    const date = new Date(ensureUTC(dateValue));
    if (isNaN(date.getTime())) return 'Time not available';
    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Converts an ISO string exactly into the "YYYY-MM-DDTHH:mm" format matching the user's local timezone.
const getLocalDatetime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(ensureUTC(dateString));
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getMinimumDateTime = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getStatusSuccessMessage = (status) => {
    const messages = {
        PICKED_UP: 'Order pickup confirmed',
        IN_TRANSIT: 'Delivery started successfully',
        DELIVERED: 'Order marked as delivered',
    };
    return messages[status] || `Status updated to ${status.replace(/_/g, ' ').toLowerCase()}`;
};

export default AssignedDeliveries;