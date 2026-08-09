import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiMail, FiSend, FiKey } from 'react-icons/fi';

const forgotSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const ForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(forgotSchema),
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password', data);
            toast.success('If the email is registered, a reset link has been sent.');

            // FIX: Added a dummy token to the URL so the ResetPassword page allows you in for testing
            navigate('/reset-password?token=dummy-token-for-testing');

        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-gradient-to-br from-gray-50 via-white to-red-50 p-4 sm:p-6">
            <section className="w-full max-w-md">
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                    {/* Top accent */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

                    <div className="p-6 sm:p-9">
                        {/* Heading */}
                        <div className="mb-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                <FiKey className="h-6 w-6" />
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                Forgot Password
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Enter your email and we'll send you a link to reset your password.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Email address
                                </label>

                                <div className="relative">
                                    <FiMail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        aria-invalid={Boolean(errors.email)}
                                        {...register('email')}
                                        className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 ${errors.email
                                                ? 'border-red-400 ring-4 ring-red-50'
                                                : 'border-slate-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                                            }`}
                                    />
                                </div>

                                {errors.email && (
                                    <p className="mt-1.5 text-xs font-medium text-red-500">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:to-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                                {isLoading ? (
                                    <>
                                        <svg
                                            className="h-5 w-5 animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            aria-hidden="true"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                                            />
                                        </svg>
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiSend className="h-5 w-5" />
                                        <span>Send Reset Link</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Back to Login Link */}
                        <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                            <p className="text-sm text-slate-500">
                                Remember your password?{' '}
                                <Link
                                    to="/login"
                                    className="font-semibold text-red-500 transition hover:text-red-600 hover:underline"
                                >
                                    Back to Login
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default ForgotPassword;