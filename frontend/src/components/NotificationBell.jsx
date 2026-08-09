import { useState, useRef, useEffect } from 'react';
import { FiBell, FiBellOff, FiCheck, FiInfo } from 'react-icons/fi';
import { useNotifications } from '../store/NotificationContext';

const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Time formatter helper
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* ---------- Bell Trigger Button ---------- */}
            <button
                onClick={() => setOpen(!open)}
                className={`relative flex items-center justify-center p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-100 ${open ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                aria-label="Notifications"
            >
                <FiBell className="w-5 h-5 sm:w-6 sm:h-6" />

                {/* Unread Badge Indicator */}
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* ---------- Dropdown Panel ---------- */}
            {open && (
                <div className="absolute right-0 mt-3 w-[320px] sm:w-[380px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 origin-top-right">

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5">
                            <h3 className="font-bold text-slate-900 text-lg tracking-tight">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                            >
                                <FiCheck className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List Container */}
                    <div className="max-h-[400px] overflow-y-auto overscroll-contain">
                        {!notifications || notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
                                    <FiBellOff className="h-8 w-8" />
                                </div>
                                <p className="text-base font-bold text-slate-900">All caught up!</p>
                                <p className="text-sm text-slate-500 mt-1">You have no new notifications right now.</p>
                            </div>
                        ) : (
                            <ul className="flex flex-col">
                                {notifications.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                                            className={`w-full text-left p-4 sm:p-5 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 flex items-start gap-4 outline-none focus-visible:bg-slate-50 ${!n.is_read ? 'bg-blue-50/30' : 'bg-white'
                                                }`}
                                        >
                                            {/* Status Dot & Icon */}
                                            <div className="relative mt-0.5 shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-500">
                                                <FiInfo className="h-5 w-5" />
                                                {!n.is_read && (
                                                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 ring-2 ring-white" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-snug ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                                                    }`}>
                                                    {n.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1">
                                                    {formatTime(n.created_at)}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;