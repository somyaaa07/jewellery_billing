import { useState, useEffect } from 'react';
import {
  Search, RefreshCw, AlertCircle,
  CheckCircle, Clock, XCircle, Star,
} from 'lucide-react';
import { shopAPI } from '../../services/api';
import { fmtDate, fmtINR } from '../../utils/helper';
import Modal   from '../../components/ui/Modal';
import Badge   from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

const RENEW_EMPTY = { plan:'monthly', endDate:'', amount:'' };

export default function Subscriptions() {
  const [shops,   setShops]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all'); // all | active | expired | expiring

  // Renew modal
  const [renewShop, setRenewShop] = useState(null);
  const [renewForm, setRenewForm] = useState(RENEW_EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const load = () => {
    setLoading(true);
    shopAPI.getAll()
      .then(r => setShops(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const now = new Date();

  // Enrich each shop with subscription status
  const enriched = shops.map(shop => {
    const sub = shop.subscriptions?.[0];
    if (!sub) return { ...shop, subStatus: 'none', daysLeft: null };
    const daysLeft  = Math.ceil((new Date(sub.endDate) - now) / (1000*60*60*24));
    const subStatus = daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'expiring' : 'active';
    return { ...shop, sub, subStatus, daysLeft };
  });

  // Filter
  const filtered = enriched.filter(s => {
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'      ? true :
      filter === 'active'   ? s.subStatus === 'active'   :
      filter === 'expired'  ? s.subStatus === 'expired' || s.subStatus === 'none' :
      filter === 'expiring' ? s.subStatus === 'expiring' : true;
    return matchSearch && matchFilter;
  });

  // Summary counts
  const counts = {
    all:      enriched.length,
    active:   enriched.filter(s => s.subStatus === 'active').length,
    expiring: enriched.filter(s => s.subStatus === 'expiring').length,
    expired:  enriched.filter(s => s.subStatus === 'expired' || s.subStatus === 'none').length,
  };

  // Renew
  const openRenew = (shop) => {
    setRenewShop(shop);
    const today = new Date();
    const defaultEnd = new Date(today.setFullYear(today.getFullYear() + 1))
      .toISOString().split('T')[0];
    setRenewForm({ plan:'yearly', endDate: defaultEnd, amount:'9999' });
    setError('');
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    if (!renewForm.endDate) return setError('End date is required');
    try {
      setSaving(true);
      await shopAPI.renew(renewShop.id, renewForm);
      setRenewShop(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Renewal failed');
    } finally { setSaving(false); }
  };

  const statusIcon = (s) => ({
    active:   <CheckCircle size={15} className="text-green-500" />,
    expiring: <Clock       size={15} className="text-yellow-500" />,
    expired:  <XCircle     size={15} className="text-red-500"   />,
    none:     <XCircle     size={15} className="text-gray-400"  />,
  }[s] || null);

  return (
    <div className="space-y-5">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key:'all',      label:'Total',           icon: Star,         color:'text-[#050a30]', bg:'bg-blue-50'  },
          { key:'active',   label:'Active',          icon: CheckCircle,  color:'text-green-600', bg:'bg-green-50' },
          { key:'expiring', label:'Expiring (7d)',   icon: Clock,        color:'text-yellow-600',bg:'bg-yellow-50'},
          { key:'expired',  label:'Expired / None',  icon: XCircle,      color:'text-red-500',   bg:'bg-red-50'   },
        ].map(({ key, label, icon: Icon, color, bg }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`card text-left hover:shadow-md transition-all duration-200 border-2 ${
              filter === key ? 'border-[#050a30]' : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <div className={`p-1.5 rounded-lg ${bg}`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search shop or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all','active','expiring','expired'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-[#050a30] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Shop','Owner','Plan','Started','Expires','Days Left','Amount','Status','Action'].map(h => (
                  <th key={h} className="table-th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><Spinner center /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-sm text-gray-400">
                    <Star size={30} className="mx-auto mb-2 opacity-30" />
                    No subscriptions found
                  </td>
                </tr>
              ) : filtered.map(shop => (
                <tr key={shop.id} className={`hover:bg-gray-50 transition-colors ${
                  shop.subStatus === 'expiring' ? 'bg-yellow-50/40' :
                  shop.subStatus === 'expired' || shop.subStatus === 'none' ? 'bg-red-50/30' : ''
                }`}>
                  {/* Shop */}
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#050a30] rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {shop.name.charAt(0)}
                      </div>
                      <span className="font-medium text-[#050a30] text-sm">{shop.name}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-600 text-xs">{shop.ownerName}</td>
                  <td className="table-td capitalize text-xs">{shop.sub?.plan || '—'}</td>
                  <td className="table-td text-xs whitespace-nowrap">{shop.sub ? fmtDate(shop.sub.startDate) : '—'}</td>
                  <td className="table-td text-xs whitespace-nowrap">{shop.sub ? fmtDate(shop.sub.endDate) : '—'}</td>

                  {/* Days left */}
                  <td className="table-td">
                    {shop.daysLeft !== null ? (
                      <span className={`text-xs font-semibold ${
                        shop.daysLeft < 0 ? 'text-red-500' :
                        shop.daysLeft <= 7 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {shop.daysLeft < 0 ? `${Math.abs(shop.daysLeft)}d ago` : `${shop.daysLeft}d`}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>

                  <td className="table-td text-xs">{shop.sub ? fmtINR(shop.sub.amount) : '—'}</td>

                  {/* Status */}
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(shop.subStatus)}
                      <span className={`text-xs font-medium capitalize ${
                        shop.subStatus === 'active'   ? 'text-green-600'  :
                        shop.subStatus === 'expiring' ? 'text-yellow-600' :
                        'text-red-500'
                      }`}>
                        {shop.subStatus === 'none' ? 'No Sub' : shop.subStatus}
                      </span>
                    </div>
                  </td>

                  {/* Renew action */}
                  <td className="table-td">
                    <button
                      onClick={() => openRenew(shop)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#050a30] bg-[#050a30]/6 hover:bg-[#050a30]/12 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <RefreshCw size={12} /> Renew
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RENEW MODAL ── */}
      <Modal
        open={!!renewShop}
        onClose={() => setRenewShop(null)}
        title={`Renew Subscription — ${renewShop?.name}`}
        size="sm"
      >
        <form onSubmit={handleRenew} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Current sub info */}
          {renewShop?.sub && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
              <p><span className="font-medium">Current Plan:</span> {renewShop.sub.plan}</p>
              <p><span className="font-medium">Expires:</span> {fmtDate(renewShop.sub.endDate)}</p>
              <p><span className="font-medium">Days Left:</span>
                <span className={renewShop.daysLeft < 0 ? ' text-red-500' : ' text-green-600'}>
                  {renewShop.daysLeft < 0 ? ` Expired ${Math.abs(renewShop.daysLeft)}d ago` : ` ${renewShop.daysLeft} days`}
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">New Plan</label>
            <select
              className="input-field"
              value={renewForm.plan}
              onChange={e => setRenewForm(p => ({ ...p, plan: e.target.value }))}
            >
              <option value="trial">Trial</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">New End Date *</label>
            <input
              className="input-field"
              type="date"
              value={renewForm.endDate}
              onChange={e => setRenewForm(p => ({ ...p, endDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹)</label>
            <input
              className="input-field"
              type="number"
              placeholder="9999"
              value={renewForm.amount}
              onChange={e => setRenewForm(p => ({ ...p, amount: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setRenewShop(null)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Renewing...</>
                : <><RefreshCw size={14} />Renew Subscription</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}