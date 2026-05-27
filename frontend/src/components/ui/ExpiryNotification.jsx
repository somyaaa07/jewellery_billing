import { useState, useEffect, useRef } from 'react';
import { Bell, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { shopAPI } from '../../services/api';
import { fmtDate } from '../../utils/helper';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ExpiryNotification({ collapsed }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [items,  setItems]  = useState([]);
  const [open,   setOpen]   = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await shopAPI.getExpiring();
        const all = res.data.data || [];
        if (user.role === 'super_admin') {
          setItems(all);
        } else {
          setItems(all.filter(s => s.shopId === user.shopId));
        }
      } catch (e) { console.error(e); }
    };
    fetch();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysLeft = (endDate) =>
    Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div ref={ref} className="relative px-2 mb-1">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
          text-white/60 hover:bg-white/10 hover:text-white transition-all w-full
          ${collapsed ? 'justify-center' : ''}
          ${open ? 'bg-white/10 text-white' : ''}`}
        title="Notifications"
      >
        <Bell size={17} className="flex-shrink-0" />
        {!collapsed && <span>Notifications</span>}

        {/* Badge */}
        {items.length > 0 && (
          <span className={`
            absolute bg-red-500 text-white text-[10px] font-bold rounded-full
            flex items-center justify-center leading-none
            ${collapsed ? 'top-1.5 right-1.5 w-4 h-4' : 'top-2 right-2 min-w-[18px] h-[18px] px-1'}
          `}>
            {items.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`
          absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100
          w-72 overflow-hidden
          ${collapsed ? 'left-14 bottom-0' : 'left-0 bottom-12'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[#050a30]" />
              <span className="text-sm font-semibold text-[#050a30]">Notifications</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          {/* Items */}
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">No notifications</p>
              </div>
            ) : items.map(sub => {
              const days    = daysLeft(sub.endDate);
              const isUrgent = days <= 2;
              return (
                <div
                  key={sub.id}
                  className={`px-4 py-3 border-b border-gray-50 last:border-0 ${
                    isUrgent ? 'bg-red-50' : 'bg-yellow-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      size={14}
                      className={`flex-shrink-0 mt-0.5 ${isUrgent ? 'text-red-500' : 'text-yellow-500'}`}
                    />
                    <div className="flex-1 min-w-0">
                      {user.role === 'super_admin' ? (
                        <>
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {sub.shop?.name}
                          </p>
                          <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-600' : 'text-yellow-700'}`}>
                            Expiring in <span className="font-bold">{days}d</span> · {fmtDate(sub.endDate)}
                          </p>
                          {/* Renew shortcut for super admin */}
                          <button
                            onClick={() => { navigate(`/super-admin/shops/${sub.shopId}`); setOpen(false); }}
                            className="flex items-center gap-1 text-[10px] font-medium text-[#050a30] mt-1.5 hover:underline"
                          >
                            <RefreshCw size={10} /> Renew now
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-gray-800">
                            Subscription expiring soon
                          </p>
                          <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-600' : 'text-yellow-700'}`}>
                            <span className="font-bold">{days}d left</span> · {fmtDate(sub.endDate)}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Contact your admin to renew
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}