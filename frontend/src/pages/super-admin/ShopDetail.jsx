import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Phone, Mail, MapPin,
  User, Calendar, CreditCard, ToggleLeft, ToggleRight,
  Plus, CheckCircle, AlertCircle, Clock, Users,
  RefreshCw, Link2, Copy,
} from 'lucide-react';
import { shopAPI, authAPI } from '../../services/api';
import { fmtDate } from '../../utils/helper';
import Badge   from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal   from '../../components/ui/Modal';

export default function ShopDetail() {
  const { id } = useParams();

  const [shop,    setShop]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('subscriptions'); // subscriptions | users

  // Renew modal
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ plan: 'monthly', endDate: '', amount: '' });
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError,  setRenewError]  = useState('');

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [copied,     setCopied]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await shopAPI.getById(id);
      setShop(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <Spinner center size="lg" />;
  if (!shop) return (
    <div className="text-center py-20 text-gray-400">
      <Building2 size={40} className="mx-auto mb-3 opacity-30" />
      <p>Shop not found</p>
      <Link to="/shops" className="btn-primary inline-flex mt-4"><ArrowLeft size={15} />Back</Link>
    </div>
  );

  const now         = new Date();
  const activeSub   = shop.subscriptions?.find(s => s.isActive);
  const isExpired   = !activeSub || new Date(activeSub.endDate) < now;
  const daysLeft    = activeSub
    ? Math.ceil((new Date(activeSub.endDate) - now) / (1000 * 60 * 60 * 24))
    : null;

  // ── Toggle ────────────────────────────────
  const handleToggle = async () => {
    if (!window.confirm(`${shop.isActive ? 'Deactivate' : 'Activate'} "${shop.name}"?`)) return;
    try {
      await shopAPI.toggle(shop.id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  // ── Renew ─────────────────────────────────
  const handleRenew = async (e) => {
    e.preventDefault();
    setRenewError('');
    if (!renewForm.endDate) return setRenewError('End date required');
    try {
      setRenewSaving(true);
      await shopAPI.renew(shop.id, renewForm);
      setRenewOpen(false);
      load();
    } catch (err) {
      setRenewError(err.response?.data?.message || 'Renewal failed');
    } finally { setRenewSaving(false); }
  };

  // ── Invite ────────────────────────────────
  const handleInvite = async () => {
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

  const TABS = [
    { key: 'subscriptions', label: 'Subscriptions', count: shop.subscriptions?.length || 0 },
    { key: 'users',         label: 'Users',          count: shop.users?.length || 0         },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ── Back ── */}
      <Link to="/shops" className="btn-secondary inline-flex">
        <ArrowLeft size={15} /> Back to Shops
      </Link>

      {/* ── Shop Profile Card ── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 bg-[#050a30] rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {shop.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#050a30]">{shop.name}</h2>
              <Badge
                status={shop.isActive ? 'active' : 'expired'}
                label={shop.isActive ? 'Active' : 'Inactive'}
              />
              {activeSub && !isExpired && daysLeft <= 7 && (
                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                  ⚠ {daysLeft}d left
                </span>
              )}
              {isExpired && activeSub && (
                <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                  Subscription Expired
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <User size={13} className="text-gray-400" />{shop.ownerName}
              </span>
              {shop.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={13} className="text-gray-400" />{shop.phone}
                </span>
              )}
              {shop.email && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail size={13} className="text-gray-400" />{shop.email}
                </span>
              )}
              {(shop.address || shop.city) && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={13} className="text-gray-400" />
                  {[shop.address, shop.city, shop.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>

            {shop.gstin && (
              <p className="text-xs text-gray-400 font-mono mt-1.5">GSTIN: {shop.gstin}</p>
            )}
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Clock size={11} /> Created {fmtDate(shop.createdAt)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => { setRenewOpen(true); setRenewError(''); setRenewForm({ plan: 'monthly', endDate: '', amount: '' }); }}
              className="btn-primary text-xs px-3 py-2"
            >
              <RefreshCw size={13} /> Renew
            </button>
            <button onClick={handleInvite} className="btn-secondary text-xs px-3 py-2">
              <Link2 size={13} /> Invite Admin
            </button>
            <button
              onClick={handleToggle}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                shop.isActive
                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              }`}
            >
              {shop.isActive
                ? <><ToggleRight size={14} /> Deactivate</>
                : <><ToggleLeft  size={14} /> Activate</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Plan',
            val:   activeSub ? activeSub.plan.charAt(0).toUpperCase() + activeSub.plan.slice(1) : 'None',
            icon:  CreditCard,
            color: 'text-[#050a30]',
            bg:    'bg-blue-50',
          },
          {
            label: 'Subscription Till',
            val:   activeSub ? fmtDate(activeSub.endDate) : '—',
            icon:  Calendar,
            color: isExpired ? 'text-red-500' : 'text-green-600',
            bg:    isExpired ? 'bg-red-50'    : 'bg-green-50',
          },
          {
            label: 'Total Users',
            val:   shop.users?.length || 0,
            icon:  Users,
            color: 'text-[#050a30]',
            bg:    'bg-blue-50',
          },
          {
            label: 'Subscriptions',
            val:   shop.subscriptions?.length || 0,
            icon:  RefreshCw,
            color: 'text-yellow-600',
            bg:    'bg-yellow-50',
          },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <div className={`p-1.5 rounded-lg ${bg}`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className={`text-lg font-bold ${color}`}>{val}</p>
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

        {/* ── SUBSCRIPTIONS TAB ── */}
        {tab === 'subscriptions' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Plan', 'Start Date', 'End Date', 'Amount', 'Status'].map(h => (
                    <th key={h} className="table-th whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!shop.subscriptions?.length ? (
                  <tr>
                    <td colSpan={5} className="text-center py-14 text-sm text-gray-400">
                      <CreditCard size={28} className="mx-auto mb-2 opacity-30" />
                      No subscriptions found
                    </td>
                  </tr>
                ) : [...shop.subscriptions]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map(sub => {
                      const expired = new Date(sub.endDate) < now;
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                          <td className="table-td">
                            <span className="capitalize font-medium text-[#050a30]">{sub.plan}</span>
                          </td>
                          <td className="table-td text-xs whitespace-nowrap">{fmtDate(sub.startDate)}</td>
                          <td className={`table-td text-xs whitespace-nowrap font-medium ${expired ? 'text-red-500' : 'text-green-600'}`}>
                            {fmtDate(sub.endDate)}
                          </td>
                          <td className="table-td font-medium text-[#050a30]">
                            {sub.amount ? `₹${Number(sub.amount).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="table-td">
                            {sub.isActive && !expired ? (
                              <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-medium">Active</span>
                            ) : expired ? (
                              <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-medium">Expired</span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Joined'].map(h => (
                    <th key={h} className="table-th whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!shop.users?.length ? (
                  <tr>
                    <td colSpan={4} className="text-center py-14 text-sm text-gray-400">
                      <Users size={28} className="mx-auto mb-2 opacity-30" />
                      No users found
                    </td>
                  </tr>
                ) : shop.users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#050a30]/8 rounded-full flex items-center justify-center text-[#050a30] font-semibold text-xs flex-shrink-0">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#050a30] text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-500 text-sm">{user.email}</td>
                    <td className="table-td">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        user.role === 'shop_admin'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-400 whitespace-nowrap">{fmtDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── RENEW MODAL ── */}
      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew Subscription" size="sm">
        <form onSubmit={handleRenew} className="space-y-4">
          {renewError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle size={15} /> {renewError}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-medium text-[#050a30]">{shop.name}</p>
            {activeSub && (
              <p className="text-gray-500 mt-0.5 text-xs">
                Current plan: <span className="capitalize font-medium">{activeSub.plan}</span>
                {' · '}{isExpired ? <span className="text-red-500">Expired</span> : <span className="text-green-600">{daysLeft}d remaining</span>}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Plan</label>
            <select
              className="input-field"
              value={renewForm.plan}
              onChange={e => setRenewForm(p => ({ ...p, plan: e.target.value }))}
            >
              <option value="trial">Trial (Free)</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date *</label>
            <input
              className="input-field"
              type="date"
              value={renewForm.endDate}
              onChange={e => setRenewForm(p => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹)</label>
            <input
              className="input-field"
              type="number"
              placeholder="999"
              value={renewForm.amount}
              onChange={e => setRenewForm(p => ({ ...p, amount: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setRenewOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={renewSaving} className="btn-primary flex-1 justify-center">
              {renewSaving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                : <><RefreshCw size={14} />Renew</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── INVITE MODAL ── */}
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
                  className={`btn-secondary px-3 flex-shrink-0 ${copied ? 'bg-green-50 text-green-600 border-green-200' : ''}`}
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
              ⚠️ Share via <strong>WhatsApp / Email</strong>. Expires after one use.
            </div>
            <button onClick={() => setInviteOpen(false)} className="btn-primary w-full justify-center">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}