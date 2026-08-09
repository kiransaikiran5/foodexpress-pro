import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiAlertCircle,
    FiCheck,
    FiCheckCircle,
    FiChevronRight,
    FiClock,
    FiCoffee,
    FiInbox,
    FiPackage,
    FiRefreshCw,
    FiShoppingBag,
    FiX,
    FiXCircle,
    FiMapPin,
} from 'react-icons/fi';

const FILTERS = [
    {
        value: 'PLACED',
        label: 'New Orders',
        shortLabel: 'New',
        icon: FiShoppingBag,
    },
    {
        value: 'ACCEPTED',
        label: 'Accepted',
        shortLabel: 'Accepted',
        icon: FiCheck,
    },
    {
        value: 'PREPARING',
        label: 'Preparing',
        shortLabel: 'Preparing',
        icon: FiCoffee,
    },
    {
        value: 'READY',
        label: 'Ready',
        shortLabel: 'Ready',
        icon: FiCheckCircle,
    },
];

const STATUS_CONFIG = {
    PLACED: {
        label: 'New Order',
        icon: FiClock,
        badge:
            'border-blue-200 bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
        accent: 'from-blue-500 to-cyan-500',
    },

    ACCEPTED: {
        label: 'Accepted',
        icon: FiCheck,
        badge:
            'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
        accent: 'from-amber-500 to-orange-500',
    },

    PREPARING: {
        label: 'Preparing',
        icon: FiCoffee,
        badge:
            'border-violet-200 bg-violet-50 text-violet-700',
        dot: 'bg-violet-500',
        accent: 'from-violet-500 to-indigo-500',
    },

    READY: {
        label: 'Ready',
        icon: FiCheckCircle,
        badge:
            'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
        accent: 'from-emerald-500 to-green-500',
    },

    REJECTED: {
        label: 'Rejected',
        icon: FiXCircle,
        badge:
            'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
        accent: 'from-red-500 to-rose-500',
    },

    CANCELLED: {
        label: 'Cancelled',
        icon: FiX,
        badge:
            'border-slate-200 bg-slate-100 text-slate-700',
        dot: 'bg-slate-500',
        accent: 'from-slate-500 to-slate-700',
    },
};

