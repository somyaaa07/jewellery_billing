import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, User,
  FileText, CreditCard, AlertCircle, Eye,
  Download, TrendingUp, IndianRupee, Clock,
} from 'lucide-react';
import { customerAPI, saleAPI, invoiceAPI } from '../../services/api';
import { fmtINR, fmtDate, fmtWt } from '../../utils/helper';
import Badge   from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal   from '../../components/ui/Modal';

export default function CustomerDetail() {
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [sales,    setSales]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('invoices'); // invoices | payments | items
  const [selected, setSelected] = useState(null); // sale for detail modal
  const [payModal, setPayModal] = useState(null); // sale for payment modal
  const [payForm,  setPayForm]  = useState({ amount:'', paymentMode:'cash', referenceNumber:'', notes:'' });
  const [saving,   setSaving]   = useState(false);
  const [payError, setPayError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [custRes, salesRes] = await Promise.all([
        customerAPI.getById(id),
        saleAPI.getAll({ customerId: id, limit: 200 }),
      ]);
      setCustomer(custRes.data.data);
      setSales(salesRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <Spinner center size="lg" />;
  if (!customer) return (
    <div className="text-center py-20 text-gray-400">
      <User size={40} className="mx-auto mb-3 opacity-30" />
      <p>Customer not found</p>
      <Link to="/customers" className="btn-primary inline-flex mt-4"><ArrowLeft size={15}/>Back</Link>
    </div>
  );

  // ── Derived stats ──────────────────────────────────
  const totalBills    = sales.length;
  const totalBilled   = sales.reduce((s, x) => s + parseFloat(x.totalAmount  || 0), 0);
  const totalPaid     = sales.reduce((s, x) => s + parseFloat(x.paidAmount   || 0), 0);
  const totalDue      = sales.reduce((s, x) => s + parseFloat(x.dueAmount    || 0), 0);
  const totalExchange = sales.reduce((s, x) => s + parseFloat(x.exchangeValue|| 0), 0);

  // All payments across all sales
  const allPayments = sales
    .flatMap(s => (s.payments || []).map(p => ({
      ...p,
      invoiceNumber: s.invoiceNumber,
      saleId:        s.id,
    })))
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  // All items across all sales
  const allItems = sales.flatMap(s =>
    (s.items || []).map(it => ({
      ...it,
      invoiceNumber: s.invoiceNumber,
      saleDate:      s.saleDate,
      goldRate:      s.goldRate,
    }))
  );

  // Handle pay
  const openPay = (sale) => {
    setPayModal(sale);
    setPayForm({ amount: parseFloat(sale.dueAmount).toFixed(2), paymentMode:'cash', referenceNumber:'', notes:'' });
    setPayError('');
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return setPayError('Enter Valid Amount');
    if (parseFloat(payForm.amount) > parseFloat(payModal.dueAmount))
      return setPayError(`Max due: ${fmtINR(payModal.dueAmount)}`);
    try {
      setSaving(true);
      await saleAPI.addPayment(payModal.id, payForm);
      setPayModal(null);
      load();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment failed');
    } finally { setSaving(false); }
  };

  const TABS = [
    { key: 'invoices', label: 'Invoices',      count: totalBills      },
    { key: 'payments', label: 'Payments',       count: allPayments.length },
    { key: 'items',    label: 'Items Bought',   count: allItems.length },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ── Back button ── */}
      <Link to="/customers" className="btn-secondary inline-flex">
        <ArrowLeft size={15} /> Back to Customers
      </Link>

      {/* ── Customer Profile Card ── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 bg-[#050a30] rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#050a30]">{customer.name}</h2>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
              {customer.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={13} className="text-gray-400" />{customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail size={13} className="text-gray-400" />{customer.email}
                </span>
              )}
              {(customer.address || customer.city) && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={13} className="text-gray-400" />
                  {[customer.address, customer.city].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Clock size={11} /> Customer since {fmtDate(customer.createdAt)}
            </p>
          </div>

          {/* Due badge */}
          {totalDue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center flex-shrink-0">
              <p className="text-xs text-red-500 font-medium">Outstanding Due</p>
              <p className="text-xl font-bold text-red-600 mt-0.5">{fmtINR(totalDue)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Billed',    val: fmtINR(totalBilled),   icon: IndianRupee, color:'text-[#050a30]', bg:'bg-blue-50'   },
          { label:'Total Paid',      val: fmtINR(totalPaid),     icon: TrendingUp,  color:'text-green-600', bg:'bg-green-50'  },
          { label:'Total Due',       val: fmtINR(totalDue),      icon: AlertCircle, color:'text-red-500',   bg:'bg-red-50'    },
          { label:'Exchange Gold',   val: fmtINR(totalExchange), icon: CreditCard,  color:'text-yellow-600',bg:'bg-yellow-50' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <div className={`p-1.5 rounded-lg ${bg}`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className={`text-xl font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="card p-0 overflow-hidden">
        {/* Tab header */}
        <div className="flex border-b border-gray-100 px-2 pt-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-[#050a30] text-[#050a30] bg-white'
                  : 'border-transparent text-gray-500 hover:text-[#050a30]'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === t.key ? 'bg-[#050a30] text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── INVOICES TAB ── */}
        {tab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Invoice','Date','Type','Total','Paid','Due','Status','Actions'].map(h => (
                    <th key={h} className="table-th whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-sm text-gray-400">
                      <FileText size={28} className="mx-auto mb-2 opacity-30" />
                      Not any invoice
                    </td>
                  </tr>
                ) : sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-xs font-semibold text-[#050a30]">
                      {sale.invoiceNumber}
                    </td>
                    <td className="table-td text-xs whitespace-nowrap">{fmtDate(sale.saleDate)}</td>
                    <td className="table-td">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        sale.isGst ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sale.isGst ? 'GST' : 'Non-GST'}
                      </span>
                    </td>
                    <td className="table-td font-medium">{fmtINR(sale.totalAmount)}</td>
                    <td className="table-td text-green-600">{fmtINR(sale.paidAmount)}</td>
                    <td className={`table-td font-semibold ${parseFloat(sale.dueAmount) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {fmtINR(sale.dueAmount)}
                    </td>
                    <td className="table-td"><Badge status={sale.status} /></td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        {/* View invoice detail */}
                        <button
                          onClick={() => setSelected(sale)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                        {/* Open PDF */}
                        <a
                          href={invoiceAPI.downloadUrl(sale.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
                          title="Download PDF"
                        >
                          <Download size={15} />
                        </a>
                        {/* Pay due */}
                        {/* {parseFloat(sale.dueAmount) > 0 && (
                          <button
                            onClick={() => openPay(sale)}
                            className="flex items-center gap-1 text-xs font-medium text-[#050a30] bg-[#050a30]/6 hover:bg-[#050a30]/12 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <CreditCard size={12} /> Pay
                          </button>
                        )} */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {tab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Date','Invoice','Amount','Mode','Reference','Notes'].map(h => (
                    <th key={h} className="table-th whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-sm text-gray-400">
                      <CreditCard size={28} className="mx-auto mb-2 opacity-30" />
                   No payment recorded
                    </td>
                  </tr>
                ) : allPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-xs whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                    <td className="table-td font-mono text-xs font-medium text-[#050a30]">{p.invoiceNumber}</td>
                    <td className="table-td font-semibold text-green-600">{fmtINR(p.amount)}</td>
                    <td className="table-td">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {p.paymentMode?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-400 font-mono">{p.referenceNumber || '—'}</td>
                    <td className="table-td text-xs text-gray-500">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Payment total */}
            {allPayments.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</span>
                <span className="font-bold text-green-600">{fmtINR(totalPaid)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── ITEMS TAB ── */}
        {tab === 'items' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Item','Purity','Invoice','Date','Gross','Stone','Net','Gold Rate','Making','Total'].map(h => (
                    <th key={h} className="table-th whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-14 text-sm text-gray-400">
                      Not any items
                    </td>
                  </tr>
                ) : allItems.map((it, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-[#050a30]">{it.itemName}</td>
                    <td className="table-td text-xs">{it.purity}</td>
                    <td className="table-td font-mono text-xs text-[#050a30]">{it.invoiceNumber}</td>
                    <td className="table-td text-xs whitespace-nowrap">{fmtDate(it.saleDate)}</td>
                    <td className="table-td text-xs">{fmtWt(it.grossWeight)}</td>
                    <td className="table-td text-xs">{fmtWt(it.stoneWeight)}</td>
                    <td className="table-td text-xs font-medium">{fmtWt(it.netWeight)}</td>
                    <td className="table-td text-xs">₹{it.goldRate}/g</td>
                    <td className="table-td text-xs">{fmtINR(it.makingCharges)}</td>
                    <td className="table-td font-semibold text-[#050a30]">{fmtINR(it.itemTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── INVOICE DETAIL MODAL ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Invoice — ${selected?.invoiceNumber}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { l:'Total',  v: fmtINR(selected.totalAmount), cls:'text-[#050a30]' },
                { l:'Paid',   v: fmtINR(selected.paidAmount),  cls:'text-green-600' },
                { l:'Due',    v: fmtINR(selected.dueAmount),   cls:'text-red-500'   },
              ].map(({ l, v, cls }) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{l}</p>
                  <p className={`font-bold text-base ${cls}`}>{v}</p>
                </div>
              ))}
            </div>

            {/* Items table */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Item','Gross','Stone','Net','Making','Total'].map(h => (
                        <th key={h} className="table-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((it, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{it.itemName} <span className="text-xs text-gray-400">({it.purity})</span></td>
                        <td className="table-td text-xs">{fmtWt(it.grossWeight)}</td>
                        <td className="table-td text-xs">{fmtWt(it.stoneWeight)}</td>
                        <td className="table-td text-xs font-medium">{fmtWt(it.netWeight)}</td>
                        <td className="table-td text-xs">{fmtINR(it.makingCharges)}</td>
                        <td className="table-td font-semibold">{fmtINR(it.itemTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exchange */}
            {selected.exchangeItems?.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-700 mb-2">Exchange Gold</p>
                {selected.exchangeItems.map((ex, i) => (
                  <div key={i} className="flex justify-between text-sm text-green-700">
                    <span>{ex.itemDescription} ({ex.purity}) — {fmtWt(ex.grossWeight)} @ ₹{ex.exchangeRate}/g</span>
                    <span className="font-semibold">−{fmtINR(ex.exchangeValue)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Payment history */}
            {selected.payments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment History</p>
                <div className="space-y-1.5">
                  {selected.payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-500 text-xs">{fmtDate(p.paymentDate)} · {p.paymentMode?.replace('_',' ')}</span>
                      <span className="font-semibold text-green-600">{fmtINR(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                to={`/invoice/${selected.id}`}
                className="btn-secondary flex-1 justify-center"
                onClick={() => setSelected(null)}
              >
                <Eye size={15} /> Full Invoice
              </Link>
              <a
                href={invoiceAPI.downloadUrl(selected.id)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary flex-1 justify-center"
              >
                <Download size={15} /> Download PDF
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* ── PAY MODAL ── */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title="Add Payment"
        size="sm"
      >
        {payModal && (
          <form onSubmit={handlePay} className="space-y-4">
            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {payError}
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="font-medium text-[#050a30]">{payModal.invoiceNumber}</p>
              <p className="text-gray-500 mt-0.5">
                Due: <span className="font-bold text-red-600">{fmtINR(payModal.dueAmount)}</span>
              </p>
            </div>
            {[
              { l:'Amount (₹) *', n:'amount',          t:'number', p:'Enter amount'     },
              { l:'Reference No.',n:'referenceNumber',  t:'text',   p:'UPI / Cheque no.' },
            ].map(f => (
              <div key={f.n}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.l}</label>
                <input
                  className="input-field"
                  type={f.t}
                  placeholder={f.p}
                  value={payForm[f.n]}
                  onChange={e => setPayForm(p => ({ ...p, [f.n]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Mode</label>
              <select
                className="input-field"
                value={payForm.paymentMode}
                onChange={e => setPayForm(p => ({ ...p, paymentMode: e.target.value }))}
              >
                {['cash','upi','card','bank_transfer','cheque'].map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <input
                className="input-field"
                placeholder="Optional..."
                value={payForm.notes}
                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPayModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  : <><CreditCard size={14} />Record Payment</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}