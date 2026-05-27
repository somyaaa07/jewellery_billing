import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Navbar  from '../../components/layout/Navbar';

// Route se page title dhundho
const pageTitles = {
  '/dashboard':               'Dashboard',
  '/billing':                 'New Bill',
  '/customers':               'Customers',
  '/dues':                    'Due Management',
  '/payments':                'Payments',
  '/invoices':                'Invoices',
  '/reports':                 'Reports',
  '/super-admin':             'Super Admin Dashboard',
  '/super-admin/shops':       'Shop Management',
  '/super-admin/subscriptions': 'Subscriptions',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'New Fashion Jewellery';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f3ee]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 z-50 h-full lg:hidden">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}