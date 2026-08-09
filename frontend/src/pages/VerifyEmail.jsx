import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading'); // loading, success, error

    // This ref prevents React 18 StrictMode from running the API call and toasts twice
    const hasAttemptedVerification = useRef(false);

    useEffect(() => {
        if (hasAttemptedVerification.current) return;

        if (!token) {
            setStatus('error');
            toast.error('Verification token is missing.');
            return;
        }

        const verify = async () => {
            hasAttemptedVerification.current = true;
            try {
                await api.post('/auth/verify-email', { token });
                setStatus('success');
                toast.success('Email verified successfully!');
            } catch (error) {
                setStatus('error');
                const detail = error.response?.data?.detail;
                toast.error(
                    typeof detail === 'string'
                        ? detail
                        : 'Verification failed or link expired.'
                );
            }
        };

        verify();
    }, [token]);

    return (
        <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-gradient-to-br from-gray-50 via-white to-red-50 p-4 sm:p-6">
            <section className="w-full max-w-md">
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] text-center p-8 sm:p-10">

                    {status === 'loading' && (
                        <div className="flex flex-col items-center py-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-6"></div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying...</h2>
                            <p className="text-sm text-slate-500">Please wait while we verify your email address.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center py-4">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
                                <FiCheckCircle className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
                            <p className="text-sm text-slate-500 mb-8">Your account is now active and ready to use.</p>

                            <Link
                                to="/login"
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:to-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-200"
                            >
                                Go to Login
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center py-4">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                                <FiXCircle className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
                            <p className="text-sm text-slate-500 mb-8">The verification link is invalid, missing, or has already expired.</p>

                            <Link
                                to="/register"
                                className="text-sm font-semibold text-red-500 transition hover:text-red-600 hover:underline"
                            >
                                Register again
                            </Link>
                        </div>
                    )}

                </div>
            </section>
        </main>
    );
};

export default VerifyEmail;