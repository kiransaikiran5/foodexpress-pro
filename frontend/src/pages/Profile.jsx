import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../store/authContext';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
    FiAlertCircle,
    FiCheckCircle,
    FiEdit2,
    FiMail,
    FiPhone,
    FiSave,
    FiShield,
    FiUser,
    FiX,
} from 'react-icons/fi';

const profileSchema = z.object({
    full_name: z
        .string()
        .trim()
        .min(2, 'Full name must contain at least 2 characters')
        .max(100, 'Full name cannot exceed 100 characters'),

    phone: z
        .string()
        .trim()
        .optional()
        .refine(
            (value) => {
                if (!value) return true;
                return /^[0-9+\-\s()]{7,20}$/.test(value);
            },
            {
                message: 'Enter a valid phone number',
            }
        ),
});

const Profile = () => {
    const { user, refreshUser } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: '',
            phone: '',
        },
    });

    useEffect(() => {
        if (!user) return;

        reset({
            full_name: user.full_name || '',
            phone: user.phone || '',
        });
    }, [user, reset]);

    const initials = useMemo(() => {
        const name = user?.full_name?.trim();

        if (!name) return 'U';

        return name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word.charAt(0).toUpperCase())
            .join('');
    }, [user?.full_name]);

    const formattedRole = useMemo(() => {
        if (!user?.role) return 'User';

        return user.role
            .replaceAll('_', ' ')
            .toLowerCase()
            .replace(/\b\w/g, (character) => character.toUpperCase());
    }, [user?.role]);

    const openEditMode = () => {
        reset({
            full_name: user?.full_name || '',
            phone: user?.phone || '',
        });

        setIsEditing(true);
    };

    const closeEditMode = () => {
        reset({
            full_name: user?.full_name || '',
            phone: user?.phone || '',
        });

        setIsEditing(false);
    };

    const onSubmit = async (data) => {
        if (!user?.id || isLoading) return;

        setIsLoading(true);

        try {
            const payload = {
                full_name: data.full_name.trim(),
                phone: data.phone?.trim() || null,
            };

            await api.put(`/users/${user.id}`, payload);
            await refreshUser();

            toast.success('Profile updated successfully');
            setIsEditing(false);
        } catch (error) {
            const detail = error.response?.data?.detail;

            toast.error(
                typeof detail === 'string'
                    ? detail
                    : 'Unable to update your profile'
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-red-500" />

                    <span className="text-sm font-medium text-slate-600">
                        Loading profile...
                    </span>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-72px)] overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-red-50">
            <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1440px] items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
                <section className="w-full max-w-6xl">
                    <div className="mb-4 flex flex-col gap-1 sm:mb-5">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            My Profile
                        </h1>

                        <p className="text-sm text-slate-500">
                            View and manage your personal account information.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                        {/* Compact cover area */}
                        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 sm:h-32 lg:h-36">
                            <div className="absolute inset-0">
                                <div className="absolute -left-14 -top-20 h-56 w-56 rounded-full border-[28px] border-white/15" />
                                <div className="absolute -bottom-24 right-8 h-56 w-56 rounded-full border-[32px] border-white/15" />
                                <div className="absolute right-1/3 top-5 h-14 w-14 rounded-full bg-white/10 blur-sm" />
                            </div>
                        </div>

                        <div className="relative px-5 pb-6 sm:px-7 sm:pb-7 lg:px-9">
                            {/* Header row */}
                            <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
                                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
                                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-slate-900 text-2xl font-bold text-white shadow-xl sm:h-28 sm:w-28">
                                        {initials}
                                    </div>

                                    <div className="pb-1 text-center sm:text-left">
                                        <div className="flex flex-col items-center gap-2 sm:flex-row">
                                            <h2 className="max-w-full break-words text-2xl font-bold text-slate-900 sm:text-3xl">
                                                {user.full_name || 'FoodExpress User'}
                                            </h2>

                                            {user.is_verified && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                    <FiCheckCircle className="h-3.5 w-3.5" />
                                                    Verified
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                                                {formattedRole}
                                            </span>

                                            <span className="max-w-[280px] truncate text-sm text-slate-500 sm:max-w-[420px]">
                                                {user.email}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!isEditing && (
                                    <button
                                        type="button"
                                        onClick={openEditMode}
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-slate-200 sm:w-auto"
                                    >
                                        <FiEdit2 className="h-4 w-4" />
                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            <div className="mt-6 border-t border-slate-100 pt-6">
                                {!isEditing ? (
                                    <ProfileView
                                        user={user}
                                        formattedRole={formattedRole}
                                    />
                                ) : (
                                    <form
                                        onSubmit={handleSubmit(onSubmit)}
                                        className="space-y-6"
                                        noValidate
                                    >
                                        <div>
                                            <div className="mb-4">
                                                <h3 className="text-lg font-bold text-slate-900">
                                                    Edit personal information
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Update your name and phone number.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <label
                                                        htmlFor="full_name"
                                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                                    >
                                                        Full name
                                                    </label>

                                                    <div className="relative">
                                                        <FiUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                                        <input
                                                            id="full_name"
                                                            type="text"
                                                            autoComplete="name"
                                                            placeholder="Enter your full name"
                                                            aria-invalid={Boolean(
                                                                errors.full_name
                                                            )}
                                                            {...register('full_name')}
                                                            className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${errors.full_name
                                                                    ? 'border-red-400 ring-4 ring-red-50'
                                                                    : 'border-slate-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                                                                }`}
                                                        />
                                                    </div>

                                                    {errors.full_name && (
                                                        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
                                                            <FiAlertCircle className="h-3.5 w-3.5" />
                                                            {errors.full_name.message}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="phone"
                                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                                    >
                                                        Phone number
                                                    </label>

                                                    <div className="relative">
                                                        <FiPhone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                                        <input
                                                            id="phone"
                                                            type="tel"
                                                            autoComplete="tel"
                                                            placeholder="+91 98765 43210"
                                                            aria-invalid={Boolean(
                                                                errors.phone
                                                            )}
                                                            {...register('phone')}
                                                            className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${errors.phone
                                                                    ? 'border-red-400 ring-4 ring-red-50'
                                                                    : 'border-slate-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-50'
                                                                }`}
                                                        />
                                                    </div>

                                                    {errors.phone && (
                                                        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
                                                            <FiAlertCircle className="h-3.5 w-3.5" />
                                                            {errors.phone.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                            <h4 className="text-sm font-bold text-slate-800">
                                                Account information
                                            </h4>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Email and account role cannot be changed here.
                                            </p>

                                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <ReadOnlyField
                                                    icon={<FiMail />}
                                                    label="Email address"
                                                    value={user.email}
                                                />

                                                <ReadOnlyField
                                                    icon={<FiShield />}
                                                    label="Account role"
                                                    value={formattedRole}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={closeEditMode}
                                                disabled={isLoading}
                                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <FiX className="h-4 w-4" />
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={isLoading || !isDirty}
                                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-7 text-sm font-semibold text-white shadow-md shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:to-orange-600 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave className="h-4 w-4" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

const ProfileView = ({ user, formattedRole }) => {
    return (
        <div>
            <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                    Personal information
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Your profile and account details.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                    icon={<FiUser />}
                    label="Full name"
                    value={user.full_name || 'Not provided'}
                />

                <InfoCard
                    icon={<FiMail />}
                    label="Email address"
                    value={user.email || 'Not provided'}
                />

                <InfoCard
                    icon={<FiPhone />}
                    label="Phone number"
                    value={user.phone || 'Not provided'}
                />

                <InfoCard
                    icon={<FiShield />}
                    label="Account role"
                    value={formattedRole}
                />
            </div>

            <div
                className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${user.is_verified
                        ? 'border-emerald-100 bg-emerald-50'
                        : 'border-amber-100 bg-amber-50'
                    }`}
            >
                <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ${user.is_verified
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                >
                    {user.is_verified ? (
                        <FiCheckCircle className="h-5 w-5" />
                    ) : (
                        <FiAlertCircle className="h-5 w-5" />
                    )}
                </div>

                <div>
                    <p
                        className={`text-sm font-semibold ${user.is_verified
                                ? 'text-emerald-800'
                                : 'text-amber-800'
                            }`}
                    >
                        {user.is_verified
                            ? 'Your account is verified'
                            : 'Your account is not verified'}
                    </p>

                    <p
                        className={`mt-1 text-xs leading-5 ${user.is_verified
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                    >
                        {user.is_verified
                            ? 'Your email address has been successfully verified.'
                            : 'Verify your email address to improve account security.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

const InfoCard = ({ icon, label, value }) => {
    return (
        <div className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-red-100 hover:shadow-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-500 transition group-hover:bg-red-50 group-hover:text-red-500">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {label}
                </p>

                <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {value}
                </p>
            </div>
        </div>
    );
};

const ReadOnlyField = ({ icon, label, value }) => {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="shrink-0 text-slate-400">{icon}</div>

            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">
                    {label}
                </p>

                <p className="truncate text-sm font-semibold text-slate-700">
                    {value || 'Not available'}
                </p>
            </div>
        </div>
    );
};

export default Profile;