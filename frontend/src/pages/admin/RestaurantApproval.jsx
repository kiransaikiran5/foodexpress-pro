import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import {
    FiCheck,
    FiX,
    FiFileText,
    FiCoffee, // <-- Changed from FiStore to FiCoffee
    FiInbox,
    FiAlertCircle
} from 'react-icons/fi';

const RestaurantApproval = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    const fetchPending = async () => {
        try {
            const res = await api.get('/admin/restaurants/pending');
            // Safely ensure restaurants is ALWAYS an array to prevent crashes
            setRestaurants(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error('Failed to load pending restaurants');
            setRestaurants([]); // Fallback to empty array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id) => {
        if (!id) return;
        try {
            await api.post(`/admin/restaurants/${id}/approve`);
            toast.success('Restaurant approved successfully');
            setRestaurants((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            toast.error('Approval failed');
        }
    };

    const openRejectModal = (restaurant) => {
        setSelected(restaurant);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectReason?.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        if (!selected?.id) {
            toast.error('No restaurant selected');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('reason', rejectReason);
            await api.post(`/admin/restaurants/${selected.id}/reject`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Restaurant rejected');
            setShowRejectModal(false);
            setRestaurants((prev) => prev.filter((r) => r.id !== selected.id));
        } catch (err) {
            toast.error('Rejection failed');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading pending approvals...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Restaurant Approvals</h1>
                    <p className="mt-1 text-sm text-slate-500">Review and manage pending restaurant registrations.</p>
                </div>

                {!restaurants || restaurants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-4">
                            <FiInbox className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                        <p className="text-slate-500 mt-1">There are no pending restaurants to review right now.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {restaurants?.map((r) => (
                            <div key={r?.id} className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-md">
                                <div className="flex items-start gap-5 flex-1">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 mt-1">
                                        <FiCoffee className="h-6 w-6" /> {/* <-- Changed from FiStore to FiCoffee */}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{r?.name || 'Unnamed Restaurant'}</h3>
                                        <p className="text-sm text-slate-500 mt-1 line-clamp-2 max-w-xl">{r?.description || 'No description provided.'}</p>

                                        <div className="mt-4 flex flex-wrap items-center gap-3">
                                            {r?.gst_number && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                                                    GST: {r.gst_number}
                                                </span>
                                            )}

                                            {r?.gst_doc_path && (
                                                <a
                                                    href={`http://localhost:8000/${r.gst_doc_path}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-slate-50"
                                                >
                                                    <FiFileText className="h-3.5 w-3.5" /> GST Doc
                                                </a>
                                            )}

                                            {r?.license_doc_path && (
                                                <a
                                                    href={`http://localhost:8000/${r.license_doc_path}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-slate-50"
                                                >
                                                    <FiFileText className="h-3.5 w-3.5" /> License Doc
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto">
                                    <button
                                        onClick={() => handleApprove(r?.id)}
                                        className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-100"
                                    >
                                        <FiCheck className="h-4 w-4" />
                                        <span>Approve</span>
                                    </button>
                                    <button
                                        onClick={() => openRejectModal(r)}
                                        className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-6 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition duration-200 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-50"
                                    >
                                        <FiX className="h-4 w-4" />
                                        <span>Reject</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Restaurant">
                <div className="p-1">
                    <div className="mb-4 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                        <FiAlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                        <p>You are about to reject <strong>{selected?.name || 'this restaurant'}</strong>. This action requires a reason to be sent to the owner.</p>
                    </div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Reason for Rejection <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Uploaded documents are unreadable or invalid."
                        className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition duration-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                        rows={4}
                        required
                    />

                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={handleReject}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
                        >
                            Confirm Rejection
                        </button>
                        <button
                            onClick={() => setShowRejectModal(false)}
                            className="flex flex-1 items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    );
};

export default RestaurantApproval;