import { useState, useEffect } from 'react';
import {
  Search, Plus, Building2, ToggleLeft,
  ToggleRight, Link2, Copy, CheckCircle, AlertCircle,
} from 'lucide-react';
import { shopAPI, authAPI } from '../../services/api';
import { fmtDate }          from '../../utils/helper';
import Modal   from '../../components/ui/Modal';
import Badge   from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { Link } from 'react-router-dom';
//  Empty form state 
const EMPTY_FORM = {
  shopName:'', ownerName:'', phone:'', email:'',
  address:'', city:'', state:'', gstin:'',
  adminName:'', adminEmail:'', adminPassword:'',
  plan:'monthly', startDate: new Date().toISOString().split('T')[0],
  endDate:'', amount:'',
};

export default function Shops() {
  const [shops,   setShops]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState(null);  // { inviteToken, registrationLink, shopName }
  const [copied,     setCopied]     = useState(false);

  // Form
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Load shops
  const load = () => {
    setLoading(true);
    shopAPI.getAll()
      .then(r => setShops(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const now      = new Date();
  const filtered = shops.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Create shop ────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.shopName || !form.ownerName || !form.phone ||
        !form.adminEmail || !form.adminPassword || !form.endDate) {
      return setError('Please fill all required fields (*)');
    }
    try {
      setSaving(true);
      await shopAPI.create(form);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create shop');
    } finally { setSaving(false); }
  };

  // ── Toggle shop active/inactive ───────────
  const handleToggle = async (shop) => {
    if (!window.confirm(`Are you sure you want to ${shop.isActive ? 'deactivate' : 'activate'} "${shop.name}"?`)) return;
    try {
      await shopAPI.toggle(shop.id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  // ── Generate invite link ──────────────────
  const handleInvite = async (shop) => {
    try {
      const res = await authAPI.generateInviteToken(shop.id);
      setInviteData(res.data.data);
      setInviteOpen(true);
      setCopied(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate invite');
    }
  };

  const copyLink = () => {
    if (!inviteData?.registrationLink) return;
    navigator.clipboard.writeText(inviteData.registrationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const onFormChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search shops..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => { setCreateOpen(true); setError(''); setForm(EMPTY_FORM); }} className="btn-primary">
          <Plus size={16} /> Create New Shop
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Shops',  val: shops.length,                                                color: 'text-[#050a30]' },
          { label: 'Active',       val: shops.filter(s => s.isActive).length,                        color: 'text-green-600' },
          { label: 'Inactive',     val: shops.filter(s => !s.isActive).length,                       color: 'text-red-500'   },
        ].map(({ label, val, color }) => (
          <div key={label} className="card text-center py-4">
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Shops table ── */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Shop','Owner','Contact','City','Subscription','Status','Actions'].map(h => (
                  <th key={h} className="table-th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><Spinner center /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-sm text-gray-400">
                    <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                    No shops found
                  </td>
                </tr>
              ) : filtered.map(shop => {
                const sub      = shop.subscriptions?.[0];
                const isExpired = !sub || new Date(sub.endDate) < now;
                const daysLeft  = sub
                  ? Math.ceil((new Date(sub.endDate) - now) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                    {/* Shop name */}
                    <td className="table-td">
                      <Link to ={`/shops/${shop.id}`}  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#050a30] rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {shop.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#050a30] text-sm">{shop.name}</p>
                          {shop.gstin && <p className="text-xs text-gray-400 font-mono">{shop.gstin}</p>}
                        </div>
                      </div>
                      </Link>
                    </td>

                    {/* Owner */}
                    <td className="table-td text-gray-700">{shop.ownerName}</td>

                    {/* Contact */}
                    <td className="table-td text-gray-600 text-xs">
                      <p>{shop.phone}</p>
                      {shop.email && <p className="text-gray-400">{shop.email}</p>}
                    </td>

                    {/* City */}
                    <td className="table-td text-gray-600">{shop.city || '—'}</td>

                    {/* Subscription */}
                    <td className="table-td">
                      {sub ? (
                        <div>
                          <p className="text-xs font-medium capitalize text-[#050a30]">{sub.plan}</p>
                          <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-500' : daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {isExpired
                              ? `Expired ${fmtDate(sub.endDate)}`
                              : daysLeft <= 7
                                ? `⚠ ${daysLeft}d left`
                                : `Till ${fmtDate(sub.endDate)}`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No subscription</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="table-td">
                      <Badge
                        status={shop.isActive ? 'active' : 'expired'}
                        label={shop.isActive ? 'Active' : 'Inactive'}
                      />
                    </td>

                    {/* Actions */}
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {/* Invite link */}
                        <button
                          onClick={() => handleInvite(shop)}
                          title="Generate invite link for shop admin"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <Link2 size={15} />
                        </button>
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(shop)}
                          title={shop.isActive ? 'Deactivate shop' : 'Activate shop'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            shop.isActive
                              ? 'hover:bg-red-50 text-green-500 hover:text-red-500'
                              : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                          }`}
                        >
                          {shop.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE SHOP MODAL ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Shop" size="xl">
        <form onSubmit={handleCreate} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Shop details */}
          <div>
            <h4 className="font-slab text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Shop Information
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { l:'Shop Name *',   n:'shopName',  t:'text',  p:'Suresh Jewellers' },
                { l:'Owner Name *',  n:'ownerName', t:'text',  p:'Suresh Kumar'     },
                { l:'Phone *',       n:'phone',     t:'tel',   p:'9876543210'       },
                { l:'Email',         n:'email',     t:'email', p:'info@sureshj.com' },
                { l:'Address',       n:'address',   t:'text',  p:'123 Gold Market'  },
                { l:'City',          n:'city',      t:'text',  p:'Mumbai'           },
                { l:'State',         n:'state',     t:'text',  p:'Maharashtra'      },
                { l:'GSTIN',         n:'gstin',     t:'text',  p:'27AAPFU0939F1ZV'  },
              ].map(f => (
                <div key={f.n}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.l}</label>
                  <input
                    className="input-field"
                    type={f.t}
                    name={f.n}
                    placeholder={f.p}
                    value={form[f.n]}
                    onChange={onFormChange}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Admin account */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Shop Admin Account
            </h4>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { l:'Admin Name',     n:'adminName',     t:'text',     p:'Ramesh Shah'      },
                { l:'Admin Email *',  n:'adminEmail',    t:'email',    p:'ramesh@sureshj.com'},
                { l:'Password *',     n:'adminPassword', t:'password', p:'Min 6 characters' },
              ].map(f => (
                <div key={f.n}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.l}</label>
                  <input
                    className="input-field"
                    type={f.t}
                    name={f.n}
                    placeholder={f.p}
                    value={form[f.n]}
                    onChange={onFormChange}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Subscription
            </h4>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Plan</label>
                <select className="input-field" name="plan" value={form.plan} onChange={onFormChange}>
                  <option value="trial">Trial (Free)</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                <input className="input-field" type="date" name="startDate" value={form.startDate} onChange={onFormChange} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date *</label>
                <input className="input-field" type="date" name="endDate" value={form.endDate} onChange={onFormChange} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹)</label>
                <input className="input-field" type="number" name="amount" placeholder="999" value={form.amount} onChange={onFormChange} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
                : <><Plus size={15} />Create Shop</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── INVITE LINK MODAL ── */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Shop Admin Invite Link" size="sm">
        {inviteData && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Invite token generated!</p>
                <p className="text-xs text-green-600 mt-1">
                  Shop: <strong>{inviteData.shopName}</strong> — expires in 48 hours
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Registration Link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  className="input-field text-xs font-mono bg-gray-50"
                  value={inviteData.registrationLink}
                />
                <button
                  onClick={copyLink}
                  className={`btn-secondary px-3 flex-shrink-0 transition-colors ${copied ? 'bg-green-50 text-green-600 border-green-200' : ''}`}
                >
                  {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
                </button>
              </div>
              {copied && <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1"><CheckCircle size={11} />Link copied!</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Token</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-600 break-all">
                {inviteData.inviteToken}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
              ⚠️ Share this link with the shop admin via <strong>WhatsApp / Email</strong>. It will expire after one use.
            </div>

            <button onClick={() => setInviteOpen(false)} className="btn-primary w-full justify-center">
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}