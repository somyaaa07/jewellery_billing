import {  Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ onMenuClick, title = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3.5 flex items-center gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-[#050a30]">
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="font-slab text-2xl font-semibold text-[#050a30] flex-1">{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        {/* <button className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-[#050a30] relative transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button> */}

        {/* User avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropOpen(o => !o)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-7 h-7 bg-[#050a30] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-[#050a30] hidden sm:block max-w-[120px] truncate">
              {user?.name}
            </span>
          </button>
          {dropOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                <div className="px-4 py-2.5 border-b border-gray-50">
                  <p className="text-xs font-semibold text-[#050a30] truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}