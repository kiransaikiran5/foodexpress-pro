import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiUser,
    FiTruck,
    FiFileText,
    FiCheckCircle,
    FiXCircle,
    FiCheck,
    FiX,
    FiExternalLink,
    FiUsers
} from 'react-icons/fi';

const DeliveryPartnersAdmin = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchPartners = async () => {
        try {
            const res = await api.get('/admin/delivery-partners/');
            setPartners(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error('Failed to load partners');
            setPartners([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleVerify = async (id, isVerified) => {
        setProcessingId(id);
        try {
            await api.put(`/admin/delivery-partners/${id}/verify`, { is_verified: isVerified });
            toast.success(isVerified ? 'Partner successfully verified' : 'Partner verification revoked');
            fetchPartners();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Action failed');
        } finally {
            setProcessingId(null);
        }
    };

    // ---------- Loading State ----------
    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-red-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading delivery partners...</p>
            </div>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-6xl">

                {/* ---------- Header ---------- */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Delivery Partners</h1>
                        <p className="mt-1 text-sm text-slate-500">Manage and verify your fleet of delivery personnel.</p>
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FiUsers className="text-slate-400" />
                        Total Partners: {partners.length}
                    </div>
                </div>

                {/* ---------- Empty State ---------- */}
                {!partners || partners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-5">
                            <FiTruck className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No Partners Found</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm">
                            There are currently no registered delivery partners in the system.
                        </p>
                    </div>
                ) : (
                    /* ---------- Partners Grid ---------- */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {partners.map(p => (
                            <div key={p.id} className="flex flex-col bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-md">

                                {/* Card Header */}
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500 font-bold text-lg shrink-0">
                                            <FiUser />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">
                                                {p.user?.full_name || `User #${p.user_id}`}
                                            </h3>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">ID: {p.id}</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 mt-1">
                                        {p.is_verified ? (
                                            <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                                                <FiCheckCircle size={12} /> Verified
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                                                <FiClock size={12} /> Pending
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Partner Details */}
                                <div className="p-6 flex-1 space-y-4">
                                    {/* Vehicle Info */}
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 text-slate-400">
                                            <FiTruck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Vehicle</p>
                                            <p className="font-semibold text-slate-900">{p.vehicle_type}</p>
                                            <p className="text-sm font-medium text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded-md mt-1 border border-slate-200">
                                                {p.vehicle_number}
                                            </p>
                                        </div>
                                    </div>

                                    {/* License Info */}
                                    <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                                        <div className="mt-0.5 text-slate-400">
                                            <FiFileText size={18} />
                                        </div>
                                        <div className="w-full">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">License Number</p>
                                            <p className="font-semibold text-slate-900 mb-2">{p.license_number}</p>

                                            {p.license_doc ? (
                                                <a
                                                    href={`http://localhost:8000/${p.license_doc}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    View Document <FiExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400 italic">No document uploaded</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="p-6 pt-0 mt-auto">
                                    {!p.is_verified ? (
                                        <button
                                            onClick={() => handleVerify(p.id, true)}
                                            disabled={processingId === p.id}
                                            className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50 disabled:hover:translate-y-0"
                                        >
                                            {processingId === p.id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            ) : (
                                                <>
                                                    <FiCheck size={16} /> Approve & Verify
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleVerify(p.id, false)}
                                            disabled={processingId === p.id}
                                            className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 disabled:opacity-50"
                                        >
                                            {processingId === p.id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                            ) : (
                                                <>
                                                    <FiXCircle size={16} className="text-slate-400" /> Revoke Verification
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default DeliveryPartnersAdmin;