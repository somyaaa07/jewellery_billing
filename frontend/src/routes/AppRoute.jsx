import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout';

// Pages — Auth
import Login from '../pages/auth/Login';
// RegisterSuperAdmin  — HATA DIYA (security)
// RegisterShopAdmin   — HATA DIYA (security)

// Pages — Shop Admin
import ShopDashboard  from '../pages/shop-admin/Dashboard';
import Billing        from '../pages/shop-admin/Billing';
import Customers      from '../pages/shop-admin/Customers';
import Dues           from '../pages/shop-admin/Due';
import Payments       from '../pages/shop-admin/Payments';
import Invoices       from '../pages/shop-admin/Invoices';
import InvoiceView    from '../pages/shop-admin/InvoiceView';
import Reports        from '../pages/shop-admin/Reports';
import Settings       from '../pages/shop-admin/Settings';
import CustomerDetail from '../pages/shop-admin/CustomerDetail';
import PaymentDetailPage from '../pages/shop-admin/PaymentDetail';

// Pages — Super Admin
import SuperDashboard from '../pages/super-admin/Dashboard';
import Shops          from '../pages/super-admin/Shops';
import Subscriptions  from '../pages/super-admin/Subscription';
import ShopDetail     from '../pages/super-admin/ShopDetail';

// ── Unauthorized Page ─────────────────────────
function Unauthorized() {
  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-[#050a30] mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 mb-6">
          To access this page, you must first log in.
        </p>
        <a href="/login" className="btn-primary inline-flex justify-center w-full">
          Go to login
        </a>
      </div>
    </div>
  );
}

// ── Protected Route ───────────────────────────
function Protected({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

// ── Home Redirect ─────────────────────────────
function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'super_admin' ? '/super-admin' : '/dashboard'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── ONLY Public route ── */}
      {/* Sirf login page hi public hai                  */}
      {/* /register/super-admin — NAHI hai               */}
      {/* /register/shop-admin  — NAHI hai               */}
      {/* Koi bhi in URLs pe jaye to / pe redirect hoga  */}
      <Route path="/login"        element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Home ── */}
      <Route path="/" element={<HomeRedirect />} />

      {/* ── Shop Admin Routes ── */}
      <Route element={<Protected roles={['shop_admin']}><MainLayout /></Protected>}>
        <Route path="/dashboard"        element={<ShopDashboard />} />
        <Route path="/billing"          element={<Billing />} />
        <Route path="/customers"        element={<Customers />} />
        <Route path="/customers/:id"    element={<CustomerDetail />} />
        <Route path="/dues"             element={<Dues />} />
        <Route path="/payments"         element={<Payments />} />
        <Route path="/sales/:id/payments"      element={<PaymentDetailPage />} />
        <Route path="/invoices"         element={<Invoices />} />
        <Route path="/invoice/:id"      element={<InvoiceView />} />
        <Route path="/reports"          element={<Reports />} />
        <Route path="/settings"         element={<Settings />} />
      </Route>

      <Route element={<Protected roles={['super_admin']}><MainLayout /></Protected>}>
        <Route path="/super-admin"                element={<SuperDashboard />} />
        <Route path="/super-admin/shops"          element={<Shops />} />
        <Route path="/super-admin/subscriptions"  element={<Subscriptions />} />
        <Route path="/shops/:id"                  element={<ShopDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}