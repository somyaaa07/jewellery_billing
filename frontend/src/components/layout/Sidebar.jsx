import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FileText, Users, AlertCircle,
  CreditCard, Receipt, BarChart3, Building2,
  Star, LogOut, ChevronLeft, ChevronRight, Gem,
} from 'lucide-react';
import ExpiryNotification from '../ui/ExpiryNotification';
// Sidebar — left side navigation
// Props: collapsed, onToggle
export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Shop Admin ke links
  const shopLinks = [
    { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'       },
    { to: '/billing',       icon: FileText,         label: 'New Bill'        },
    { to: '/customers',     icon: Users,            label: 'Customers'       },
    { to: '/dues',          icon: AlertCircle,      label: 'Due Management'  },
    { to: '/payments',      icon: CreditCard,       label: 'Payments'        },
    { to: '/invoices',      icon: Receipt,          label: 'Invoices'        },
    { to: '/reports',       icon: BarChart3,        label: 'Reports'         },
    // { to: '/settings',      icon: BarChart3,        label: 'Settings'        },

  ];

  // Super Admin ke extra links
  const adminLinks = [
    { to: '/super-admin',         icon: LayoutDashboard, label: 'SA Dashboard'  },
    { to: '/super-admin/shops',   icon: Building2,       label: 'Shops'         },
    { to: '/super-admin/subscriptions', icon: Star,      label: 'Subscriptions' },
  ];

  const links = isSuperAdmin ? adminLinks : shopLinks;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`
      bg-[#050a30] flex flex-col transition-all duration-300 ease-in-out h-screen sticky top-0
      ${collapsed ? 'w-16' : 'w-60'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-0.5">
             <div className="w-10 h-10  rounded-lg flex items-center justify-center">
               <Gem size={25} className="text-white" />
             </div>
            
            <span className=" font-slab font-bold text-white text-sm text-nowrap">New Fashion Jewellers</span>
          </div>
        )}
        {collapsed && (
          <div className="w-15 h-7  rounded-lg flex items-center justify-center mx-auto">
            <Gem size={25} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="text-white/40 hover:text-white transition-colors ml-1"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          <span className="text-xs font-semibold text-white/30 uppercase tracking-wider">
            {isSuperAdmin ? 'Super Admin' : 'Shop Admin'}
          </span>
        </div>
      )}

      {/* Nav links */}
      <nav className=" font-slab flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard' || to === '/super-admin'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
              ${isActive
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/60 hover:bg-white/8 hover:text-white'}
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <ExpiryNotification collapsed={collapsed} /> 
      {/* User & logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="px-2 py-2 mb-1">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60
            hover:bg-white/10 hover:text-white transition-all w-full
            ${collapsed ? 'justify-center' : ''}`}
          title="Logout"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}