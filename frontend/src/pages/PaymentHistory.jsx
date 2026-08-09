import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiCheckCircle,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiCreditCard,
    FiDollarSign,
    FiFileText,
    FiRefreshCw,
    FiSearch,
    FiShoppingBag,
    FiSmartphone,
    FiTruck,
    FiX,
    FiXCircle,
} from 'react-icons/fi';
import { FaUniversity } from 'react-icons/fa';

const STATUS_CONFIG = {
    SUCCESS: {
        label: 'Successful',
        icon: FiCheckCircle,
        badge:
            'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
        gradient: 'from-emerald-500 to-green-500',
    },

    FAILED: {
        label: 'Failed',
        icon: FiXCircle,
        badge: 'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
        gradient: 'from-red-500 to-rose-500',
    },

    PENDING: {
        label: 'Pending',
        icon: FiClock,
        badge:
            'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
        gradient: 'from-amber-500 to-orange-500',
    },

    REFUNDED: {
        label: 'Refunded',
        icon: FiRefreshCw,
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
        gradient: 'from-blue-500 to-cyan-500',
    },
};

const STATUS_FILTERS = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'SUCCESS', label: 'Successful' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'REFUNDED', label: 'Refunded' },
];

const METHOD_FILTERS = [
    { value: 'ALL', label: 'All Methods' },
    { value: 'CARD', label: 'Credit / Debit Card' },
    { value: 'UPI', label: 'UPI' },
    { value: 'NET_BANKING', label: 'Net Banking' },
    { value: 'WALLET', label: 'Wallet' },
    { value: 'COD', label: 'Cash on Delivery' },
];

const PAGE_SIZE = 8;

