import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard'      },
  { to: '/billing',   icon: '🧾', label: 'Billing'        },
  { to: '/customers', icon: '👥', label: 'Customers'      },
  { to: '/due',       icon: '⏳', label: 'Due Management' },
  { to: '/payments',  icon: '💰', label: 'Payments'       },
  { to: '/invoices',  icon: '📄', label: 'Invoices'       },
  { to: '/reports',   icon: '📈', label: 'Reports'        },
];

export default function ShopLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-[#f5f3ee]">

      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300
                         bg-[#050a30] flex flex-col flex-shrink-0 min-h-screen`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <span className="text-2xl">💍</span>
          {sidebarOpen && (
            <div>
              <p className="text-white font-semibold text-sm leading-tight">New Fashion Jewellery</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Management</p>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                 ${isActive
                   ? 'bg-white/15 text-white font-medium'
                   : 'text-white/60 hover:bg-white/10 hover:text-white'}`
              }>
              <span className="text-base flex-shrink-0">{icon}</span>
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-white/10">
            <p className="text-white text-xs font-medium truncate">{user?.name || 'Shop Admin'}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.email}</p>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(s => !s)}
                  className="text-gray-500 hover:text-[#050a30] transition-colors p-1 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="flex items-center gap-4">
            {/* Notification */}
            <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-lg">🔔</span>
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"/>
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button onClick={() => setDropdownOpen(s => !s)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#050a30] flex items-center justify-center text-white text-xs font-bold">
                  {(user?.name || 'A')[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[#050a30] hidden sm:block">
                  {user?.name || 'Admin'}
                </span>
                <span className="text-gray-400 text-xs">▼</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-medium text-[#050a30] truncate">{user?.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button onClick={handleLogout}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-b-xl">
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}