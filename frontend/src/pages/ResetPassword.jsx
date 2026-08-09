import { useEffect, useState } from 'react';
import {
    Link,
    useNavigate,
    useSearchParams,
} from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
    FiAlertCircle,
    FiArrowLeft,
    FiCheckCircle,
    FiEye,
    FiEyeOff,
    FiKey,
    FiLock,
} from 'react-icons/fi';

import api from '../services/api';

const resetPasswordSchema = z
    .object({
        token: z
            .string()
            .trim()
            .min(1, 'Reset token is required'),

        new_password: z
            .string()
            .min(8, 'Password must contain at least 8 characters')
            .max(72, 'Password cannot exceed 72 characters')
            .regex(
                /[A-Z]/,
                'Password must contain at least one uppercase letter'
            )
            .regex(
                /[a-z]/,
                'Password must contain at least one lowercase letter'
            )
            .regex(
                /[0-9]/,
                'Password must contain at least one number'
            ),

        confirm_password: z
            .string()
            .min(1, 'Please confirm your new password'),
    })
    .refine(
        (data) => data.new_password === data.confirm_password,
        {
            message: 'Passwords do not match',
            path: ['confirm_password'],
        }
    );

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const tokenFromUrl = searchParams.get('token')?.trim() || '';

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        },
    } = useForm({
        resolver: zodResolver(resetPasswordSchema),

        defaultValues: {
            token: tokenFromUrl,
            new_password: '',
            confirm_password: '',
        },
    });

    const passwordValue = watch('new_password');

    useEffect(() => {
        if (tokenFromUrl) {
            setValue('token', tokenFromUrl, {
                shouldValidate: true,
            });
        }
    }, [tokenFromUrl, setValue]);

    const onSubmit = async (formData) => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            const payload = {
                token: formData.token.trim(),
                new_password: formData.new_password,
            };

            /*
             * Use this when your FastAPI router has:
             * prefix="/auth"
             *
             * Final URL:
             * POST /api/v1/auth/reset-password
             */
            const response = await api.post(
                '/auth/reset-password',
                payload
            );

            toast.success(
                response.data?.message ||
                'Password reset successfully'
            );

            setIsSuccess(true);

            window.setTimeout(() => {
                navigate('/login', {
                    replace: true,
                });
            }, 1800);
        } catch (error) {
            const detail = error.response?.data?.detail;

            if (error.response?.status === 400) {
                toast.error(
                    typeof detail === 'string'
                        ? detail
                        : 'Invalid or expired reset token'
                );
            } else if (error.response?.status === 422) {
                toast.error(
                    'Please enter a valid password and reset token'
                );
            } else if (!error.response) {
                toast.error(
                    'Cannot connect to the server. Please try again.'
                );
            } else {
                toast.error(
                    typeof detail === 'string'
                        ? detail
                        : 'Password reset failed'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <main className="flex min-h-[calc(100vh-72px)] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-red-50 px-4 py-8">
                <section className="w-full max-w-md">
                    <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                        <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-green-500" />

                        <div className="px-6 py-10 text-center sm:px-9">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                                <FiCheckCircle className="h-10 w-10" />
                            </div>

                            <h1 className="mt-6 text-2xl font-bold text-slate-900">
                                Password Updated
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Your password has been reset successfully.
                                You will be redirected to the login page.
                            </p>

                            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
                                Redirecting...
                            </div>

                            <Link
                                to="/login"
                                className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Go to Login
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="relative flex min-h-[calc(100vh-72px)] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-red-50 px-4 py-6 sm:px-6">
            {/* Background decoration */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-100/50 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl" />

            <section className="relative z-10 w-full max-w-md">
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                    {/* Top accent */}
                    <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400" />

                    <div className="p-6 sm:p-8">
                        {/* Header */}
                        <div className="mb-7 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 text-red-500 shadow-sm ring-1 ring-red-100">
                                <FiKey className="h-7 w-7" />
                            </div>

                            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Create New Password
                            </h1>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Enter a secure new password for your
                                FoodExpress Pro account.
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-5"
                            noValidate
                        >
                            {/* Token field */}
                            {!tokenFromUrl && (
                                <div>
                                    <label
                                        htmlFor="token"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Reset Token
                                    </label>

                                    <div className="relative">
                                        <FiKey className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                        <input
                                            id="token"
                                            type="text"
                                            autoComplete="off"
                                            placeholder="Paste your reset token"
                                            aria-invalid={Boolean(
                                                errors.token
                                            )}
                                            {...register('token')}
                                            className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${errors.token
                                                ? 'border-red-400 ring-4 ring-red-50'
                                                : 'border-slate-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                                                }`}
                                        />
                                    </div>

                                    {errors.token && (
                                        <ErrorMessage
                                            message={
                                                errors.token.message
                                            }
                                        />
                                    )}
                                </div>
                            )}

                            {/* Hidden URL token */}
                            {tokenFromUrl && (
                                <input
                                    type="hidden"
                                    {...register('token')}
                                />
                            )}

                            {/* New password */}
                            <div>
                                <label
                                    htmlFor="new_password"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    New Password
                                </label>

                                <div className="relative">
                                    <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                    <input
                                        id="new_password"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        autoComplete="new-password"
                                        placeholder="Enter new password"
                                        aria-invalid={Boolean(
                                            errors.new_password
                                        )}
                                        {...register('new_password')}
                                        className={`h-12 w-full rounded-xl border bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${errors.new_password
                                            ? 'border-red-400 ring-4 ring-red-50'
                                            : 'border-slate-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                                            }`}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                (previous) => !previous
                                            )
                                        }
                                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                                        aria-label={
                                            showPassword
                                                ? 'Hide new password'
                                                : 'Show new password'
                                        }
                                    >
                                        {showPassword ? (
                                            <FiEyeOff className="h-5 w-5" />
                                        ) : (
                                            <FiEye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>

                                {errors.new_password && (
                                    <ErrorMessage
                                        message={
                                            errors.new_password.message
                                        }
                                    />
                                )}
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label
                                    htmlFor="confirm_password"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Confirm Password
                                </label>

                                <div className="relative">
                                    <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                    <input
                                        id="confirm_password"
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        autoComplete="new-password"
                                        placeholder="Confirm new password"
                                        aria-invalid={Boolean(
                                            errors.confirm_password
                                        )}
                                        {...register(
                                            'confirm_password'
                                        )}
                                        className={`h-12 w-full rounded-xl border bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${errors.confirm_password
                                            ? 'border-red-400 ring-4 ring-red-50'
                                            : 'border-slate-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                                            }`}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (previous) => !previous
                                            )
                                        }
                                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                                        aria-label={
                                            showConfirmPassword
                                                ? 'Hide confirmation password'
                                                : 'Show confirmation password'
                                        }
                                    >
                                        {showConfirmPassword ? (
                                            <FiEyeOff className="h-5 w-5" />
                                        ) : (
                                            <FiEye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>

                                {errors.confirm_password && (
                                    <ErrorMessage
                                        message={
                                            errors.confirm_password
                                                .message
                                        }
                                    />
                                )}
                            </div>

                            {/* Password requirements */}
                            <PasswordRequirements
                                password={passwordValue || ''}
                            />

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:to-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    <>
                                        <FiCheckCircle className="h-5 w-5" />
                                        Reset Password
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Back to login */}
                        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-500"
                            >
                                <FiArrowLeft className="h-4 w-4" />
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

const ErrorMessage = ({ message }) => {
    return (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500">
            <FiAlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{message}</span>
        </p>
    );
};

const PasswordRequirements = ({ password }) => {
    const requirements = [
        {
            label: 'At least 8 characters',
            valid: password.length >= 8,
        },
        {
            label: 'One uppercase letter',
            valid: /[A-Z]/.test(password),
        },
        {
            label: 'One lowercase letter',
            valid: /[a-z]/.test(password),
        },
        {
            label: 'One number',
            valid: /[0-9]/.test(password),
        },
    ];

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password requirements
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {requirements.map((requirement) => (
                    <div
                        key={requirement.label}
                        className={`flex items-center gap-2 text-xs font-medium ${requirement.valid
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                            }`}
                    >
                        {requirement.valid ? (
                            <FiCheckCircle className="h-4 w-4 shrink-0" />
                        ) : (
                            <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />
                        )}

                        <span>{requirement.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResetPassword;