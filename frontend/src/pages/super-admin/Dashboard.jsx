import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Building2, Users, Star, TrendingUp,
  AlertCircle, ArrowRight, CheckCircle, XCircle,
} from 'lucide-react';
import { shopAPI } from '../../services/api';
import { fmtINR, fmtDate } from '../../utils/helper';
import StatCard from '../../components/ui/StatCard';
import Badge    from '../../components/ui/Badge';
import Spinner  from '../../components/ui/Spinner';

const COLORS = ['#050a30', '#10b981', '#f59e0b', '#ef4444'];
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SuperDashboard() {
  const [shops,   setShops]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopAPI.getAll()
      .then(r => setShops(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center size="lg" />;

  // ── Derived stats ──────────────────────────
  const totalShops   = shops.length;
  const activeShops  = shops.filter(s => s.isActive).length;
  const now          = new Date();

  const activeSubs   = shops.filter(s => {
    const sub = s.subscriptions?.[0];
    return sub && new Date(sub.endDate) >= now;
  }).length;

  const expiredSubs  = shops.filter(s => {
    const sub = s.subscriptions?.[0];
    return !sub || new Date(sub.endDate) < now;
  }).length;

  // Revenue from subscriptions
  const totalRevenue = shops.reduce((sum, s) => {
    const sub = s.subscriptions?.[0];
    return sum + parseFloat(sub?.amount || 0);
  }, 0);

  // Plan distribution for pie chart
  const planCounts = shops.reduce((acc, s) => {
    const plan = s.subscriptions?.[0]?.plan || 'none';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(planCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Monthly signups (last 6 months)
  const monthlySignups = Array.from({ length: 6 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const count = shops.filter(s => {
      const c = new Date(s.createdAt);
      return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
    }).length;
    return { name: MONTHS[d.getMonth()], Shops: count };
  });

  // Recent shops
  const recentShops = [...shops]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Expiring soon (within 7 days)
  const expiringSoon = shops.filter(s => {
    const sub = s.subscriptions?.[0];
    if (!sub) return false;
    const diff = (new Date(sub.endDate) - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  return (
    <div className="space-y-6">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Shops"
          value={totalShops}
          sub={`${activeShops} active`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Active Subscriptions"
          value={activeSubs}
          sub="Currently running"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Expired / No Sub"
          value={expiredSubs}
          sub="Need renewal"
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Total Revenue"
          value={fmtINR(totalRevenue)}
          sub="From subscriptions"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* ── Expiring Soon Alert ── */}
      {expiringSoon.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {expiringSoon.length} shop{expiringSoon.length > 1 ? 's' : ''} subscription{expiringSoon.length > 1 ? 's' : ''} will expire within 7 days!
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {expiringSoon.map(s => s.name).join(', ')}
            </p>
          </div>
          <Link to="/super-admin/subscriptions" className="ml-auto text-xs font-medium text-yellow-700 hover:text-yellow-900 flex items-center gap-1 whitespace-nowrap">
            Manage <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Shop signups chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className=" font-slab font-semibold text-[#050a30] text-sm">Shop Signups</h3>
            <span className="font-slab text-xs text-gray-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlySignups}>
              <defs>
                <linearGradient id="shopGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#050a30" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#050a30" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="Shops"
                stroke="#050a30"
                fill="url(#shopGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution pie */}
        <div className="card">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Plan Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="font-slab flex items-center justify-center h-40 text-sm text-gray-400">
              No subscription data available
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Create New Shop', to: '/super-admin/shops',         icon: Building2,  color: 'bg-[#050a30] text-white' },
          { label: 'Manage Subscriptions', to: '/super-admin/subscriptions', icon: Star,  color: 'bg-purple-50 text-purple-600' },
          { label: 'View All Shops', to: '/super-admin/shops',          icon: ArrowRight, color: 'bg-blue-50 text-blue-600' },
        ].map(a => (
          <Link
            key={a.to + a.label}
            to={a.to}
            className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.color}`}>
              <a.icon size={18} />
            </div>
            <span className="text-sm font-medium text-[#050a30]">{a.label}</span>
            <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Link>
        ))}
      </div>

      {/* ── Recent Shops ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm">Recently Added Shops</h3>
          <Link
            to="/super-admin/shops"
            className="text-xs text-[#050a30]/60 hover:text-[#050a30] flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Shop Name','Owner','City','Plan','Expires','Status'].map(h => (
                  <th key={h} className="table-th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentShops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-gray-400">
                    No shops found
                  </td>
                </tr>
              ) : recentShops.map(shop => {
                const sub      = shop.subscriptions?.[0];
                const isActive = sub && new Date(sub.endDate) >= now;
                return (
                  <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#050a30] rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {shop.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#050a30] text-sm">{shop.name}</p>
                          {shop.gstin && <p className="text-xs text-gray-400">{shop.gstin}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-gray-600">{shop.ownerName}</td>
                    <td className="table-td text-gray-600">{shop.city || '—'}</td>
                    <td className="table-td capitalize">{sub?.plan || '—'}</td>
                    <td className="table-td whitespace-nowrap">{sub ? fmtDate(sub.endDate) : '—'}</td>
                    <td className="table-td">
                      <Badge status={isActive ? 'active' : 'expired'} label={isActive ? 'Active' : 'Expired'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}