const Kitchen = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('PLACED');
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const [rejectOrderId, setRejectOrderId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Fetch branches once
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data || []);
            } catch {
                // non‑critical
            }
        };
        fetchBranches();
    }, []);

    const fetchOrders = useCallback(
        async ({ silent = false } = {}) => {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            try {
                const params = {};
                if (filter) params.status = filter;
                if (selectedBranch) params.branch_id = selectedBranch;

                const response = await api.get('/kitchen/orders', { params });

                setOrders(
                    Array.isArray(response.data)
                        ? response.data
                        : []
                );
            } catch (error) {
                setOrders([]);
                toast.error(
                    error.response?.data?.detail ||
                    'Failed to load kitchen orders'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [filter, selectedBranch]
    );

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const orderSummary = useMemo(() => {
        return {
            totalOrders: orders.length,

            totalItems: orders.reduce(
                (total, order) =>
                    total +
                    (order.items || []).reduce(
                        (itemTotal, item) =>
                            itemTotal +
                            Number(item.quantity || 0),
                        0
                    ),
                0
            ),

            totalValue: orders.reduce(
                (total, order) =>
                    total +
                    Number(order.total_amount || 0),
                0
            ),
        };
    }, [orders]);

    const handleAccept = async (orderId) => {
        if (processingId) return;

        setProcessingId(orderId);

        try {
            await api.put(
                `/kitchen/orders/${orderId}/accept`
            );

            toast.success(
                `Order #${orderId} accepted successfully`
            );

            await fetchOrders({ silent: true });
        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                'Failed to accept order'
            );
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (orderId) => {
        setRejectOrderId(orderId);
        setRejectionReason('');
    };

    const closeRejectModal = () => {
        if (processingId) return;

        setRejectOrderId(null);
        setRejectionReason('');
    };

    const handleReject = async () => {
        if (!rejectOrderId || processingId) return;

        const reason =
            rejectionReason.trim() || 'Item unavailable';

        setProcessingId(rejectOrderId);

        try {
            await api.put(
                `/kitchen/orders/${rejectOrderId}/reject`,
                null,
                {
                    params: {
                        reason,
                    },
                }
            );

            toast.success(
                `Order #${rejectOrderId} rejected`
            );

            setRejectOrderId(null);
            setRejectionReason('');

            await fetchOrders({ silent: true });
        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                'Failed to reject order'
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleStatusUpdate = async (
        orderId,
        newStatus
    ) => {
        if (processingId) return;

        setProcessingId(orderId);

        try {
            await api.put(
                `/kitchen/orders/${orderId}/status`,
                null,
                {
                    params: {
                        new_status: newStatus,
                    },
                }
            );

            const message =
                newStatus === 'PREPARING'
                    ? `Order #${orderId} is now being prepared`
                    : `Order #${orderId} is ready`;

            toast.success(message);

            await fetchOrders({ silent: true });
        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                'Failed to update order status'
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleFilterChange = (status) => {
        if (status === filter) return;

        setFilter(status);
        setOrders([]);
    };

    return (
        <>
            <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-orange-50/40 px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-[1500px]">
                    {/* Header */}
                    <section className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
                        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-red-500/20 blur-3xl" />

                        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />

                        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-950/30">
                                    <FiCoffee className="h-7 w-7" />
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
                                        FoodExpress Pro
                                    </p>

                                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                                        Kitchen Dashboard
                                    </h1>

                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                                        Manage incoming orders,
                                        preparation progress, and
                                        completed meals from one
                                        dashboard.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    fetchOrders({
                                        silent: true,
                                    })
                                }
                                disabled={refreshing}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                                <FiRefreshCw
                                    className={`h-4 w-4 ${refreshing
                                        ? 'animate-spin'
                                        : ''
                                        }`}
                                />

                                {refreshing
                                    ? 'Refreshing...'
                                    : 'Refresh Orders'}
                            </button>
                        </div>

                        {/* Summary cards */}
                        <div className="relative z-10 mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <SummaryCard
                                label="Orders"
                                value={orderSummary.totalOrders}
                                icon={<FiShoppingBag />}
                            />

                            <SummaryCard
                                label="Items to Prepare"
                                value={orderSummary.totalItems}
                                icon={<FiPackage />}
                            />

                            <SummaryCard
                                label="Order Value"
                                value={formatCurrency(
                                    orderSummary.totalValue
                                )}
                                icon={<FiCheckCircle />}
                            />
                        </div>
                    </section>

                    {/* Filter navigation + branch filter */}
                    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 flex-1">
                                {FILTERS.map((item) => {
                                    const Icon = item.icon;
                                    const isActive =
                                        filter === item.value;

                                    return (
                                        <button
                                            type="button"
                                            key={item.value}
                                            onClick={() =>
                                                handleFilterChange(
                                                    item.value
                                                )
                                            }
                                            className={`relative flex min-w-[145px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition sm:min-w-0 ${isActive
                                                ? 'bg-slate-900 text-white shadow-md'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                        >
                                            <Icon className="h-4 w-4" />

                                            <span className="hidden sm:inline">
                                                {item.label}
                                            </span>

                                            <span className="sm:hidden">
                                                {item.shortLabel}
                                            </span>

                                            {isActive && (
                                                <span className="absolute bottom-1 h-1 w-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Branch filter */}
                            <div className="px-2 sm:px-0 sm:w-48">
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => {
                                        setSelectedBranch(e.target.value);
                                        setOrders([]);
                                    }}
                                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Content */}
                    {loading ? (
                        <LoadingState />
                    ) : orders.length === 0 ? (
                        <EmptyState
                            filter={filter}
                            onRefresh={() =>
                                fetchOrders({
                                    silent: true,
                                })
                            }
                            refreshing={refreshing}
                        />
                    ) : (
                        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {orders.map((order) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    isProcessing={
                                        processingId === order.id
                                    }
                                    onAccept={handleAccept}
                                    onReject={openRejectModal}
                                    onStatusUpdate={
                                        handleStatusUpdate
                                    }
                                />
                            ))}
                        </section>
                    )}
                </div>
            </main>

            {rejectOrderId && (
                <RejectOrderModal
                    orderId={rejectOrderId}
                    reason={rejectionReason}
                    setReason={setRejectionReason}
                    isLoading={
                        processingId === rejectOrderId
                    }
                    onClose={closeRejectModal}
                    onConfirm={handleReject}
                />
            )}
        </>
    );
};

const OrderCard = ({
    order,
    isProcessing,
    onAccept,
    onReject,
    onStatusUpdate,
}) => {
    const statusConfig =
        STATUS_CONFIG[order.status] ||
        STATUS_CONFIG.CANCELLED;

    const totalQuantity = (order.items || []).reduce(
        (total, item) =>
            total + Number(item.quantity || 0),
        0
    );

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
            <div
                className={`h-1.5 w-full bg-gradient-to-r ${statusConfig.accent}`}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusConfig.dot}`}
                        />

                        <h2 className="truncate text-xl font-bold text-slate-900">
                            Order #{order.id}
                        </h2>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <FiClock className="h-3.5 w-3.5" />

                            {formatOrderTime(
                                order.created_at
                            )}
                        </span>

                        <span className="h-1 w-1 rounded-full bg-slate-300" />

                        <span>
                            {totalQuantity}{' '}
                            {totalQuantity === 1
                                ? 'item'
                                : 'items'}
                        </span>

                        {order.branch_name && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                    <FiMapPin className="h-3 w-3" />
                                    {order.branch_name}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <OrderStatusBadge
                    status={order.status}
                />
            </div>

            {/* Items */}
            <div className="flex flex-1 flex-col p-5">
                <div className="mb-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Items to prepare
                        </h3>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            {order.items?.length || 0}{' '}
                            varieties
                        </span>
                    </div>

                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                        {order.items?.length ? (
                            order.items.map((item) => (
                                <OrderItem
                                    key={item.id}
                                    item={item}
                                />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                                No items available
                            </div>
                        )}
                    </div>
                </div>

                {order.rejection_reason && (
                    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                        <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                                Rejection reason
                            </p>

                            <p className="mt-1 text-sm leading-5 text-red-600">
                                {order.rejection_reason}
                            </p>
                        </div>
                    </div>
                )}

                {/* Total */}
                <div className="mt-auto flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3.5 text-white">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Order total
                        </p>

                        <p className="mt-0.5 text-xl font-black">
                            {formatCurrency(
                                order.total_amount
                            )}
                        </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                        <FiShoppingBag className="h-5 w-5 text-orange-300" />
                    </div>
                </div>
            </div>

            {/* Actions */}
            {['PLACED', 'ACCEPTED', 'PREPARING'].includes(
                order.status
            ) && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                        <OrderActions
                            order={order}
                            isProcessing={isProcessing}
                            onAccept={onAccept}
                            onReject={onReject}
                            onStatusUpdate={onStatusUpdate}
                        />
                    </div>
                )}
        </article>
    );
};

const OrderItem = ({ item }) => {
    const quantity = Number(item.quantity || 0);

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-orange-100 hover:bg-orange-50/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-200">
                {quantity}×
            </span>

            <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-5 text-slate-900">
                    {item.food_name ||
                        item.name ||
                        'Food item'}
                </p>

                {item.special_instructions && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-orange-600">
                        Note: {item.special_instructions}
                    </p>
                )}
            </div>

            <FiChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        </div>
    );
};

const OrderActions = ({
    order,
    isProcessing,
    onAccept,
    onReject,
    onStatusUpdate,
}) => {
    if (isProcessing) {
        return (
            <div className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-red-500" />
                Processing order...
            </div>
        );
    }

    if (order.status === 'PLACED') {
        return (
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => onReject(order.id)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-50"
                >
                    <FiX className="h-4 w-4" />
                    Reject
                </button>

                <button
                    type="button"
                    onClick={() => onAccept(order.id)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-green-600 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                    <FiCheck className="h-4 w-4" />
                    Accept
                </button>
            </div>
        );
    }

    if (order.status === 'ACCEPTED') {
        return (
            <button
                type="button"
                onClick={() =>
                    onStatusUpdate(
                        order.id,
                        'PREPARING'
                    )
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:-translate-y-0.5 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
            >
                <FiCoffee className="h-4 w-4" />
                Start Preparing
                <FiChevronRight className="h-4 w-4" />
            </button>
        );
    }

    if (order.status === 'PREPARING') {
        return (
            <button
                type="button"
                onClick={() =>
                    onStatusUpdate(order.id, 'READY')
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-green-600 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
                <FiCheckCircle className="h-4 w-4" />
                Mark as Ready
            </button>
        );
    }

    return null;
};

const OrderStatusBadge = ({ status }) => {
    const config =
        STATUS_CONFIG[status] ||
        STATUS_CONFIG.CANCELLED;

    const Icon = config.icon;

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${config.badge}`}
        >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </span>
    );
};

const SummaryCard = ({ label, value, icon }) => {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg text-orange-300">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {label}
                </p>

                <p className="mt-1 truncate text-xl font-bold text-white">
                    {value}
                </p>
            </div>
        </div>
    );
};

const LoadingState = () => {
    return (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                    key={item}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="h-1.5 animate-pulse bg-slate-200" />

                    <div className="flex items-center justify-between border-b border-slate-100 p-5">
                        <div>
                            <div className="h-5 w-28 animate-pulse rounded-lg bg-slate-200" />
                            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
                        </div>

                        <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
                    </div>

                    <div className="space-y-3 p-5">
                        {[1, 2, 3].map((row) => (
                            <div
                                key={row}
                                className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                            >
                                <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
                                <div className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
};

const EmptyState = ({
    filter,
    onRefresh,
    refreshing,
}) => {
    const filterDetails =
        FILTERS.find((item) => item.value === filter) ||
        FILTERS[0];

    return (
        <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                    <FiInbox className="h-11 w-11" />
                </div>

                <span className="absolute bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white">
                    <FiCheck className="h-4 w-4" />
                </span>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-slate-900">
                No {filterDetails.label.toLowerCase()}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                There are currently no orders with the{' '}
                <span className="font-semibold text-slate-700">
                    {filterDetails.label}
                </span>{' '}
                status. New orders will appear here
                automatically when refreshed.
            </p>

            <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <FiRefreshCw
                    className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''
                        }`}
                />

                {refreshing
                    ? 'Checking...'
                    : 'Check Again'}
            </button>
        </section>
    );
};

const RejectOrderModal = ({
    orderId,
    reason,
    setReason,
    isLoading,
    onClose,
    onConfirm,
}) => {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-order-title"
        >
            <button
                type="button"
                aria-label="Close rejection dialog"
                onClick={onClose}
                className="absolute inset-0 cursor-default"
            />

            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)]">
                <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />

                <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                <FiAlertCircle className="h-5 w-5" />
                            </div>

                            <div>
                                <h2
                                    id="reject-order-title"
                                    className="text-xl font-bold text-slate-900"
                                >
                                    Reject Order #{orderId}
                                </h2>

                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                    Give the customer a clear
                                    reason for rejecting this
                                    order.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            <FiX className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-6">
                        <label
                            htmlFor="rejection_reason"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Rejection reason
                        </label>

                        <textarea
                            id="rejection_reason"
                            value={reason}
                            onChange={(event) =>
                                setReason(event.target.value)
                            }
                            rows={4}
                            maxLength={250}
                            autoFocus
                            placeholder="Example: One of the ordered items is currently unavailable."
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                        />

                        <div className="mt-1 flex items-center justify-between">
                            <p className="text-xs text-slate-400">
                                An empty reason will use “Item
                                unavailable”.
                            </p>

                            <span className="text-xs font-medium text-slate-400">
                                {reason.length}/250
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white shadow-md shadow-red-200 transition hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    <FiXCircle className="h-4 w-4" />
                                    Reject Order
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const formatCurrency = (amount) => {
    const value = Number(amount || 0);

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(value);
};

const formatOrderTime = (dateValue) => {
    if (!dateValue) return 'Time unavailable';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return 'Time unavailable';
    }

    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default Kitchen;