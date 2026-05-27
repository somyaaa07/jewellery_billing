import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, AlertCircle, IndianRupee, Plus, ArrowRight } from 'lucide-react';
import { dashboardAPI } from '../../services/api';
import { fmtINR, fmtDate } from '../../utils/helper';
import StatCard from '../../components/ui/StatCard';
import Badge    from '../../components/ui/Badge';
import Spinner  from '../../components/ui/Spinner';


const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ShopDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then(r => {
        // API returns { success, data: { overview, recentSales, monthlyChart } }
        const payload = r.data?.data || r.data;
        setData(payload);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center size="lg" />;
  if (!data)   return <p className="font-slab text-sm text-gray-500 p-6">Dashboard data failed to load</p>;

  const { overview = {}, recentSales = [], monthlyChart = [] } = data;

  // monthlyChart rows: { month: 1-12, year, totalSales, collected, billCount }
  const chartData = monthlyChart.map(m => ({
    name:      MONTHS[(parseInt(m.month) || 1) - 1],
    Sales:     parseFloat(m.totalSales  || 0),
    Collected: parseFloat(m.collected   || 0),
  }));
  

  return (
    <div className="space-y-6">

      {/* Stats */}
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    title="Total Sales"
    value={fmtINR(overview.totalRevenue)}
    sub={`${overview.totalSalesCount || 0} invoices`}
    icon={IndianRupee}
    color="blue"
  />

  <StatCard
    title="Collected"
    value={fmtINR(overview.monthRevenue)}
    sub="This month"
    icon={TrendingUp}
    color="green"
  />

  <StatCard
    title="Total Due"
    value={fmtINR(overview.totalDue)}
    sub="Pending payments"
    icon={AlertCircle}
    color="red"
  />

  <StatCard
    title="Monthly Bills"
    value={overview.monthSales || 0}
    sub="This month"
    icon={Users}
    color="purple"
  />
</div>

      {/* Chart + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-slab font-semibold text-[#050a30] text-sm">Revenue Overview</h3>
            <span className="font-slab text-xs text-gray-400">Last 6 months</span>
          </div>
          {chartData.length === 0 ? (
            <div className="font-slab flex items-center justify-center h-[200px] text-sm text-gray-400">
              Not Any Chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#050a30" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#050a30" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={v => '₹' + Number(v).toLocaleString('en-IN')}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, name) => [fmtINR(v), name]}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Area type="monotone" dataKey="Sales"     stroke="#050a30" fill="url(#sales)"     strokeWidth={2} />
                <Area type="monotone" dataKey="Collected" stroke="#10b981" fill="url(#collected)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'New Bill',     to: '/billing',   icon: Plus,        color: 'bg-[#050a30] text-white'    },
              { label: 'Add Customer', to: '/customers', icon: Users,       color: 'bg-blue-50 text-blue-600'   },
              { label: 'View Dues',    to: '/dues',      icon: AlertCircle, color: 'bg-red-50 text-red-500'     },
              { label: 'All Invoices', to: '/invoices',  icon: ArrowRight,  color: 'bg-green-50 text-green-600' },
            ].map(a => (
              <Link key={a.to} to={a.to}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                  <a.icon size={15} />
                </div>
                <span className="text-sm font-medium text-[#050a30]">{a.label}</span>
                <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className=" font-slab font-semibold text-[#050a30] text-sm">Recent Invoices</h3>
          <Link to="/invoices" className=" font-slab text-xs text-[#050a30]/60 hover:text-[#050a30] flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Invoice', 'Customer', 'Date', 'Total', 'Paid', 'Due', 'Status'].map(h => (
                  <th key={h} className="table-th first:rounded-l-lg last:rounded-r-lg whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="font-slab text-center py-8 text-sm text-gray-400">I didn’t receive any invoice</td>
                </tr>
              ) : recentSales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-mono text-xs font-medium">{s.invoiceNumber}</td>
                  <td className="table-td">{s.customer?.name || ''} </td>
                  <td className="table-td whitespace-nowrap">{fmtDate(s.saleDate)} </td>
                  <td className="table-td font-medium">{fmtINR(s.totalAmount)}</td>
                  <td className="table-td text-green-600">{fmtINR(s.paidAmount)}</td>
                  <td className="table-td text-red-500">{fmtINR(s.dueAmount)}</td>
                  <td className="table-td"><Badge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}







