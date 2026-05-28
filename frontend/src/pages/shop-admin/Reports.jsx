import { useState, useEffect, useRef } from 'react';
import { DollarSign, CheckCircle2, Clock3, TrendingUp } from "lucide-react";
import { saleAPI, customerAPI } from '../../services/api';
import { PageHeader, Card, StatCard, Spinner } from '../../components/ui/index';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

/* ─── Inject responsive CSS once ─────────────────────────────────────── */
const STYLE_ID = 'reports-responsive-css';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    .rp-pie-wrap {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .rp-pie-chart-col {
      flex: 0 0 200px;
    }
    .rp-pie-legend-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-left: 8px;
    }
    @media (max-width: 480px) {
      .rp-pie-wrap {
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .rp-pie-chart-col {
        flex: unset;
        width: 180px;
      }
      .rp-pie-legend-col {
        width: 100%;
        padding-left: 0;
      }
    }

    /* Table: allow horizontal scroll on small screens */
    .rp-table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .rp-table-scroll table {
      min-width: 520px;
    }

    /* Area chart header: stack on very small screens */
    .rp-area-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    @media (max-width: 400px) {
      .rp-area-header {
        flex-direction: column;
        gap: 10px;
      }
    }

    /* Footer legend: wrap on small screens */
    .rp-area-footer-legend {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }

    /* Card inner padding: reduce on mobile */
    .rp-card-pad {
      padding: 20px 20px 0;
    }
    @media (max-width: 480px) {
      .rp-card-pad {
        padding: 14px 14px 0;
      }
    }
    .rp-card-footer {
      padding: 11px 20px;
      border-top: 1px solid #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    @media (max-width: 480px) {
      .rp-card-footer {
        padding: 10px 14px;
      }
    }

    /* Monthly breakdown header padding */
    .rp-table-header {
      padding: 16px 20px;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    @media (max-width: 480px) {
      .rp-table-header {
        padding: 12px 14px;
      }
    }

    /* Donut card padding */
    .rp-donut-card-inner {
      padding: 20px;
    }
    @media (max-width: 480px) {
      .rp-donut-card-inner {
        padding: 14px;
      }
    }
  `;
  document.head.appendChild(el);
}

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');

/* ─── Custom Tooltip: Area Chart ──────────────────────────────────────── */
const AreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      minWidth: 150,
      fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: '#050a30', marginBottom: 6, fontSize: 13 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8,
            borderRadius: '50%', background: p.stroke, flexShrink: 0
          }} />
          <span style={{ color: '#6b7280' }}>{p.name}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#050a30' }}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Custom Tooltip: Donut Chart ─────────────────────────────────────── */
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '8px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8,
          borderRadius: '50%', background: d.payload.color
        }} />
        <span style={{ color: '#6b7280' }}>{d.name}</span>
        <span style={{ fontWeight: 700, color: '#050a30', marginLeft: 4 }}>{d.value}%</span>
      </div>
    </div>
  );
};

const AREAS = [
  { key: 'sales', name: 'Sales',     stroke: '#050a30', id: 'gradSales' },
  { key: 'paid',  name: 'Collected', stroke: '#16a34a', id: 'gradPaid'  },
  { key: 'due',   name: 'Due',       stroke: '#ef4444', id: 'gradDue'   },
];

/* ─── Hook: observe container width ──────────────────────────────────── */
function useContainerWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(ref.current);
    setWidth(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [salesData,    setSalesData]    = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [totals,       setTotals]       = useState({ sales: 0, paid: 0, due: 0 });
  const [loading,      setLoading]      = useState(true);
  const [totalTxns,    setTotalTxns]    = useState(0);

  // Track donut card width for responsive sizing
  const donutCardRef  = useContainerWidth(useRef(null));
  const donutWrapRef  = useRef(null);
  const donutWrapWidth = useContainerWidth(donutWrapRef);

  // Responsive donut size
  const isMobileDonut = donutWrapWidth > 0 && donutWrapWidth < 481;
  const donutSize     = isMobileDonut ? 170 : 200;
  const innerR        = isMobileDonut ? 50  : 58;
  const outerR        = isMobileDonut ? 76  : 88;

  useEffect(() => {
    Promise.all([saleAPI.getAll(), customerAPI.getAll()])
      .then(([sr, cr]) => {
        const sales     = sr.data?.data || sr.data || [];
        const customers = cr.data?.data || cr.data || [];

        const monthMap = {};
        sales.forEach(s => {
          const d     = new Date(s.saleDate || s.createdAt);
          const label = d.toLocaleString('en-IN', { month: 'short' });
          if (!monthMap[label]) monthMap[label] = { month: label, sales: 0, paid: 0, due: 0 };
          monthMap[label].sales += parseFloat(s.totalAmount || 0);
          monthMap[label].paid  += parseFloat(s.paidAmount  || 0);
          monthMap[label].due   += parseFloat(s.dueAmount   || 0);
        });

        const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthly = Object.values(monthMap)
          .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))
          .slice(-6);

        setTotals({
          sales: monthly.reduce((s, r) => s + r.sales, 0),
          paid:  monthly.reduce((s, r) => s + r.paid,  0),
          due:   monthly.reduce((s, r) => s + r.due,   0),
        });
        setSalesData(monthly);
        setTotalTxns(sales.length);

        const typeMap = { cash: 0, upi: 0, card: 0, cheque: 0, bank_transfer: 0 };
        sales.forEach(s => {
          const t = (s.paymentMode || 'cash').toLowerCase();
          if (typeMap[t] !== undefined) typeMap[t]++;
          else typeMap.cash++;
        });

        const totalDueCustomers = customers.filter(c => parseFloat(c.totalDue || 0) > 0).length;
        const totalTxnsCount    = sales.length || 1;
        const totalCustomers    = customers.length || 1;

        setPaymentTypes([
          { name: 'Cash',          value: Math.round((typeMap.cash          / totalTxnsCount) * 100), color: '#050a30' },
          { name: 'UPI',           value: Math.round((typeMap.upi           / totalTxnsCount) * 100), color: '#3b82f6' },
          { name: 'Card',          value: Math.round((typeMap.card          / totalTxnsCount) * 100), color: '#f59e0b' },
          { name: 'Cheque',        value: Math.round((typeMap.cheque        / totalTxnsCount) * 100), color: '#8b5cf6' },
          { name: 'Due',           value: Math.round((totalDueCustomers     / totalCustomers)  * 100), color: '#ef4444' },
          { name: 'Bank Transfer', value: Math.round((typeMap.bank_transfer / totalTxnsCount) * 100), color: '#c71798' },
        ].filter(t => t.value > 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const collectionRate = totals.sales > 0
    ? Math.round((totals.paid / totals.sales) * 100)
    : 0;

  return (
    <div className="fade-in">

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<DollarSign size={20} />}
          label="Total Sales"
          value={fmt(totals.sales)}
          color="#050a30"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Total Collected"
          value={fmt(totals.paid)}
          color="#16a34a"
        />
        <StatCard
          icon={<Clock3 size={20} />}
          label="Total Pending"
          value={fmt(totals.due)}
          color="#dc2626"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── Area Chart ───────────────────────────────────────────────── */}
        <Card style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>

          <div className="rp-card-pad">
            <div className="rp-area-header">
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: '#9ca3af',
                  letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px'
                }}>
                  Sales vs Collections
                </p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Last 6 months</p>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 20,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                flexShrink: 0,
              }}>
                <TrendingUp size={13} color="#16a34a" />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#16a34a' }}>
                  {collectionRate}% collected
                </span>
              </div>
            </div>
          </div>

          {salesData.length === 0
            ? <EmptyState />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={salesData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    {AREAS.map(a => (
                      <linearGradient key={a.id} id={a.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={a.stroke} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={a.stroke} stopOpacity={0.01} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} />
                  {AREAS.map(a => (
                    <Area
                      key={a.key}
                      type="monotone"
                      dataKey={a.key}
                      name={a.name}
                      stroke={a.stroke}
                      strokeWidth={2}
                      strokeDasharray={
                        a.key === 'paid' ? '5 3' :
                        a.key === 'due'  ? '3 3' : undefined
                      }
                      fill={a.key === 'due' ? 'none' : `url(#${a.id})`}
                      dot={{ r: 3, fill: a.stroke, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: a.stroke, strokeWidth: 2, stroke: '#fff' }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}

          <div className="rp-card-footer">
            <div className="rp-area-footer-legend">
              {AREAS.map(a => (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: a.stroke, display: 'inline-block', flexShrink: 0
                  }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Donut Chart ──────────────────────────────────────────────── */}
        <Card style={{ borderRadius: 16 }} ref={donutWrapRef}>
          <div className="rp-donut-card-inner">
            <div style={{ marginBottom: 20 }}>
              <h3 className="font-slab font-semibold text-[#050a30]"
                  style={{ fontSize: 15, marginBottom: 2 }}>
                Payment Type Breakdown
              </h3>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>By transaction mode</p>
            </div>

            {paymentTypes.length === 0
              ? <EmptyState />
              : (
                <div className="rp-pie-wrap">
                  {/* Donut */}
                  <div className="rp-pie-chart-col">
                    <ResponsiveContainer width={donutSize} height={donutSize}>
                      <PieChart>
                        <Pie
                          data={paymentTypes}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={innerR}
                          outerRadius={outerR}
                          paddingAngle={2}
                          startAngle={90}
                          endAngle={-270}
                          labelLine={false}
                          label={false}
                        >
                          {paymentTypes.map((e, i) => (
                            <Cell key={i} fill={e.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <text
                          x="50%" y="46%"
                          textAnchor="middle"
                          style={{ fontSize: isMobileDonut ? 18 : 22, fontWeight: 700, fill: '#050a30' }}
                        >
                          {totalTxns}
                        </text>
                        <text
                          x="50%" y="58%"
                          textAnchor="middle"
                          style={{ fontSize: 11, fill: '#9ca3af' }}
                        >
                          total txns
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="rp-pie-legend-col">
                    {paymentTypes.map((t, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px', borderRadius: 8,
                        background: '#f9fafb', gap: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: 3,
                            background: t.color, flexShrink: 0, display: 'inline-block'
                          }} />
                          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                            {t.name}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 700, color: '#050a30',
                          background: '#fff', border: '1px solid #e5e7eb',
                          borderRadius: 6, padding: '1px 8px', whiteSpace: 'nowrap',
                        }}>
                          {t.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </Card>

        {/* ── Monthly Breakdown Table ───────────────────────────────────── */}
        <Card className="xl:col-span-2" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div className="rp-table-header">
            <div>
              <h3 className="font-slab font-semibold text-[#050a30]"
                  style={{ fontSize: 15, marginBottom: 2 }}>
                Monthly Breakdown
              </h3>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>Month-by-month sales performance</p>
            </div>
          </div>

          <div className="rp-table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  {['Month', 'Total Sales', 'Collected', 'Due', 'Collection Rate'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 11, fontWeight: 600,
                      color: '#9ca3af', textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '10px 16px',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesData.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} style={{
                        textAlign: 'center', color: '#9ca3af',
                        padding: '40px 0', fontSize: 13,
                      }}>
                        No data available
                      </td>
                    </tr>
                  )
                  : salesData.map((r, idx) => {
                    const pct = r.sales > 0 ? Math.round((r.paid / r.sales) * 100) : 0;
                    const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr
                        key={r.month}
                        style={{
                          borderBottom: idx < salesData.length - 1
                            ? '1px solid #f9fafb' : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: '#f0f2ff', color: '#050a30',
                            borderRadius: 6, padding: '2px 10px',
                            fontWeight: 700, fontSize: 12,
                          }}>
                            {r.month}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', fontWeight: 600, color: '#050a30', whiteSpace: 'nowrap' }}>
                          {fmt(r.sales)}
                        </td>
                        <td style={{ padding: '13px 16px', fontWeight: 600, color: '#16a34a', whiteSpace: 'nowrap' }}>
                          {fmt(r.paid)}
                        </td>
                        <td style={{ padding: '13px 16px', fontWeight: 500, color: '#ef4444', whiteSpace: 'nowrap' }}>
                          {fmt(r.due)}
                        </td>
                        <td style={{ padding: '13px 16px', minWidth: 160 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              flex: 1, height: 6, background: '#f3f4f6',
                              borderRadius: 99, overflow: 'hidden', maxWidth: 120,
                            }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: barColor, borderRadius: 99,
                                transition: 'width 0.6s ease',
                              }} />
                            </div>
                            <span style={{
                              fontSize: 12, fontWeight: 600,
                              color: barColor, minWidth: 36, textAlign: 'right',
                            }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}

/* ─── Shared empty state ──────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 200, gap: 8,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: '#f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <DollarSign size={18} color="#d1d5db" />
      </div>
      <p style={{ fontSize: 13, color: '#9ca3af' }}>No data available</p>
    </div>
  );
}