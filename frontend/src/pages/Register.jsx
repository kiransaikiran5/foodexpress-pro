import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../store/authContext';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { FiUser, FiMail, FiLock, FiPhone, FiUserCheck } from 'react-icons/fi';

const registerSchema = z.object({
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirm_password: z.string(),
    role: z.enum(['CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY_PARTNER']),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
});

const Register = () => {
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await registerUser({
                full_name: data.full_name,
                email: data.email,
                phone: data.phone || '',
                password: data.password,
                role: data.role,
            });
            setShowVerifyModal(true);
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(detail || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* 
              Added a flex container with min-height to perfectly center the card.
              The min-h-[calc(100vh-5rem)] accounts for your top navigation bar height.
            */}
            <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-gray-50/50">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                        <p className="text-sm text-gray-500 mt-1">Join FoodExpress Pro</p>
                    </div>

                    {/* Reduced space-y-5 to space-y-4 to save vertical real estate */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Full Name</label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                {/* Reduced py-3 to py-2.5 */}
                                <input {...register('full_name')} className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow" placeholder="John Doe" />
                            </div>
                            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Email</label>
                            <div className="relative">
                                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="email" {...register('email')} className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow" placeholder="you@example.com" />
                            </div>
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Phone (optional)</label>
                                <div className="relative">
                                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="tel" {...register('phone')} className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow" placeholder="(555) 123-4567" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Role</label>
                                <select {...register('role')} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow bg-white">
                                    <option value="CUSTOMER">Customer</option>
                                    <option value="RESTAURANT_OWNER">Restaurant Owner</option>
                                    <option value="DELIVERY_PARTNER">Delivery Partner</option>
                                </select>
                                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Password</label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="password" {...register('password')} className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow" placeholder="Min. 8 chars" />
                                </div>
                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Confirm</label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="password" {...register('confirm_password')} className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow" placeholder="Confirm" />
                                </div>
                                {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-2 bg-[#ff3b30] hover:bg-[#e6352b] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            ) : (
                                <>
                                    <FiUserCheck className="w-4 h-4" />
                                    <span>Create Account</span>
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#ff3b30] font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            {/* Verification Modal */}
            <Modal isOpen={showVerifyModal} onClose={() => { setShowVerifyModal(false); navigate('/login'); }} title="Verify Your Email">
                <div className="text-center p-2">
                    <div className="text-5xl mb-4">📧</div>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                        A verification link has been sent to your email address. Please check your inbox and click the link to activate your account.
                    </p>
                    <button
                        onClick={() => { setShowVerifyModal(false); navigate('/login'); }}
                        className="w-full bg-[#ff3b30] text-white py-2.5 rounded-lg hover:bg-[#e6352b] transition text-sm font-semibold"
                    >
                        Go to Login
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default Register;