import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiSend,
    FiMessageSquare,
    FiUsers,
    FiInfo,
    FiCheckCircle
} from 'react-icons/fi';

const PromoNotification = () => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const maxLength = 300; // Recommended length for push notifications

    const handleSend = async (e) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Please enter a message to send.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/admin/notifications/send-promo', { message: message.trim() });
            toast.success('Promo notification broadcasted successfully! 🎉');
            setMessage('');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to send promo notification');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-3xl">

                {/* ---------- Header ---------- */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <FiMessageSquare className="text-blue-500" />
                        Broadcast Promotion
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Send promotional offers, announcements, or alerts to all registered customers.
                    </p>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">

                    {/* Information Banner */}
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-8">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5 h-5 w-5" />
                        <div>
                            <h4 className="text-sm font-bold text-blue-900">Broadcast Notice</h4>
                            <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                                This message will be sent instantly as an in-app notification to <strong className="font-black">every registered customer</strong>. Please ensure the message is proofread before sending.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSend} className="space-y-6">

                        {/* Textarea Input */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label
                                    htmlFor="promo-message"
                                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                                >
                                    Notification Message
                                </label>
                                <span className={`text-xs font-bold ${message.length > maxLength ? 'text-red-500' : 'text-slate-400'}`}>
                                    {message.length} / {maxLength}
                                </span>
                            </div>

                            <div className="relative">
                                <textarea
                                    id="promo-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={isSubmitting}
                                    rows={5}
                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed ${message.length > maxLength
                                            ? 'border-red-300 focus:ring-4 focus:ring-red-50 focus:border-red-500'
                                            : 'border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500'
                                        }`}
                                    placeholder="e.g., Get 50% off on your next order! Use code SUMMER50 at checkout. Hurry, offer valid till midnight! 🍔"
                                    required
                                />
                            </div>
                            {message.length > maxLength && (
                                <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                                    <FiInfo /> Consider keeping the message under {maxLength} characters for better readability on mobile devices.
                                </p>
                            )}
                        </div>

                        {/* Action Area */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 w-full sm:w-auto justify-center sm:justify-start">
                                <FiUsers className="text-slate-400" />
                                <span>Reaches all active customers</span>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !message.trim()}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-md transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 disabled:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-slate-200"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Broadcasting...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiSend size={16} />
                                        <span>Send Broadcast</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Secondary Help Text */}
                <div className="mt-6 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <FiCheckCircle size={14} className="text-emerald-500" />
                    Delivered instantly to Notification Centers
                </div>
            </div>
        </main>
    );
};

export default PromoNotification;