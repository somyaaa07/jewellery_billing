import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
 
// Role check karke route protect karta hai
export default function ProtectedRoute({ role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // super_admin ko sab access, shop_admin ko sirf shop routes
  if (role === 'super_admin' && user.role !== 'super_admin')
    return <Navigate to="/dashboard" replace />;
  if (role === 'shop_admin' && user.role === 'super_admin')
    return <Navigate to="/super-admin" replace />;
  return <Outlet />;
}
 