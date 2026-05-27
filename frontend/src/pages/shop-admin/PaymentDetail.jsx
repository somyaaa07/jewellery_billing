import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  ClipboardList,
  WalletCards,
  AlertTriangle,
  ArrowLeft,
  Landmark,
  X,
  Plus,
} from 'lucide-react';
import { saleAPI } from '../../services/api';

/* ─── Tiny helpers ─────────────────────────────────── */
const fmt   = n  => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
// const fmtDt = dt => dt ? new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
// const fmtTm = dt => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '';
const fmtDt = dt =>
  dt
    ? new Date(dt + (dt.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—';

const fmtTm = dt =>
  dt
    ? new Date(dt + (dt.length === 10 ? 'T00:00:00' : '')).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';





/* ─── Static maps ───────────────────────────────────── */
const MODE_META = {
  cash:   { label:'Cash',   Icon: Banknote,      bg:'bg-emerald-50',  text:'text-emerald-700',  dot:'bg-emerald-500'  },
  upi:    { label:'UPI',    Icon: Smartphone,    bg:'bg-blue-50',     text:'text-blue-700',     dot:'bg-blue-500'     },
  card:   { label:'Card',   Icon: CreditCard,    bg:'bg-violet-50',   text:'text-violet-700',   dot:'bg-violet-500'   },
  cheque: { label:'Cheque', Icon: Building2,     bg:'bg-amber-50',    text:'text-amber-700',    dot:'bg-amber-500'    },
  credit: { label:'Credit', Icon: ClipboardList, bg:'bg-rose-50',     text:'text-rose-700',     dot:'bg-rose-500'     },
  bank_transfer: { label:'bank_transfer', Icon: Landmark, bg:'bg-rose-50',     text:'text-rose-700',     dot:'bg-rose-500'     },

};

const STATUS_META = {
  paid:    { label:'Paid',    bg:'bg-emerald-100', text:'text-emerald-800', dot:'bg-emerald-500' },
  partial: { label:'Partial', bg:'bg-amber-100',   text:'text-amber-800',   dot:'bg-amber-500'   },
  due:     { label:'Due',     bg:'bg-rose-100',    text:'text-rose-800',    dot:'bg-rose-500'     },
};

/* ─── Sub-components ────────────────────────────────── */
function ModeBadge({ mode }) {
  const m = MODE_META[mode] || { label: mode, Icon: Banknote, bg:'bg-gray-100', text:'text-gray-700', dot:'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      <m.Icon size={12} />
      {m.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_META[status] || STATUS_META.due;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function StatCard({ label, value, color = 'text-[#050a30]', sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
      <p className="font-slab text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-bold ${color} leading-none`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Add-Payment Modal ─────────────────────────────── */
function AddPaymentModal({ sale, onClose, onSuccess }) {
  const [form,    setForm]    = useState({ amount: '', paymentMode: 'cash', referenceNumber: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    if (parseFloat(form.amount) > parseFloat(sale.dueAmount)) {
      setError(`Amount cannot exceed due: ${fmt(sale.dueAmount)}`);
      return;
    }
    setLoading(true); setError('');
    try {
      await saleAPI.addPayment(sale.id, form);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Payment failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-[fadeIn_.18s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#050a30]">Add Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Due: <span className="font-semibold text-rose-600">{fmt(sale.dueAmount)}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[#050a30] font-semibold focus:outline-none focus:ring-2 focus:ring-[#050a30]/20 text-lg"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Mode</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(MODE_META).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, paymentMode: key }))}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-[8px] font-bold transition-all ${
                    form.paymentMode === key
                      ? 'border-[#050a30] bg-[#050a30] text-white'
                      : 'border-gray-100 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <m.Icon size={16} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          {/* {(form.paymentMode === 'upi' || form.paymentMode === 'card' || form.paymentMode === 'cheque') && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reference / TXN No.</label>
              <input
                value={form.referenceNumber}
                onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                placeholder="e.g. UPI12345678"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#050a30]/20"
              />
            </div>
          )} */}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any remark..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#050a30]/20 resize-none"
            />
          </div>

          {error && <p className="text-rose-600 text-xs font-medium bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#050a30] text-white font-bold py-3 rounded-xl hover:bg-[#0d1550] transition-colors disabled:opacity-60"
          >
            {loading ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Timeline item ─────────────────────────────────── */
function PaymentRow({ payment, index, isLast }) {
  const m = MODE_META[payment.paymentMode] || MODE_META.cash;
  return (
    <div className="flex gap-4">
  

      {/* Card */}
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-[#050a30]">{fmt(payment.amount)}</span>
              <ModeBadge mode={payment.paymentMode} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {fmtDt(payment.paymentDate)}
              {fmtTm(payment.paymentDate) && <span className="ml-2 text-gray-300">·</span>}
              <span className="ml-2">{fmtTm(payment.paymentDate)}</span>
            </p>
            {payment.referenceNumber && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                TXN: <span className="text-[#050a30] font-semibold">{payment.referenceNumber}</span>
              </p>
            )}
            {payment.notes && (
              <p className="text-xs text-gray-400 italic mt-1">"{payment.notes}"</p>
            )}
          </div>
          <span className="text-[11px] text-gray-300 font-mono">#{String(index + 1).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────── */
export function PaymentDetailPage() {
  const { id }                  = useParams();
  const navigate                = useNavigate();
  const [sale,    setSale]      = useState(null);
  const [loading, setLoading]   = useState(true);
  const [modal,   setModal]     = useState(false);
  const [error,   setError]     = useState('');

  const fetchSale = () => {
    setLoading(true);
    saleAPI.getById(id)
      .then(r => setSale(r.data?.data || r.data))
      .catch(() => setError('Failed to load sale details.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSale(); }, [id]);

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#050a30]/20 border-t-[#050a30] animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading payment history…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error || !sale) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <AlertTriangle size={40} className="text-amber-400" />
      <p className="text-gray-500 text-sm">{error || 'Sale not found.'}</p>
      <button onClick={() => navigate(-1)} className="text-[#050a30] text-sm font-semibold underline underline-offset-2">
        ← Go back
      </button>
    </div>
  );

  const payments     = sale.payments || [];
  const totalPaid    = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const paidPct      = sale.totalAmount > 0 ? Math.min(100, (totalPaid / sale.totalAmount) * 100) : 0;

  return (
    <div className="fade-in max-w-auto mx-auto px-4 py-6">
      {/* ── Back ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#050a30] font-medium mb-5 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Sales
      </button>

      {/* ── Invoice Header ── */}
      <div className="bg-[#050a30] rounded-2xl p-6 text-white mb-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute -right-2 -bottom-10 w-24 h-24 rounded-full bg-white/5" />

        <div className="flex items-start justify-between gap-4 relative">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-slab mb-1">Invoice</p>
            <h1 className="font-bold text-xl font-mono">{sale.invoiceNumber}</h1>
            <p className="text-white/60 text-sm mt-1">{sale.customer?.name || '—'}</p>
            {sale.customer?.phone && (
              <p className="text-white/40 text-xs mt-0.5">{sale.customer.phone}</p>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <StatusBadge status={sale.status} />
            <p className="text-white/50 text-[11px]">{fmtDt(sale.saleDate)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 relative">
          <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
            <span>Paid {fmt(totalPaid)}</span>
            <span>Total {fmt(sale.totalAmount)}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-700"
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-white/30 mt-1">{paidPct.toFixed(0)}% collected</p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Bill"    value={fmt(sale.totalAmount)} />
        <StatCard label="Total Paid"    value={fmt(totalPaid)}  color="text-emerald-600" sub={`${payments.length} payment${payments.length !== 1 ? 's' : ''}`} />
        <StatCard label="Due Amount"    value={fmt(sale.dueAmount)}   color={parseFloat(sale.dueAmount) > 0 ? 'text-rose-600' : 'text-emerald-600'} />
        <StatCard label="Transactions"  value={payments.length} color="text-[#050a30]" sub={payments.length > 0 ? `Last: ${fmtDt(payments[payments.length-1]?.paymentDate)}` : 'None yet'} />
      </div>

      {/* ── Mode breakdown ── */}
      {payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-slab mb-4">By Payment Mode</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(MODE_META).map(([key, m]) => {
              const amt = payments.filter(p => p.paymentMode === key).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
              if (amt === 0) return null;
              return (
                <div key={key} className={`rounded-xl px-4 py-3 ${m.bg}`}>
                  <p className={`text-[10px] uppercase tracking-wide font-semibold ${m.text} mb-1 flex items-center gap-1.5`}>
                    <m.Icon size={12} /> {m.label}
                  </p>
                  <p className={`text-lg font-bold ${m.text}`}>{fmt(amt)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payment Timeline ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#050a30] text-sm uppercase tracking-wide">
            Payment History
            {payments.length > 0 && (
              <span className="ml-2 bg-[#050a30] text-white text-[10px] rounded-full px-2 py-0.5 font-mono">{payments.length}</span>
            )}
          </h2>
          {parseFloat(sale.dueAmount) > 0 && (
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-1.5 bg-[#050a30] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#0d1550] transition-colors"
            >
              <Plus size={14} /> Add Payment
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-12 flex flex-col items-center gap-3">
            <WalletCards size={40} className="text-gray-300" />
            <p className="text-gray-400 text-sm font-medium">No payments recorded yet.</p>
            {parseFloat(sale.dueAmount) > 0 && (
              <button
                onClick={() => setModal(true)}
                className="mt-1 bg-[#050a30] text-white text-xs font-bold px-5 py-2 rounded-xl hover:bg-[#0d1550] transition-colors"
              >
                Record First Payment
              </button>
            )}
          </div>
        ) : (
          <div>
            {[...payments].reverse().map((p, i) => (
              <PaymentRow
                key={p.id || i}
                payment={p}
                index={payments.length - 1 - i}
                isLast={i === payments.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Sale Summary footer ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-slab mb-4">Bill Summary</p>
        <div className="space-y-2 text-sm">
          {[
            ['Subtotal',              fmt(sale.subtotal)],
            sale.isGst && ['CGST (1.5%)',  fmt(sale.cgstAmount)],
            sale.isGst && ['SGST (1.5%)',  fmt(sale.sgstAmount)],
            parseFloat(sale.exchangeValue || 0) > 0 && ['Exchange Deduction', `- ${fmt(sale.exchangeValue)}`],
            parseFloat(sale.discountAmount || 0) > 0 && ['Discount',          `- ${fmt(sale.discountAmount)}`],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} className="flex justify-between text-gray-500">
              <span>{label}</span><span className="font-medium text-gray-700">{val}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-[#050a30]">
            <span>Grand Total</span><span>{fmt(sale.totalAmount)}</span>
          </div>
          {sale.notes && (
            <p className="text-xs text-gray-400 italic pt-1 border-t border-gray-50">"{sale.notes}"</p>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <AddPaymentModal
          sale={sale}
          onClose={() => setModal(false)}
          onSuccess={() => { setModal(false); fetchSale(); }}
        />
      )}
    </div>
  );
}

export default PaymentDetailPage;