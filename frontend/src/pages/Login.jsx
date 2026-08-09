import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../store/authContext';
import toast from 'react-hot-toast';
import {
    FiMail,
    FiLock,
    FiLogIn,
    FiEye,
    FiEyeOff,
} from 'react-icons/fi';

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data) => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            await login(data.email.trim(), data.password);
            toast.success('Welcome back!');
            navigate('/', { replace: true });
        } catch (error) {
            const detail = error.response?.data?.detail;

            toast.error(
                typeof detail === 'string'
                    ? detail
                    : 'Invalid email or password'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        /* 
           Changed py-10 to p-4 sm:p-6. 
           This allows the flexbox to perfectly center the card in the viewport 
           without artificial padding pushing it off-screen.
        */
        <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-gradient-to-br from-gray-50 via-white to-red-50 p-4 sm:p-6">
            <section className="w-full max-w-md">
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                    {/* Top accent */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

                    <div className="p-6 sm:p-9">
                        {/* Heading */}
                        <div className="mb-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                <FiLogIn className="h-6 w-6" />
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                Welcome back
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Sign in to continue to FoodExpress
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-5"
                            noValidate
                        >
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

                            {/* Password */}
                            <div>
                                <div className="mb-2 block">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-semibold text-slate-700"
                                    >
                                        Password
                                    </label>
                                </div>

                                <div className="relative">
                                    <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        aria-invalid={Boolean(errors.password)}
                                        {...register('password')}
                                        className={`h-12 w-full rounded-xl border bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 ${errors.password
                                            ? 'border-red-400 ring-4 ring-red-50'
                                            : 'border-slate-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                                            }`}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((previous) => !previous)
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                                        aria-label={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        {showPassword ? (
                                            <FiEyeOff className="h-5 w-5" />
                                        ) : (
                                            <FiEye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>

                                {errors.password && (
                                    <p className="mt-1.5 text-xs font-medium text-red-500">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Forgot Password Link positioned cleanly above the button */}
                            <div className="flex justify-end pt-1">
                                <Link
                                    to="/forgot-password"
                                    className="text-sm font-semibold text-red-500 transition hover:text-red-600 hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Sign-in button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:to-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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

                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiLogIn className="h-5 w-5" />
                                        <span>Sign In</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Registration link */}
                        <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                            <p className="text-sm text-slate-500">
                                Don&apos;t have an account?{' '}
                                <Link
                                    to="/register"
                                    className="font-semibold text-red-500 transition hover:text-red-600 hover:underline"
                                >
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                <p className="mt-5 text-center text-xs text-slate-400">
                    By signing in, you agree to our Terms and Privacy Policy.
                </p>
            </section>
        </main>
    );
};

export default Login;