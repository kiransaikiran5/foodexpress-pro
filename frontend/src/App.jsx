import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './store/authContext';
import { CartProvider } from './store/cartContext';
import NotificationProvider from './store/NotificationProvider';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';

// Customer pages
import CustomerDashboard from './pages/CustomerDashboard';
import CartPage from './pages/Cart';
import Restaurants from './pages/Restaurants';
import RestaurantMenu from './pages/RestaurantMenu';
import Orders from './pages/Orders';
import TrackOrder from './pages/TrackOrder';
import Discover from './pages/Discover';
import MyRefunds from './pages/MyRefunds';
import ScheduledOrders from './pages/ScheduledOrders';
import GroupOrders from './pages/GroupOrders';
import GroupOrderDetail from './pages/GroupOrderDetail';
import ReserveTable from './pages/ReserveTable';
import MyReservations from './pages/MyReservations';
import Recommendations from './pages/Recommendations';
import MyTickets from './pages/MyTickets';

// Restaurant Owner pages
import MyRestaurant from './pages/owner/MyRestaurant';
import Kitchen from './pages/owner/Kitchen';

// Delivery Partner pages
import DeliveryProfile from './pages/delivery/Profile';
import AssignedDeliveries from './pages/delivery/AssignedDeliveries';
import DeliveryDashboard from './pages/delivery/Dashboard';

// Admin pages
import RestaurantApproval from './pages/admin/RestaurantApproval';
import DeliveryPartnersAdmin from './pages/admin/DeliveryPartners';
import AssignOrders from './pages/admin/AssignOrders';
import CouponManagement from './pages/admin/CouponManagement';
import ReviewManagement from './pages/admin/ReviewManagement';
import PromoNotification from './pages/admin/PromoNotification';
import AdminDashboard from './pages/admin/Dashboard';
import Reports from './pages/admin/Reports';
import RefundManagement from './pages/admin/RefundManagement';
import AuditLogs from './pages/admin/AuditLogs';
import BusinessIntelligence from './pages/admin/BusinessIntelligence';
import AdminSettings from './pages/admin/Settings';
import SupportDashboard from './pages/admin/SupportDashboard';
import CampaignManagement from './pages/admin/CampaignManagement';
import FinancialDashboard from './pages/admin/FinancialDashboard';
import BusinessAnalytics from './pages/admin/BusinessAnalytics';
import SuperAdmin from './pages/admin/SuperAdmin';
import MonitoringDashboard from './pages/admin/MonitoringDashboard';


import Checkout from './pages/Checkout';
import WalletPage from './pages/WalletPage';
import PaymentHistory from './pages/PaymentHistory';
import Chat from './pages/Chat';
import Membership from './pages/Membership';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: '10px',
                  background: '#1a1a2e',
                  color: '#fff',
                },
              }}
            />
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Protected route – any logged‑in user */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Customer routes */}
                <Route
                  path="/customer/dashboard"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <CustomerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/restaurants"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <Restaurants />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/restaurant/:restaurantId/menu"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <RestaurantMenu />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/:orderId"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wallet"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <WalletPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <PaymentHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/track-order/:orderId"
                  element={
                    <ProtectedRoute roles={['CUSTOMER']}>
                      <TrackOrder />
                    </ProtectedRoute>
                  }
                />
                <Route path="/discover" element={
                  <ProtectedRoute roles={['CUSTOMER']}>
                    <Discover />
                  </ProtectedRoute>
                } />
                <Route path="/my-refunds" element={
                  <ProtectedRoute roles={['CUSTOMER']}>
                    <MyRefunds />
                  </ProtectedRoute>
                } />
                <Route path="/scheduled-orders" element={
                  <ProtectedRoute roles={['CUSTOMER']}>
                    <ScheduledOrders />
                  </ProtectedRoute>
                } />
                <Route path="/group-orders" element={<ProtectedRoute roles={['CUSTOMER']}><GroupOrders /></ProtectedRoute>} />
                <Route path="/group-order/:groupId" element={<ProtectedRoute roles={['CUSTOMER']}><GroupOrderDetail /></ProtectedRoute>} />
                <Route path="/reserve" element={<ProtectedRoute roles={['CUSTOMER']}><ReserveTable /></ProtectedRoute>} />
                <Route path="/my-reservations" element={<ProtectedRoute roles={['CUSTOMER']}><MyReservations /></ProtectedRoute>} />
                <Route path="/recommendations" element={
                  <ProtectedRoute roles={['CUSTOMER']}>
                    <Recommendations />
                  </ProtectedRoute>
                } />
                <Route path="/support" element={<ProtectedRoute roles={['CUSTOMER']}><MyTickets /></ProtectedRoute>} />



                {/* Restaurant Owner routes */}
                <Route
                  path="/owner/restaurant"
                  element={
                    <ProtectedRoute roles={['RESTAURANT_OWNER']}>
                      <MyRestaurant />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/owner/kitchen"
                  element={
                    <ProtectedRoute roles={['RESTAURANT_OWNER']}>
                      <Kitchen />
                    </ProtectedRoute>
                  }
                />

                {/* Delivery Partner routes */}
                <Route
                  path="/delivery/profile"
                  element={
                    <ProtectedRoute roles={['DELIVERY_PARTNER']}>
                      <DeliveryProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/delivery/assigned"
                  element={
                    <ProtectedRoute roles={['DELIVERY_PARTNER']}>
                      <AssignedDeliveries />
                    </ProtectedRoute>
                  }
                />
                <Route path="/delivery/dashboard" element={
                  <ProtectedRoute roles={['DELIVERY_PARTNER']}>
                    <DeliveryDashboard />
                  </ProtectedRoute>
                } />

                {/* Admin routes */}
                <Route
                  path="/admin/restaurants"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <RestaurantApproval />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/delivery-partners"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <DeliveryPartnersAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/assign-orders"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <AssignOrders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/coupons"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <CouponManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reviews"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <ReviewManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/promo"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <PromoNotification />
                    </ProtectedRoute>
                  }
                />
                <Route path="/chat" element={
                  <ProtectedRoute roles={['CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY_PARTNER', 'ADMIN']}>
                    <Chat />
                  </ProtectedRoute>
                } />
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/admin/refunds" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <RefundManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/audit-logs" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AuditLogs />
                  </ProtectedRoute>
                } />
                <Route path="/admin/business-intelligence" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <BusinessIntelligence />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminSettings />
                  </ProtectedRoute>
                } />
                <Route path="/admin/support" element={<ProtectedRoute roles={['ADMIN']}><SupportDashboard /></ProtectedRoute>} />
                <Route path="/admin/campaigns" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <CampaignManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/financial-dashboard" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <FinancialDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/business-analytics" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <BusinessAnalytics />
                  </ProtectedRoute>
                } />
                <Route path="/admin/super-admin" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SuperAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/admin/monitoring" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <MonitoringDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/membership" element={<Membership />} />


              </Routes>
            </Layout>
          </Router>
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;