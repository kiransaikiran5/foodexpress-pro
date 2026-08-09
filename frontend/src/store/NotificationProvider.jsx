import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import NotificationContext from './NotificationContext';

export default function NotificationProvider({ children }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const lastCountRef = useRef(0);
    const initialLoadRef = useRef(true);

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            const count = res.data.unread_count || 0;
            setUnreadCount(count);
            return count;
        } catch {
            return 0;
        }
    };

    const fetchNotifications = async () => {
        try {
            // ✅ FIXED: added trailing slash to avoid 307 redirect
            const res = await api.get('/notifications/');
            setNotifications(res.data);
            return res.data;
        } catch {
            return [];
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUnreadCount(0);
            setNotifications([]);
            return;
        }

        let isMounted = true;

        const poll = async () => {
            const count = await fetchUnreadCount();
            if (!isMounted) return;

            if (initialLoadRef.current) {
                lastCountRef.current = count;
                initialLoadRef.current = false;
                return;
            }

            if (count > lastCountRef.current) {
                const list = await fetchNotifications();
                if (list.length > 0) {
                    const latest = list[0];
                    toast.success(latest.message, {
                        icon: '🔔',
                        style: { background: '#1a1a2e', color: '#fff' },
                        duration: 5000,
                    });
                }
            }
            lastCountRef.current = count;
        };

        fetchNotifications();
        poll();

        const interval = setInterval(poll, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchUnreadCount();
            fetchNotifications();
        } catch { }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            fetchUnreadCount();
            fetchNotifications();
        } catch { }
    };

    return (
        <NotificationContext.Provider
            value={{ unreadCount, notifications, markAsRead, markAllAsRead, fetchUnreadCount }}
        >
            {children}
        </NotificationContext.Provider>
    );
}