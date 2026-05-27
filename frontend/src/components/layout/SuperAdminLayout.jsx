import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/super-admin',               icon: '📊', label: 'Dashboard'     },
  { to: '/super-admin/shops',         icon: '🏪', label: 'Shops'         },
  { to: '/super-admin/subscriptions', icon: '💳', label: 'Subscriptions' },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[#f5f3ee]">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-[#050a30] flex flex-col flex-shrink-0`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <span className="text-2xl">👑</span>
          {sidebarOpen && (
            <div>
              <p className="text-white font-semibold text-sm">New Fashion Jewellery</p>
              <p className="text-yellow-400/70 text-[10px] uppercase tracking-wider">Super Admin</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/super-admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                 ${isActive ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'}`
              }>
              <span className="flex-shrink-0">{icon}</span>
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-white/10">
            <p className="text-white text-xs font-medium">{user?.name || 'Super Admin'}</p>
            <p className="text-white/40 text-[10px]">{user?.email}</p>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(s => !s)} className="text-gray-500 hover:text-[#050a30] p-1 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">👑 Super Admin</span>
            <button onClick={() => { logout(); navigate('/login'); }}
                    className="text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}