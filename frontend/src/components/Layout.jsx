import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { useCart } from '../store/cartContext';
import NotificationBell from '../components/NotificationBell';
import {
    FiUser,
    FiLogOut,
    FiGrid,
    FiShoppingCart,
    FiShoppingBag,
    FiList,
    FiHome,
    FiClipboard,
    FiTruck,
    FiDollarSign,
    FiCreditCard,
    FiTag,
    FiStar,
    FiBell,
    FiMessageCircle,
    FiMenu,
    FiX,
    FiChevronDown,
    FiSettings,
    FiCompass,
    FiBarChart2,
    FiShield,
    FiClock,
    FiUsers,
    FiCalendar,
    FiZap,
    FiHelpCircle,
    FiSend,
    FiTrendingUp,
} from 'react-icons/fi';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount } = useCart();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu & dropdowns on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsProfileDropdownOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Helper to check active routes for styling
    const isActive = (path) => location.pathname.includes(path);

    // Reusable NavItem component for desktop
    const NavItem = ({ to, icon: Icon, label }) => (
        <Link
            to={to}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${isActive(to)
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </Link>
    );

    // Reusable Mobile NavItem component
    const MobileNavItem = ({ to, icon: Icon, label }) => (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${isActive(to)
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </Link>
    );

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* ---------- Top Navbar ---------- */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 transition-all shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">

                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 group outline-none focus-visible:ring-4 rounded-xl ring-blue-100 pr-2">
                            <span className="text-2xl transition-transform group-hover:scale-110 duration-300">🍔</span>
                            <span className="text-xl font-black text-slate-900 tracking-tight hidden sm:block">
                                Food<span className="text-blue-600">Express</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
                            {user && (
                                <>
                                    {/* Primary Customer Links */}
                                    {user.role === 'CUSTOMER' && (
                                        <>
                                            <NavItem to="/customer/dashboard" icon={FiGrid} label="Dashboard" />
                                            <NavItem to="/restaurants" icon={FiShoppingBag} label="Order Food" />
                                            <NavItem to="/orders" icon={FiList} label="Orders" />
                                            <NavItem to="/discover" icon={FiCompass} label="Discover" />

                                            {/* More dropdown for Customer */}
                                            <div className="relative group">
                                                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all outline-none">
                                                    <FiChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-200" />
                                                    <span>More</span>
                                                </button>

                                                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-3 flex flex-col gap-1">
                                                    <Link to="/reserve" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiCalendar className="w-4 h-4" /> Reserve Table
                                                    </Link>
                                                    <Link to="/my-reservations" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiClock className="w-4 h-4" /> My Reservations
                                                    </Link>

                                                    <div className="h-px bg-slate-100 my-1 mx-4" />

                                                    <Link to="/scheduled-orders" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiClock className="w-4 h-4" /> Scheduled Orders
                                                    </Link>
                                                    <Link to="/group-orders" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiUsers className="w-4 h-4" /> Group Orders
                                                    </Link>

                                                    <div className="h-px bg-slate-100 my-1 mx-4" />

                                                    <Link to="/my-refunds" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiDollarSign className="w-4 h-4" /> Refunds
                                                    </Link>
                                                    <Link to="/membership" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiStar className="w-4 h-4" /> Membership
                                                    </Link>
                                                    <Link to="/recommendations" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiZap className="w-4 h-4" /> Recommendations
                                                    </Link>
                                                    <Link to="/support" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiHelpCircle className="w-4 h-4" /> Support
                                                    </Link>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Primary Restaurant Owner Links */}
                                    {user.role === 'RESTAURANT_OWNER' && (
                                        <>
                                            <NavItem to="/owner/restaurant" icon={FiHome} label="My Restaurant" />
                                            <NavItem to="/owner/kitchen" icon={FiClipboard} label="Kitchen" />
                                        </>
                                    )}

                                    {/* Primary Delivery Partner Links */}
                                    {user.role === 'DELIVERY_PARTNER' && (
                                        <>
                                            <NavItem to="/delivery/dashboard" icon={FiGrid} label="Dashboard" />
                                            <NavItem to="/delivery/profile" icon={FiUser} label="Profile" />   
                                            <NavItem to="/delivery/assigned" icon={FiTruck} label="Deliveries" />
                                        </>
                                    )}

                                    {/* Primary Admin Links */}
                                    {user.role === 'ADMIN' && (
                                        <>
                                            <NavItem to="/admin/dashboard" icon={FiGrid} label="Dashboard" />
                                            <NavItem to="/admin/restaurants" icon={FiHome} label="Approve" />
                                            <NavItem to="/admin/assign-orders" icon={FiClipboard} label="Assign" />
                                            <NavItem to="/admin/settings" icon={FiSettings} label="Settings" />

                                            {/* More dropdown for Admin */}
                                            <div className="relative group">
                                                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all outline-none">
                                                    <FiChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-200" />
                                                    <span>More</span>
                                                </button>

                                                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-3 flex flex-col gap-1">
                                                    <Link to="/admin/delivery-partners" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiTruck className="w-4 h-4" /> Delivery Partners
                                                    </Link>
                                                    <Link to="/admin/reports" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiBarChart2 className="w-4 h-4" /> Reports
                                                    </Link>
                                                    <Link to="/admin/refunds" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiDollarSign className="w-4 h-4" /> Refunds
                                                    </Link>
                                                    <Link to="/admin/audit-logs" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiShield className="w-4 h-4" /> Audit Logs
                                                    </Link>
                                                    <Link to="/admin/business-intelligence" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiBarChart2 className="w-4 h-4" /> BI Dashboard
                                                    </Link>

                                                    <div className="h-px bg-slate-100 my-1 mx-4" />

                                                    <Link to="/admin/coupons" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiTag className="w-4 h-4" /> Coupons
                                                    </Link>
                                                    <Link to="/admin/reviews" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiStar className="w-4 h-4" /> Reviews
                                                    </Link>
                                                    <Link to="/admin/promo" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiBell className="w-4 h-4" /> Promo
                                                    </Link>
                                                    <Link to="/admin/support" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiHelpCircle className="w-4 h-4" /> Support
                                                    </Link>
                                                    <Link to="/admin/campaigns" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiSend className="w-4 h-4" /> Campaigns
                                                    </Link>
                                                    <Link to="/admin/financial-dashboard" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiTrendingUp className="w-4 h-4" /> Financial Dashboard
                                                    </Link>
                                                    <Link to="/admin/business-analytics" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiBarChart2 className="w-4 h-4" /> Business Analytics
                                                    </Link>
                                                    <Link to="/admin/super-admin" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiShield className="w-4 h-4" /> Super Admin
                                                    </Link>
                                                    <Link to="/admin/monitoring" className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                                        <FiShield className="w-4 h-4" /> Monitoring
                                                    </Link>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="h-6 w-px bg-slate-200 mx-2" /> 

                                    {/* Universal Chat Link */}
                                    <NavItem to="/chat" icon={FiMessageCircle} label="Chat" />
                                </>
                            )}
                        </div>

                        {/* Right Actions (Cart, Notifications, Profile) */}
                        <div className="flex items-center gap-1 sm:gap-3 relative z-[60]">

                            {user ? (
                                <>
                                    {/* Cart Badge */}
                                    {user.role === 'CUSTOMER' && (
                                        <Link
                                            to="/cart"
                                            className="relative flex items-center justify-center p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
                                        >
                                            <FiShoppingCart className="w-5 h-5" />
                                            {cartCount > 0 && (
                                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
                                                    {cartCount}
                                                </span>
                                            )}
                                        </Link>
                                    )}

                                    {/* Notifications */}
                                    <NotificationBell />

                                    {/* Desktop Profile Dropdown */}
                                    <div className="hidden lg:block relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                            className="flex items-center gap-2 p-1.5 pr-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ml-1"
                                        >
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 font-bold uppercase shadow-inner text-xs border border-blue-200/50">
                                                {user.full_name ? user.full_name.charAt(0) : <FiUser size={12} />}
                                            </div>
                                            <FiChevronDown className={`text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isProfileDropdownOpen && (
                                            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                                                <div className="px-5 py-3 border-b border-slate-50 mb-2 bg-slate-50/50 rounded-t-2xl mt-[-8px]">
                                                    <p className="text-sm font-black text-slate-900 truncate">{user.full_name || 'User'}</p>
                                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">{user.role.replace('_', ' ')}</p>
                                                </div>

                                                <Link to="/profile" className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                                    <FiUser className="text-slate-400" /> Profile Settings
                                                </Link>

                                                {/* Customer Dropdown Items */}
                                                {user.role === 'CUSTOMER' && (
                                                    <>
                                                        <Link to="/wallet" className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                                            <FiDollarSign className="text-slate-400" /> Wallet Balance
                                                        </Link>
                                                        <Link to="/payments" className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                                            <FiCreditCard className="text-slate-400" /> Payment Methods
                                                        </Link>
                                                    </>
                                                )}

                                                <div className="h-px bg-slate-100 my-2 mx-4" />

                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                                                >
                                                    <FiLogOut /> Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Menu Toggle */}
                                    <button
                                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                        className="lg:hidden p-2 ml-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors outline-none"
                                    >
                                        {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Link
                                        to="/login"
                                        className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm font-bold transition-colors hidden sm:block"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 text-sm font-bold"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ---------- Mobile Navigation Overlay ---------- */}
                {isMobileMenuOpen && user && (
                    <div className="lg:hidden absolute top-[64px] left-0 right-0 bg-white border-b border-slate-200 shadow-2xl z-40 animate-in slide-in-from-top-4 duration-200">
                        <div className="px-4 py-6 space-y-1 h-[calc(100vh-64px)] overflow-y-auto pb-32">

                            {/* User Info Mobile */}
                            <div className="flex items-center gap-4 px-4 pb-6 mb-4 border-b border-slate-100">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 font-black uppercase text-xl border border-blue-100">
                                    {user.full_name ? user.full_name.charAt(0) : <FiUser />}
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 text-xl">{user.full_name || 'User'}</p>
                                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mt-0.5">{user.role.replace('_', ' ')}</p>
                                </div>
                            </div>

                            {user.role === 'CUSTOMER' && (
                                <>
                                    <MobileNavItem to="/customer/dashboard" icon={FiGrid} label="Dashboard" />
                                    <MobileNavItem to="/restaurants" icon={FiShoppingBag} label="Order Food" />
                                    <MobileNavItem to="/orders" icon={FiList} label="My Orders" />
                                    <MobileNavItem to="/discover" icon={FiCompass} label="Discover" />
                                    <div className="h-px bg-slate-100 my-2 mx-2" />
                                    <MobileNavItem to="/reserve" icon={FiCalendar} label="Reserve a Table" />
                                    <MobileNavItem to="/my-reservations" icon={FiClock} label="My Reservations" />
                                    <div className="h-px bg-slate-100 my-2 mx-2" />
                                    <MobileNavItem to="/scheduled-orders" icon={FiClock} label="Scheduled Orders" />
                                    <MobileNavItem to="/group-orders" icon={FiUsers} label="Group Order" />
                                    <div className="h-px bg-slate-100 my-2 mx-2" />
                                    <MobileNavItem to="/my-refunds" icon={FiDollarSign} label="Refund History" />
                                    <MobileNavItem to="/wallet" icon={FiDollarSign} label="Wallet" />
                                    <MobileNavItem to="/payments" icon={FiCreditCard} label="Payments" />
                                    <MobileNavItem to="/membership" icon={FiStar} label="Membership" />
                                    <MobileNavItem to="/recommendations" icon={FiZap} label="Recommendations" />
                                    <MobileNavItem to="/support" icon={FiHelpCircle} label="Support" />
                                </>
                            )}

                            {user.role === 'RESTAURANT_OWNER' && (
                                <>
                                    <MobileNavItem to="/owner/restaurant" icon={FiHome} label="My Restaurant" />
                                    <MobileNavItem to="/owner/kitchen" icon={FiClipboard} label="Kitchen" />
                                </>
                            )}

                            {user.role === 'DELIVERY_PARTNER' && (
                                <>
                                    <MobileNavItem to="/delivery/dashboard" icon={FiGrid} label="Dashboard" />
                                    <MobileNavItem to="/delivery/profile" icon={FiUser} label="My Profile" />
                                    <MobileNavItem to="/delivery/assigned" icon={FiTruck} label="Deliveries" />
                                </>
                            )}

                            {user.role === 'ADMIN' && (
                                <>
                                    <MobileNavItem to="/admin/dashboard" icon={FiGrid} label="Dashboard" />
                                    <MobileNavItem to="/admin/restaurants" icon={FiHome} label="Approve Restaurants" />
                                    <MobileNavItem to="/admin/delivery-partners" icon={FiTruck} label="Delivery Partners" />
                                    <MobileNavItem to="/admin/assign-orders" icon={FiClipboard} label="Assign Orders" />
                                    <MobileNavItem to="/admin/reports" icon={FiBarChart2} label="Reports" />
                                    <MobileNavItem to="/admin/refunds" icon={FiDollarSign} label="Refunds" />
                                    <MobileNavItem to="/admin/audit-logs" icon={FiShield} label="Audit Logs" />
                                    <MobileNavItem to="/admin/settings" icon={FiSettings} label="Settings" />
                                    <MobileNavItem to="/admin/business-intelligence" icon={FiBarChart2} label="Business Intelligence" />
                                    <MobileNavItem to="/admin/coupons" icon={FiTag} label="Manage Coupons" />
                                    <MobileNavItem to="/admin/reviews" icon={FiStar} label="Review Moderation" />
                                    <MobileNavItem to="/admin/promo" icon={FiBell} label="Send Promos" />
                                    <MobileNavItem to="/admin/support" icon={FiHelpCircle} label="Support" />
                                    <MobileNavItem to="/admin/campaigns" icon={FiSend} label="Campaigns" />
                                    <MobileNavItem to="/admin/financial-dashboard" icon={FiTrendingUp} label="Finance" />
                                    <MobileNavItem to="/admin/business-analytics" icon={FiBarChart2} label="Analytics" />
                                    <MobileNavItem to="/admin/super-admin" icon={FiShield} label="Super Admin" />
                                    <MobileNavItem to="/admin/monitoring" icon={FiShield} label="Monitoring" />
                                </>
                            )}

                            <MobileNavItem to="/chat" icon={FiMessageCircle} label="Messages" />
                            <MobileNavItem to="/profile" icon={FiSettings} label="Profile Settings" />

                            <div className="pt-6 mt-6 border-t border-slate-100">
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3.5 rounded-xl font-bold transition-colors active:scale-95"
                                >
                                    <FiLogOut size={18} /> Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* ---------- Main Content Area ---------- */}
            <main className="flex-grow w-full relative z-0">
                {children}
            </main>
        </div>
    );
};

export default Layout;