const PaymentHistory = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchPayments = useCallback(
        async ({ silent = false } = {}) => {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            try {
                const response = await api.get('/payments');

                const responseData = response.data;

                if (Array.isArray(responseData)) {
                    setPayments(responseData);
                } else if (Array.isArray(responseData?.items)) {
                    setPayments(responseData.items);
                } else if (Array.isArray(responseData?.payments)) {
                    setPayments(responseData.payments);
                } else {
                    setPayments([]);
                }
            } catch (error) {
                setPayments([]);

                toast.error(
                    getApiError(
                        error,
                        'Failed to load payment history'
                    )
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, methodFilter]);

    const paymentStats = useMemo(() => {
        const successfulPayments = payments.filter(
            (payment) =>
                normalizeValue(payment.status) === 'SUCCESS'
        );

        const pendingPayments = payments.filter(
            (payment) =>
                normalizeValue(payment.status) === 'PENDING'
        );

        const failedPayments = payments.filter(
            (payment) =>
                normalizeValue(payment.status) === 'FAILED'
        );

        const refundedPayments = payments.filter(
            (payment) =>
                normalizeValue(payment.status) === 'REFUNDED'
        );

        return {
            totalTransactions: payments.length,

            successfulCount: successfulPayments.length,

            pendingCount: pendingPayments.length,

            failedCount: failedPayments.length,

            successfulAmount: successfulPayments.reduce(
                (total, payment) =>
                    total + toNumber(payment.amount),
                0
            ),

            refundedAmount: refundedPayments.reduce(
                (total, payment) =>
                    total +
                    toNumber(
                        payment.refund_amount ??
                        payment.amount
                    ),
                0
            ),
        };
    }, [payments]);

    const filteredPayments = useMemo(() => {
        const normalizedSearch = searchTerm
            .trim()
            .toLowerCase();

        return [...payments]
            .filter((payment) => {
                const status = normalizeValue(
                    payment.status
                );

                const methodGroup = getMethodGroup(
                    payment.method ??
                    payment.payment_method
                );

                const statusMatches =
                    statusFilter === 'ALL' ||
                    status === statusFilter;

                const methodMatches =
                    methodFilter === 'ALL' ||
                    methodGroup === methodFilter;

                const searchableText = [
                    payment.id,
                    payment.order_id,
                    payment.transaction_id,
                    payment.payment_id,
                    payment.reference_id,
                    payment.gateway_payment_id,
                    payment.method,
                    payment.payment_method,
                    payment.status,
                    payment.amount,
                ]
                    .filter(
                        (value) =>
                            value !== null &&
                            value !== undefined
                    )
                    .join(' ')
                    .toLowerCase();

                const searchMatches =
                    !normalizedSearch ||
                    searchableText.includes(
                        normalizedSearch
                    );

                return (
                    statusMatches &&
                    methodMatches &&
                    searchMatches
                );
            })
            .sort((firstPayment, secondPayment) => {
                const firstDate = new Date(
                    firstPayment.created_at || 0
                ).getTime();

                const secondDate = new Date(
                    secondPayment.created_at || 0
                ).getTime();

                return secondDate - firstDate;
            });
    }, [
        payments,
        searchTerm,
        statusFilter,
        methodFilter,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredPayments.length / PAGE_SIZE)
    );

    const paginatedPayments = useMemo(() => {
        const startIndex =
            (currentPage - 1) * PAGE_SIZE;

        return filteredPayments.slice(
            startIndex,
            startIndex + PAGE_SIZE
        );
    }, [filteredPayments, currentPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('ALL');
        setMethodFilter('ALL');
        setCurrentPage(1);
    };

    const hasActiveFilters =
        searchTerm.trim() !== '' ||
        statusFilter !== 'ALL' ||
        methodFilter !== 'ALL';

    return (
        <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-red-50/50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px]">
                {/* Header */}
                <section className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-500/20 blur-3xl" />

                    <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-950/30">
                                <FiCreditCard className="h-7 w-7" />
                            </div>

                            <div>

                                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                                    Payment History
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                                    Review card, UPI, net
                                    banking, wallet, and cash on
                                    delivery transactions.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                fetchPayments({
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
                                : 'Refresh Payments'}
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
                        <SummaryCard
                            label="Transactions"
                            value={
                                paymentStats.totalTransactions
                            }
                            icon={<FiFileText />}
                        />

                        <SummaryCard
                            label="Successful"
                            value={
                                paymentStats.successfulCount
                            }
                            icon={<FiCheckCircle />}
                        />

                        <SummaryCard
                            label="Pending"
                            value={paymentStats.pendingCount}
                            icon={<FiClock />}
                        />

                        <SummaryCard
                            label="Failed"
                            value={paymentStats.failedCount}
                            icon={<FiXCircle />}
                        />

                        <SummaryCard
                            label="Amount Paid"
                            value={formatCurrency(
                                paymentStats.successfulAmount
                            )}
                            icon={<FiDollarSign />}
                        />
                    </div>
                </section>

                {/* Filter Section */}
                <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                        <div className="relative flex-1">
                            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(
                                        event.target.value
                                    )
                                }
                                placeholder="Search order ID, transaction ID or amount"
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50"
                            />

                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearchTerm('')
                                    }
                                    aria-label="Clear search"
                                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                                >
                                    <FiX className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[480px]">
                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target.value
                                    )
                                }
                                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                            >
                                {STATUS_FILTERS.map(
                                    (status) => (
                                        <option
                                            key={status.value}
                                            value={status.value}
                                        >
                                            {status.label}
                                        </option>
                                    )
                                )}
                            </select>

                            <select
                                value={methodFilter}
                                onChange={(event) =>
                                    setMethodFilter(
                                        event.target.value
                                    )
                                }
                                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                            >
                                {METHOD_FILTERS.map(
                                    (method) => (
                                        <option
                                            key={method.value}
                                            value={method.value}
                                        >
                                            {method.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Showing{' '}
                            <span className="font-bold text-slate-900">
                                {filteredPayments.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-bold text-slate-900">
                                {payments.length}
                            </span>{' '}
                            transactions
                        </p>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-red-500 transition hover:text-red-600"
                            >
                                <FiX className="h-4 w-4" />
                                Clear Filters
                            </button>
                        )}
                    </div>
                </section>

                {/* Payments */}
                {loading ? (
                    <PaymentLoadingState />
                ) : payments.length === 0 ? (
                    <EmptyPaymentState
                        refreshing={refreshing}
                        onRefresh={() =>
                            fetchPayments({
                                silent: true,
                            })
                        }
                    />
                ) : filteredPayments.length === 0 ? (
                    <NoResultsState
                        onClear={clearFilters}
                    />
                ) : (
                    <>
                        <section className="space-y-4">
                            {paginatedPayments.map(
                                (payment) => (
                                    <PaymentCard
                                        key={
                                            payment.id ??
                                            payment.transaction_id
                                        }
                                        payment={payment}
                                    />
                                )
                            )}
                        </section>

                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )}
            </div>
        </main>
    );
};

const PaymentCard = ({ payment }) => {
    const paymentMethod =
        payment.method ?? payment.payment_method;

    const methodConfig =
        getMethodConfig(paymentMethod);

    const MethodIcon = methodConfig.icon;

    const status =
        normalizeValue(payment.status) || 'PENDING';

    const statusConfig =
        STATUS_CONFIG[status] || {
            label: formatText(status),
            icon: FiFileText,
            badge:
                'border-slate-200 bg-slate-100 text-slate-700',
            dot: 'bg-slate-500',
            gradient: 'from-slate-500 to-slate-700',
        };

    const transactionId =
        payment.transaction_id ||
        payment.payment_id ||
        payment.reference_id ||
        payment.gateway_payment_id ||
        `PAY-${payment.id}`;

    return (
        <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
            <div
                className={`h-1 bg-gradient-to-r ${statusConfig.gradient}`}
            />

            <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${methodConfig.iconStyle}`}
                        >
                            <MethodIcon className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                                    Order #
                                    {payment.order_id ??
                                        'N/A'}
                                </h2>

                                <PaymentStatusBadge
                                    status={status}
                                />
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${methodConfig.tagStyle}`}
                                >
                                    <MethodIcon className="h-3.5 w-3.5" />
                                    {methodConfig.label}
                                </span>

                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                    <FiClock className="h-3.5 w-3.5" />

                                    {formatDateTime(
                                        payment.paid_at ??
                                        payment.created_at
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-5 border-t border-slate-100 pt-5 lg:min-w-[260px] lg:justify-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div className="lg:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Amount
                            </p>

                            <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                                {formatCurrency(
                                    payment.amount,
                                    payment.currency
                                )}
                            </p>
                        </div>

                        <span
                            className={`h-3 w-3 shrink-0 rounded-full ${statusConfig.dot} ring-4 ring-slate-100`}
                        />
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailItem
                        label="Transaction ID"
                        value={transactionId}
                    />

                    <DetailItem
                        label="Payment Method"
                        value={methodConfig.label}
                    />

                    <DetailItem
                        label="Payment Status"
                        value={statusConfig.label}
                    />

                    <DetailItem
                        label="Gateway"
                        value={
                            payment.gateway ||
                            payment.provider ||
                            (getMethodGroup(
                                paymentMethod
                            ) === 'COD'
                                ? 'Cash Payment'
                                : 'Not available')
                        }
                    />
                </div>

                {status === 'FAILED' &&
                    payment.failure_reason && (
                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
                            <FiXCircle className="mt-0.5 h-5 w-5 shrink-0" />

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider">
                                    Failure reason
                                </p>

                                <p className="mt-1 text-sm">
                                    {
                                        payment.failure_reason
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                {status === 'REFUNDED' && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-700">
                        <FiRefreshCw className="mt-0.5 h-5 w-5 shrink-0" />

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider">
                                Refund details
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                                Refunded amount:{' '}
                                {formatCurrency(
                                    payment.refund_amount ??
                                    payment.amount,
                                    payment.currency
                                )}
                            </p>

                            {payment.refund_reference && (
                                <p className="mt-1 break-all text-xs">
                                    Reference:{' '}
                                    {
                                        payment.refund_reference
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
};

const PaymentStatusBadge = ({ status }) => {
    const config =
        STATUS_CONFIG[status] || {
            label: formatText(status),
            icon: FiFileText,
            badge:
                'border-slate-200 bg-slate-100 text-slate-700',
        };

    const Icon = config.icon;

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${config.badge}`}
        >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </span>
    );
};

const DetailItem = ({ label, value }) => {
    const displayValue =
        value === null ||
            value === undefined ||
            value === ''
            ? 'Not available'
            : String(value);

    return (
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </p>

            <p
                className="mt-1 truncate text-sm font-semibold text-slate-700"
                title={displayValue}
            >
                {displayValue}
            </p>
        </div>
    );
};

const SummaryCard = ({ label, value, icon }) => {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg text-orange-300">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                    {label}
                </p>

                <p className="mt-1 truncate text-lg font-bold text-white sm:text-xl">
                    {value}
                </p>
            </div>
        </div>
    );
};

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
}) => {
    return (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
            <p className="text-sm text-slate-500">
                Page{' '}
                <span className="font-bold text-slate-900">
                    {currentPage}
                </span>{' '}
                of{' '}
                <span className="font-bold text-slate-900">
                    {totalPages}
                </span>
            </p>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() =>
                        onPageChange(currentPage - 1)
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FiChevronLeft className="h-4 w-4" />
                    Previous
                </button>

                <button
                    type="button"
                    onClick={() =>
                        onPageChange(currentPage + 1)
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                    <FiChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

const PaymentLoadingState = () => {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
                <div
                    key={item}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="h-1 animate-pulse bg-slate-200" />

                    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-100" />

                            <div>
                                <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />

                                <div className="mt-3 h-4 w-48 animate-pulse rounded bg-slate-100" />
                            </div>
                        </div>

                        <div>
                            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />

                            <div className="mt-2 h-7 w-28 animate-pulse rounded bg-slate-200" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const EmptyPaymentState = ({
    refreshing,
    onRefresh,
}) => {
    return (
        <section className="flex min-h-[460px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-red-300">
                    <FiCreditCard className="h-11 w-11" />
                </div>

                <span className="absolute bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-white">
                    <FiShoppingBag className="h-4 w-4" />
                </span>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-slate-900">
                No payments yet
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your payment transactions will appear here after
                you place and pay for an order.
            </p>

            <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <FiRefreshCw
                    className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''
                        }`}
                />

                {refreshing
                    ? 'Checking...'
                    : 'Check Payments'}
            </button>
        </section>
    );
};

const NoResultsState = ({ onClear }) => {
    return (
        <section className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FiSearch className="h-9 w-9" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
                No matching payments
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                No transactions match your current search and
                filter selection.
            </p>

            <button
                type="button"
                onClick={onClear}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
                <FiX className="h-4 w-4" />
                Clear Filters
            </button>
        </section>
    );
};

const getMethodGroup = (method) => {
    const normalizedMethod = normalizeValue(method).replace(
        /[\s-]+/g,
        '_'
    );

    if (normalizedMethod.includes('UPI')) {
        return 'UPI';
    }

    if (
        normalizedMethod.includes('CARD') ||
        normalizedMethod.includes('CREDIT') ||
        normalizedMethod.includes('DEBIT')
    ) {
        return 'CARD';
    }

    if (
        normalizedMethod.includes('NET_BANKING') ||
        normalizedMethod.includes('NETBANKING') ||
        normalizedMethod.includes('BANK_TRANSFER') ||
        normalizedMethod.includes('BANKING')
    ) {
        return 'NET_BANKING';
    }

    if (normalizedMethod.includes('WALLET')) {
        return 'WALLET';
    }

    if (
        normalizedMethod.includes('COD') ||
        normalizedMethod.includes('CASH')
    ) {
        return 'COD';
    }

    return 'OTHER';
};

const getMethodConfig = (method) => {
    const group = getMethodGroup(method);

    const configurations = {
        CARD: {
            icon: FiCreditCard,
            label: 'Credit / Debit Card',
            iconStyle:
                'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
            tagStyle: 'bg-blue-50 text-blue-700',
        },

        UPI: {
            icon: FiSmartphone,
            label: 'UPI / QR',
            iconStyle:
                'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
            tagStyle: 'bg-purple-50 text-purple-700',
        },

        NET_BANKING: {
            icon: FaUniversity,
            label: 'Net Banking',
            iconStyle:
                'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100',
            tagStyle: 'bg-cyan-50 text-cyan-700',
        },

        WALLET: {
            icon: FiDollarSign,
            label: 'Wallet',
            iconStyle:
                'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
            tagStyle: 'bg-amber-50 text-amber-700',
        },

        COD: {
            icon: FiTruck,
            label: 'Cash on Delivery',
            iconStyle:
                'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
            tagStyle: 'bg-emerald-50 text-emerald-700',
        },

        OTHER: {
            icon: FiDollarSign,
            label: formatText(method) || 'Other',
            iconStyle:
                'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
            tagStyle: 'bg-slate-100 text-slate-700',
        },
    };

    return configurations[group];
};

const normalizeValue = (value) =>
    String(value || '')
        .trim()
        .toUpperCase();

const formatText = (value) => {
    if (!value) return '';

    return String(value)
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase()
        );
};

const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const formatCurrency = (
    amount,
    currency = 'INR'
) => {
    const validCurrency =
        typeof currency === 'string' &&
            currency.trim().length === 3
            ? currency.trim().toUpperCase()
            : 'INR';

    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: validCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(toNumber(amount));
    } catch {
        return `₹${toNumber(amount).toFixed(2)}`;
    }
};

const formatDateTime = (dateValue) => {
    if (!dateValue) {
        return 'Date unavailable';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return 'Date unavailable';
    }

    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getApiError = (error, fallbackMessage) => {
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string') {
        return detail;
    }

    if (Array.isArray(detail)) {
        return detail
            .map(
                (item) =>
                    item?.msg ||
                    item?.message ||
                    'Validation error'
            )
            .join(', ');
    }

    if (!error.response) {
        return 'Cannot connect to the server';
    }

    return fallbackMessage;
};

export default PaymentHistory;