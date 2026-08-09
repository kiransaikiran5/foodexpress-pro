import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

import {
    FiActivity,
    FiAlertCircle,
    FiAlertTriangle,
    FiCheckCircle,
    FiClock,
    FiCpu,
    FiDatabase,
    FiHardDrive,
    FiRefreshCw,
    FiServer,
    FiShield,
    FiWifi,
} from 'react-icons/fi';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const formatDateTime = (dateValue) => {
    if (!dateValue) return 'Not available';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return 'Not available';
    }

    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatTime = (dateValue) => {
    if (!dateValue) return '-';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getUsageConfig = (value) => {
    const number = Number(value || 0);

    if (number < 60) {
        return {
            bar: 'bg-emerald-500',
            text: 'text-emerald-600',
            label: 'Healthy',
        };
    }

    if (number < 80) {
        return {
            bar: 'bg-amber-500',
            text: 'text-amber-600',
            label: 'Moderate',
        };
    }

    return {
        bar: 'bg-red-500',
        text: 'text-red-600',
        label: 'High',
    };
};

// --------------------------------------------------
// Main Component
// --------------------------------------------------

const MonitoringDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [backupLoading, setBackupLoading] = useState(false);

    const fetchData = async ({ silent = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await api.get(
                '/admin/monitoring/dashboard'
            );

            setData(response.data || {});
        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                'Failed to load monitoring data'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();

        const intervalId = window.setInterval(() => {
            fetchData({ silent: true });
        }, 30000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const handleBackup = async () => {
        if (backupLoading) return;

        setBackupLoading(true);

        try {
            await api.post('/admin/monitoring/backup');

            toast.success('Backup started successfully');

            await fetchData({
                silent: true,
            });
        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                'Backup failed'
            );
        } finally {
            setBackupLoading(false);
        }
    };

    const health = data?.server_health || {};
    const apiStats = data?.api_monitoring || {};

    const securityAlerts = Array.isArray(
        data?.security_alerts
    )
        ? data.security_alerts
        : [];

    const auditLogs = Array.isArray(
        data?.audit_monitoring
    )
        ? data.audit_monitoring
        : [];

    const failedLogs = Array.isArray(
        apiStats?.recent_failed_logs
    )
        ? apiStats.recent_failed_logs
        : [];

    const systemStatus = useMemo(() => {
        const cpu = Number(health.cpu_percent || 0);
        const memory = Number(health.memory_percent || 0);
        const disk = Number(health.disk_percent || 0);

        if (
            cpu >= 85 ||
            memory >= 85 ||
            disk >= 90 ||
            securityAlerts.length > 0
        ) {
            return {
                label: 'Attention Required',
                description:
                    'One or more system metrics require review.',
                dot: 'bg-amber-500',
                ping: 'bg-amber-400',
                badge:
                    'border-amber-200 bg-amber-50 text-amber-700',
            };
        }

        return {
            label: 'System Operational',
            description:
                'All core services are operating normally.',
            dot: 'bg-emerald-500',
            ping: 'bg-emerald-400',
            badge:
                'border-emerald-200 bg-emerald-50 text-emerald-700',
        };
    }, [health, securityAlerts]);

    if (loading) {
        return <MonitoringLoadingState />;
    }

    if (!data) {
        return (
            <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 p-6">
                <div className="text-center">
                    <FiAlertCircle className="mx-auto h-10 w-10 text-red-400" />

                    <h2 className="mt-4 text-lg font-bold text-slate-900">
                        Monitoring data unavailable
                    </h2>

                    <button
                        type="button"
                        onClick={() => fetchData()}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
                    >
                        <FiRefreshCw className="h-4 w-4" />
                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-72px)] bg-[#f8fafc] px-3 py-4 sm:px-5 lg:px-6">
            <div className="mx-auto w-full max-w-[1220px]">

                {/* ================= Header ================= */}

                <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 shadow-sm">
                    <div className="px-5 py-5 sm:px-6">

                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-indigo-300">
                                    <FiShield className="h-5 w-5" />
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
                                        Administration
                                    </p>

                                    <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                                        Platform Monitoring
                                    </h1>

                                    <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-400 sm:text-sm">
                                        Monitor server health, failed API
                                        requests, security events, audit
                                        activity and backups.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    fetchData({
                                        silent: true,
                                    })
                                }
                                disabled={refreshing}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-60 sm:w-auto"
                            >
                                <FiRefreshCw
                                    className={`h-4 w-4 ${refreshing
                                        ? 'animate-spin'
                                        : ''
                                        }`}
                                />

                                {refreshing
                                    ? 'Refreshing...'
                                    : 'Refresh'}
                            </button>
                        </div>

                        {/* Status */}
                        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span
                                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${systemStatus.ping}`}
                                    />
                                    <span
                                        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${systemStatus.dot}`}
                                    />
                                </span>

                                <div>
                                    <p className="text-xs font-bold text-white">
                                        {systemStatus.label}
                                    </p>

                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                        {systemStatus.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                                <FiWifi className="h-3.5 w-3.5" />
                                Auto-refresh every 30 seconds
                            </div>
                        </div>
                    </div>
                </section>

                {/* ================= Metrics ================= */}

                <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MetricCard
                        icon={<FiCpu />}
                        label="CPU Usage"
                        value={`${Number(
                            health.cpu_percent || 0
                        ).toFixed(1)}%`}
                        progress={health.cpu_percent}
                        iconClass="bg-blue-50 text-blue-600"
                    />

                    <MetricCard
                        icon={<FiHardDrive />}
                        label="Memory Usage"
                        value={`${Number(
                            health.memory_percent || 0
                        ).toFixed(1)}%`}
                        progress={health.memory_percent}
                        iconClass="bg-purple-50 text-purple-600"
                    />

                    <MetricCard
                        icon={<FiServer />}
                        label="Disk Usage"
                        value={`${Number(
                            health.disk_percent || 0
                        ).toFixed(1)}%`}
                        progress={health.disk_percent}
                        iconClass="bg-amber-50 text-amber-600"
                    />

                    <MetricCard
                        icon={<FiClock />}
                        label="System Uptime"
                        value={`${Number(
                            health.uptime_hours || 0
                        ).toFixed(1)}h`}
                        helper={health.platform || 'Server'}
                        iconClass="bg-emerald-50 text-emerald-600"
                    />
                </section>

                {/* ================= API Monitoring ================= */}

                <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

                        <div>
                            <div className="flex items-center gap-2">
                                <FiActivity className="h-4 w-4 text-red-500" />

                                <h2 className="text-base font-black text-slate-900">
                                    API Monitoring
                                </h2>
                            </div>

                            <p className="mt-1 text-[11px] text-slate-500">
                                Failed requests in the last hour:{' '}
                                <span className="font-black text-red-500">
                                    {Number(
                                        apiStats.failed_requests_last_hour ||
                                        0
                                    )}
                                </span>
                            </p>
                        </div>

                        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Live
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <TableHeader>
                                        Endpoint
                                    </TableHeader>

                                    <TableHeader>
                                        Method
                                    </TableHeader>

                                    <TableHeader center>
                                        Status
                                    </TableHeader>

                                    <TableHeader>
                                        Error
                                    </TableHeader>

                                    <TableHeader>
                                        Time
                                    </TableHeader>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {failedLogs.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-10 text-center"
                                        >
                                            <FiCheckCircle className="mx-auto h-7 w-7 text-emerald-500" />

                                            <p className="mt-2 text-sm font-semibold text-slate-700">
                                                No failed requests
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                Recent API requests look healthy.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    failedLogs.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="max-w-[300px] px-4 py-3">
                                                <code className="block truncate text-[11px] font-semibold text-slate-700">
                                                    {log.endpoint}
                                                </code>
                                            </td>

                                            <td className="px-4 py-3">
                                                <MethodBadge
                                                    method={
                                                        log.method
                                                    }
                                                />
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">
                                                    {log.status_code}
                                                </span>
                                            </td>

                                            <td
                                                className="max-w-[260px] truncate px-4 py-3 text-xs text-slate-500"
                                                title={
                                                    log.error_message
                                                }
                                            >
                                                {log.error_message ||
                                                    '-'}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-medium text-slate-400">
                                                {formatTime(
                                                    log.created_at
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ================= Security + Audit ================= */}

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

                    {/* Security */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

                        <SectionHeader
                            icon={
                                <FiAlertTriangle className="text-orange-500" />
                            }
                            title="Security Alerts"
                            badge={`${securityAlerts.length}`}
                        />

                        <div className="p-4">
                            {securityAlerts.length === 0 ? (
                                <CompactEmptyState
                                    icon={
                                        <FiCheckCircle className="h-6 w-6 text-emerald-500" />
                                    }
                                    title="No active security alerts"
                                    description="No suspicious activity is currently detected."
                                />
                            ) : (
                                <div className="space-y-2.5">
                                    {securityAlerts.map(
                                        (alert, index) => (
                                            <div
                                                key={`${alert}-${index}`}
                                                className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3"
                                            >
                                                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                                                <p className="text-xs font-medium leading-5 text-red-700">
                                                    {alert}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Audit */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

                        <SectionHeader
                            icon={
                                <FiDatabase className="text-blue-500" />
                            }
                            title="Recent Audit Logs"
                            badge={`${auditLogs.length}`}
                        />

                        <div className="max-h-[320px] overflow-y-auto">
                            {auditLogs.length === 0 ? (
                                <div className="p-4">
                                    <CompactEmptyState
                                        icon={
                                            <FiDatabase className="h-6 w-6 text-slate-300" />
                                        }
                                        title="No audit activity"
                                        description="New admin and system actions will appear here."
                                    />
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {auditLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-slate-50"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-slate-800">
                                                    {log.action}
                                                </p>

                                                {log.details && (
                                                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                                                        {log.details}
                                                    </p>
                                                )}
                                            </div>

                                            <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-slate-400">
                                                {formatTime(
                                                    log.created_at
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ================= Backup ================= */}

                <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

                    <SectionHeader
                        icon={
                            <FiDatabase className="text-emerald-500" />
                        }
                        title="Backup & Recovery"
                    />

                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                <FiDatabase className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Last backup
                                </p>

                                <p className="mt-0.5 text-sm font-bold text-slate-900">
                                    {data.backup_status
                                        ?.last_backup_date
                                        ? formatDateTime(
                                            data.backup_status
                                                .last_backup_date
                                        )
                                        : 'No backups yet'}
                                </p>

                                <p className="mt-1 text-[11px] text-slate-500">
                                    Status:{' '}
                                    <span className="font-bold text-emerald-600">
                                        {data.backup_status
                                            ?.last_backup_status ||
                                            'Not available'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleBackup}
                            disabled={backupLoading}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            <FiRefreshCw
                                className={`h-4 w-4 ${backupLoading
                                    ? 'animate-spin'
                                    : ''
                                    }`}
                            />

                            {backupLoading
                                ? 'Starting...'
                                : 'Start Backup'}
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
};

// --------------------------------------------------
// Components
// --------------------------------------------------

const MetricCard = ({
    icon,
    label,
    value,
    progress,
    helper,
    iconClass,
}) => {
    const config = getUsageConfig(progress);

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
                <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
                >
                    {icon}
                </div>

                {progress !== undefined && (
                    <span
                        className={`text-[9px] font-black uppercase tracking-wider ${config.text}`}
                    >
                        {config.label}
                    </span>
                )}
            </div>

            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {value}
            </p>

            {progress !== undefined ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full ${config.bar}`}
                        style={{
                            width: `${Math.min(
                                100,
                                Math.max(
                                    0,
                                    Number(progress || 0)
                                )
                            )}%`,
                        }}
                    />
                </div>
            ) : (
                <p className="mt-2 truncate text-[10px] font-medium text-slate-500">
                    {helper}
                </p>
            )}
        </article>
    );
};

const TableHeader = ({ children, center = false }) => (
    <th
        className={`whitespace-nowrap px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 ${center ? 'text-center' : 'text-left'
            }`}
    >
        {children}
    </th>
);

const MethodBadge = ({ method }) => {
    const normalized = String(method || '').toUpperCase();

    const styles = {
        GET: 'bg-blue-50 text-blue-600',
        POST: 'bg-emerald-50 text-emerald-600',
        PUT: 'bg-amber-50 text-amber-600',
        PATCH: 'bg-purple-50 text-purple-600',
        DELETE: 'bg-red-50 text-red-600',
    };

    return (
        <span
            className={`inline-flex rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wider ${styles[normalized] ||
                'bg-slate-100 text-slate-600'
                }`}
        >
            {normalized || 'N/A'}
        </span>
    );
};

const SectionHeader = ({
    icon,
    title,
    badge,
}) => (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="flex items-center gap-2">
            {icon}

            <h2 className="text-sm font-black text-slate-900">
                {title}
            </h2>
        </div>

        {badge !== undefined && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">
                {badge}
            </span>
        )}
    </div>
);

const CompactEmptyState = ({
    icon,
    title,
    description,
}) => (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-center">
        {icon}

        <p className="mt-2 text-xs font-bold text-slate-700">
            {title}
        </p>

        <p className="mt-1 max-w-sm text-[10px] leading-4 text-slate-400">
            {description}
        </p>
    </div>
);

const MonitoringLoadingState = () => (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">
        <div className="mx-auto max-w-[1220px]">

            <div className="h-[190px] animate-pulse rounded-2xl bg-slate-200" />

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <div
                        key={item}
                        className="h-36 animate-pulse rounded-2xl bg-slate-200"
                    />
                ))}
            </div>

            <div className="mt-4 h-[300px] animate-pulse rounded-2xl bg-slate-200" />

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="h-[310px] animate-pulse rounded-2xl bg-slate-200" />
                <div className="h-[310px] animate-pulse rounded-2xl bg-slate-200" />
            </div>

            <div className="mt-4 h-32 animate-pulse rounded-2xl bg-slate-200" />
        </div>
    </main>
);

export default MonitoringDashboard;