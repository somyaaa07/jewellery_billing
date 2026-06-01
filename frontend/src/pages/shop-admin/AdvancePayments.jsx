import { useState, useEffect } from 'react';
import {
  Search, Plus, TrendingUp, Wallet,
  RefreshCw, Eye, AlertCircle, CheckCircle, User,
} from 'lucide-react';
import { advanceAPI, customerAPI } from '../../services/api';
import { fmtINR, fmtDate } from '../../utils/helper';
import Modal   from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

// Status badge
const AdvanceBadge = ({ status }) => {
  const map = {
    active:             'bg-green-50 text-green-700 border border-green-200',
    fully_used:         'bg-gray-100 text-gray-600 border border-gray-200',
    refunded:           'bg-blue-50 text-blue-600 border border-blue-200',
    partially_refunded: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  };
  const labels = {
    active:             'Active',
    fully_used:         'Fully Used',
    refunded:           'Refunded',
    partially_refunded: 'Partial Refund',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
};

export default function AdvancePayments() {
  const [advances,     setAdvances]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination,   setPagination]   = useState({ total: 0, page: 1 });

  // Customer balance map: { customerId: { totalBalance, totalReceived } }
  const [customerBalances, setCustomerBalances] = useState({});

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [refundItem, setRefundItem] = useState(null);

  // Customer summary modal
  const [custSummaryItem, setCustSummaryItem] = useState(null);

  // Create form
  const [customers,  setCustomers]  = useState([]);
  const [createForm, setCreateForm] = useState({
    customerId:'', amount:'', paymentMethod:'cash',
    transactionReference:'', notes:'',
    paymentDate: new Date().toISOString().split('T')[0],
  });
  const [creating,  setCreating]  = useState(false);
  const [createErr, setCreateErr] = useState('');

  // Refund form
  const [refundForm, setRefundForm] = useState({ refundAmount:'', notes:'' });
  const [refunding,  setRefunding]  = useState(false);
  const [refundErr,  setRefundErr]  = useState('');

  // ── Load advances ──────────────────────────────
  const load = (page = 1) => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search)               params.search = search;
    if (statusFilter !== 'all') params.status = statusFilter;

    advanceAPI.getAll(params)
      .then(r => {
        const data = r.data.data || [];
        setAdvances(data);
        setPagination(r.data.pagination || {});

        // Fetch per-customer balance for unique customers on this page
        const uniqueCustomerIds = [...new Set(data.map(a => a.customerId))];
        fetchCustomerBalances(uniqueCustomerIds);
      })
      .finally(() => setLoading(false));
  };

  // ── Fetch balances for all unique customers ────
  const fetchCustomerBalances = async (customerIds) => {
    const results = await Promise.allSettled(
      customerIds.map(id =>
        advanceAPI.getByCustomer(id).then(r => ({
          customerId: id,
          summary: r.data.data?.summary || {},
        }))
      )
    );

    const map = {};
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        map[r.value.customerId] = r.value.summary;
      }
    });
    setCustomerBalances(prev => ({ ...prev, ...map }));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  useEffect(() => {
    customerAPI.getAll({ limit: 200 })
      .then(r => setCustomers(r.data.data || []));
  }, []);

  // ── Create advance ─────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateErr('');
    if (!createForm.customerId) return setCreateErr('Customer select karo');
    if (!createForm.amount || parseFloat(createForm.amount) <= 0)
      return setCreateErr('Valid amount enter karo');
    try {
      setCreating(true);
      await advanceAPI.create(createForm);
      setCreateOpen(false);
      setCreateForm({
        customerId:'', amount:'', paymentMethod:'cash',
        transactionReference:'', notes:'',
        paymentDate: new Date().toISOString().split('T')[0],
      });
      load();
    } catch (err) {
      setCreateErr(err.response?.data?.message || 'Create failed');
    } finally { setCreating(false); }
  };

  // ── Refund ─────────────────────────────────────
  const handleRefund = async (e) => {
    e.preventDefault();
    setRefundErr('');
    if (!refundForm.refundAmount || parseFloat(refundForm.refundAmount) <= 0)
      return setRefundErr('Valid refund amount enter karo');
    try {
      setRefunding(true);
      await advanceAPI.refund(refundItem.id, refundForm);
      setRefundItem(null);
      setRefundForm({ refundAmount:'', notes:'' });
      load();
    } catch (err) {
      setRefundErr(err.response?.data?.message || 'Refund failed');
    } finally { setRefunding(false); }
  };

  // Summary totals
  const totalBalance  = advances.reduce((s, a) => s + parseFloat(a.remainingBalance || 0), 0);
  const totalReceived = advances.reduce((s, a) => s + parseFloat(a.amount || 0), 0);

  return (
    <div className="space-y-5">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Advances',        val: fmtINR(totalReceived), icon: TrendingUp,  color:'text-[#050a30]', bg:'bg-blue-50'  },
          { label:'Available Balance',     val: fmtINR(totalBalance),  icon: Wallet,      color:'text-green-600', bg:'bg-green-50' },
          { label:'Active',                val: advances.filter(a => a.status === 'active').length, icon: CheckCircle, color:'text-green-600', bg:'bg-green-50' },
          { label:'Fully Used / Refunded', val: advances.filter(a => ['fully_used','refunded'].includes(a.status)).length, icon: AlertCircle, color:'text-gray-500', bg:'bg-gray-50' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <div className={`p-1.5 rounded-lg ${bg}`}><Icon size={14} className={color} /></div>
            </div>
            <p className={`text-xl font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all','active','fully_used','refunded','partially_refunded'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-[#050a30] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> New Advance
        </button>
      </div>

      {/* ── Table ── */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Customer','Total Balance','Date','Amount','Balance Used','Remaining','Method','Status','Actions'].map(h => (
                  <th key={h} className="table-th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><Spinner center /></td></tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-sm text-gray-400">
                    <Wallet size={30} className="mx-auto mb-2 opacity-30" />
                    Did'nt find any payment
                  </td>
                </tr>
              ) : advances.map(adv => {
                const used    = parseFloat(adv.amount) - parseFloat(adv.remainingBalance);
                const custBal = customerBalances[adv.customerId];

                return (
                  <tr key={adv.id} className="hover:bg-gray-50 transition-colors">

                    {/* Customer */}
                    <td className="table-td">
                      <div>
                        <p className="font-medium text-[#050a30]">{adv.customer?.name}</p>
                        <p className="text-xs text-gray-400">{adv.customer?.phone}</p>
                      </div>
                    </td>

                    {/* ── Total Customer Balance (NEW) ── */}
                    <td className="table-td">
                      {custBal ? (
                        <button
                          onClick={() => setCustSummaryItem({ ...adv, summary: custBal })}
                          className="text-left group"
                          title="Click to see customer summary"
                        >
                          <p className={`font-bold text-sm ${custBal.totalBalance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {fmtINR(custBal.totalBalance)}
                          </p>
                          <p className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                            {custBal.activeAdvances} active
                          </p>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    <td className="table-td text-xs whitespace-nowrap">{fmtDate(adv.paymentDate)}</td>
                    <td className="table-td font-medium">{fmtINR(adv.amount)}</td>
                    <td className="table-td text-orange-600">{fmtINR(used)}</td>
                    <td className="table-td font-semibold text-green-600">{fmtINR(adv.remainingBalance)}</td>
                    <td className="table-td text-xs capitalize">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                        {adv.paymentMethod?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-td"><AdvanceBadge status={adv.status} /></td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailItem(adv)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="View transactions"
                        >
                          <Eye size={15} />
                        </button>
                        {parseFloat(adv.remainingBalance) > 0 && adv.status !== 'refunded' && (
                          <button
                            onClick={() => {
                              setRefundItem(adv);
                              setRefundForm({ refundAmount: adv.remainingBalance, notes: '' });
                              setRefundErr('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
                            title="Refund"
                          >
                            <RefreshCw size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">Total: {pagination.total} advances</p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => load(pagination.page - 1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >Previous</button>
              <button
                disabled={pagination.page * 20 >= pagination.total}
                onClick={() => load(pagination.page + 1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── CUSTOMER SUMMARY MODAL (NEW) ── */}
      <Modal
        open={!!custSummaryItem}
        onClose={() => setCustSummaryItem(null)}
        title="Customer Advance Summary"
        size="sm"
      >
        {custSummaryItem && (
          <div className="space-y-4">
            {/* Customer info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-9 h-9 rounded-full bg-[#050a30] flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-[#050a30]">{custSummaryItem.customer?.name}</p>
                <p className="text-xs text-gray-400">{custSummaryItem.customer?.phone}</p>
              </div>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { l:'Total Received',  v: fmtINR(custSummaryItem.summary.totalReceived),  c:'text-[#050a30]' },
                { l:'Total Used',      v: fmtINR(custSummaryItem.summary.totalUtilized),  c:'text-orange-600' },
                { l:'Available Balance', v: fmtINR(custSummaryItem.summary.totalBalance), c:'text-green-600' },
                { l:'Active Advances', v: custSummaryItem.summary.activeAdvances,          c:'text-blue-600' },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{l}</p>
                  <p className={`font-bold ${c}`}>{v}</p>
                </div>
              ))}
            </div>

            {/* Balance bar */}
            {custSummaryItem.summary.totalReceived > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Balance used</span>
                  <span>
                    {Math.round((custSummaryItem.summary.totalUtilized / custSummaryItem.summary.totalReceived) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#050a30] rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (custSummaryItem.summary.totalUtilized / custSummaryItem.summary.totalReceived) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setCustSummaryItem(null);
                // Open detail of this advance
                setDetailItem(custSummaryItem);
              }}
              className="btn-secondary w-full justify-center text-sm"
            >
              <Eye size={14} /> View Transactions
            </button>
          </div>
        )}
      </Modal>

      {/* ── CREATE ADVANCE MODAL ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Record Advance Payment" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          {createErr && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {createErr}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer *</label>
            <select
              className="input-field"
              value={createForm.customerId}
              onChange={e => setCreateForm(p => ({ ...p, customerId: e.target.value }))}
            >
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹) *</label>
              <input
                className="input-field" type="number" placeholder="10000"
                value={createForm.amount}
                onChange={e => setCreateForm(p => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input
                className="input-field" type="date"
                value={createForm.paymentDate}
                onChange={e => setCreateForm(p => ({ ...p, paymentDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
              <select
                className="input-field"
                value={createForm.paymentMethod}
                onChange={e => setCreateForm(p => ({ ...p, paymentMethod: e.target.value }))}
              >
                {['cash','upi','card','bank_transfer','cheque'].map(m => (
                  <option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Transaction Ref.</label>
              <input
                className="input-field" placeholder="UPI ID / Cheque no."
                value={createForm.transactionReference}
                onChange={e => setCreateForm(p => ({ ...p, transactionReference: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <textarea
              className="input-field resize-none" rows={2} placeholder="Optional..."
              value={createForm.notes}
              onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary flex-1 justify-center">
              {creating
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                : <><Plus size={15} />Record Advance</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── REFUND MODAL ── */}
      <Modal open={!!refundItem} onClose={() => setRefundItem(null)} title="Refund Advance" size="sm">
        {refundItem && (
          <form onSubmit={handleRefund} className="space-y-4">
            {refundErr && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{refundErr}</div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
              <p className="font-semibold text-[#050a30]">{refundItem.customer?.name}</p>
              <p className="text-gray-500">Original: <span className="font-medium">{fmtINR(refundItem.amount)}</span></p>
              <p className="text-gray-500">
                Available to refund:
                <span className="font-semibold text-green-600 ml-1">{fmtINR(refundItem.remainingBalance)}</span>
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Refund Amount (₹) *</label>
              <input
                className="input-field" type="number" max={refundItem.remainingBalance}
                value={refundForm.refundAmount}
                onChange={e => setRefundForm(p => ({ ...p, refundAmount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <input
                className="input-field" placeholder="Reason for refund..."
                value={refundForm.notes}
                onChange={e => setRefundForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRefundItem(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={refunding} className="btn-primary flex-1 justify-center">
                {refunding
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                  : <><RefreshCw size={14} />Process Refund</>}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── DETAIL / TRANSACTIONS MODAL ── */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Advance Transaction History" size="lg">
        {detailItem && <AdvanceDetailView advanceId={detailItem.id} />}
      </Modal>
    </div>
  );
}

// ── Detail view ────────────────────────────────
function AdvanceDetailView({ advanceId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    advanceAPI.getTransactions(advanceId)
      .then(r => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [advanceId]);

  if (loading) return <Spinner center />;
  if (!data)   return <p className="text-sm text-gray-400">Data not found</p>;

  const typeColor = {
    received: 'text-green-600 bg-green-50',
    utilized: 'text-orange-600 bg-orange-50',
    refunded: 'text-blue-600 bg-blue-50',
    adjusted: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { l:'Total Amount', v: fmtINR(data.amount), c:'text-[#050a30]' },
          { l:'Balance Used', v: fmtINR(parseFloat(data.amount) - parseFloat(data.remainingBalance)), c:'text-orange-600' },
          { l:'Remaining',    v: fmtINR(data.remainingBalance), c:'text-green-600' },
        ].map(({ l, v, c }) => (
          <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{l}</p>
            <p className={`font-bold ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
        {[
          { l:'Customer',    v: data.customer?.name },
          { l:'Method',      v: data.paymentMethod?.replace('_', ' ') },
          { l:'Date',        v: fmtDate(data.paymentDate) },
          { l:'Recorded by', v: data.recordedBy?.name },
        ].map(({ l, v }) => (
          <div key={l} className="flex justify-between">
            <span className="text-gray-500">{l}</span>
            <span className="font-medium capitalize">{v}</span>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Transaction History</p>
        <div className="space-y-2">
          {(data.transactions || []).map(tx => (
            <div key={tx.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <span className={`text-xs font-medium px-2 py-1 rounded-lg capitalize flex-shrink-0 ${typeColor[tx.type]}`}>
                {tx.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{tx.notes}</p>
                <p className="text-xs text-gray-400">{fmtDate(tx.transactionDate)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${tx.amount < 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {tx.amount < 0 ? '-' : '+'}{fmtINR(Math.abs(tx.amount))}
                </p>
                <p className="text-xs text-gray-400">Bal: {fmtINR(tx.balanceAfter)}</p>
              </div>
            </div>
          ))}
          {(data.transactions || []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Koi transaction nahi</p>
          )}
        </div>
      </div>
    </div>
  );
}