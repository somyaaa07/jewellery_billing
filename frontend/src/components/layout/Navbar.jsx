import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ onMenuClick, title = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 px-3 sm:px-5 md:px-6 py-3 sm:py-3.5 flex items-center gap-2 sm:gap-4 sticky top-0 z-30 min-w-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex-shrink-0 p-1.5 -ml-1 rounded-md text-gray-500 hover:text-[#050a30] hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="font-slab text-lg sm:text-xl md:text-2xl font-semibold text-[#050a30] flex-1 truncate min-w-0">
        {title}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* User avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropOpen(o => !o)}
            className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            aria-haspopup="true"
            aria-expanded={dropOpen}
          >
            {/* Avatar circle */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#050a30] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>

            {/* Name — hidden on xs, visible sm+ */}
            <span className="text-sm font-medium text-[#050a30] hidden sm:block max-w-[100px] md:max-w-[140px] lg:max-w-[180px] truncate">
              {user?.name}
            </span>

            {/* Chevron indicator — visible sm+ */}
            <svg
              className={`hidden sm:block w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {/* Dropdown */}
          {dropOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />

              {/* Menu panel */}
              <div className="absolute right-0 top-full mt-1.5 w-48 sm:w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-[#050a30] truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                </div>

                {/* Logout */}
                <button
                  onClick={() => {
                    setDropOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
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