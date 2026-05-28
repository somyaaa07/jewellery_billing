import { useState, useEffect } from 'react';
import { Link, useNavigate }   from 'react-router-dom';
import { useAuth }             from '../../context/AuthContext';
import { Eye, EyeOff, Gem , Clock3,Lock}    from 'lucide-react';

export default function Login() {
  const navigate        = useNavigate();
  const { login, user } = useAuth();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [shopInactive, setShopInactive] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'super_admin' ? '/super-admin' : '/dashboard');
  }, [user, navigate]);

const onChange = (e) => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); setShopInactive(false);setSubscriptionExpired(false); };
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Email aur password required hain');
    try {
      setLoading(true);
      const u = await login(form.email, form.password);
      navigate(u.role === 'super_admin' ? '/super-admin' : '/dashboard');
    } catch (err) {
const data = err.response?.data;
if (data?.code === 'SHOP_INACTIVE') {
  setShopInactive(true);
  setSubscriptionExpired(false);
  setError('');
} else if (data?.code === 'SUBSCRIPTION_EXPIRED') {
  setSubscriptionExpired(true);
  setShopInactive(false);
  setError('');
} else {
  setShopInactive(false);
  setSubscriptionExpired(false);
  setError(data?.message || 'Login failed. Please try again.');
}
} finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex">
       {/* LEFT SECTION */}
      <div className="relative w-full lg:w-1/2 bg-[#050A30] text-white flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-8 lg:py-12">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10">
            <Gem size={28} />
          </div>

          <div>
            <h1 className=" font-slab text-2xl font-semibold tracking-wide">
              Jewellery Billing
            </h1>
            <p className=" font-slab text-sm text-white/70">Jewellery Management Suite</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-xl py-12 lg:py-0">
          <h2 className=" font-slab text-3xl sm:text-4xl font-bold leading-tight">
            Run your jewellery business with the calm of a craftsman.
          </h2>

          <p className=" font-slab mt-6 text-lg text-white/80 leading-relaxed">
            Billing, inventory and oversight — all in one quiet, considered
            workspace.
          </p>

          {/* Features */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className=" font-slab font-semibold text-lg">Smart Billing</h3>
              <p className=" font-slab text-sm text-white/70 mt-2">
                GST billing, invoices & receipts with fast checkout.
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className=" font-slab font-semibold text-lg">Inventory Control</h3>
              <p className=" font-slab text-sm text-white/70 mt-2">
                Gold, silver & diamond stock management in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className=" font-slab text-sm text-white/60 mt-10 lg:mt-0">
          © 2026 Jewellery Billing
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-[#050a30] rounded-lg flex items-center justify-center">
              <Gem size={16} className="text-white" />
            </div>
            <span className=" font-slab font-bold text-[#050a30]">New Fashion Jewellery</span>
          </div>

          <h2 className=" font-slab text-3xl sm:text-3xl font-bold leading-tight">
            Welcome back
          </h2>          
          <p className=" font-slab text-sm text-gray-500 mb-7">Sign in to your account</p>

     {shopInactive && (
  <div className="font-slab bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-5 text-center space-y-1">
    <p className="flex items-center gap-1 text-sm font-semibold text-amber-700 justify-center align-center">
      <Lock className="h-4 w-4"/>Shop Deactivated</p>
    <p className="text-xs text-red-500">Your shop has been deactivated.</p>
    <p className="text-xs text-gray-500">Please contact support to reactivate.</p>
  </div>
)}

{subscriptionExpired && (
  <div className="font-slab bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mb-5 text-center space-y-1">
    <p className="flex items-center gap-1 text-sm font-semibold text-amber-700 justify-center align-center">
        <Clock3 className="h-4 w-4 " /> Subscription Expired</p>
    <p className="text-xs text-amber-600">Your subscription has expired.</p>
    <p className="text-xs text-gray-500">Kindly contact your admin to renew it.</p>
  </div>
)}
{error && (
  <div className="font-slab bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
    {error}
  </div>
)}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className=" font-slab block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
              <input className="input-field" type="email" name="email"
                value={form.email} onChange={onChange}
                placeholder="admin@jewelry.com" disabled={loading} />
            </div>
            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input className="input-field pr-10" type={showPw ? 'text' : 'password'}
                  name="password" value={form.password} onChange={onChange}
                  placeholder="••••••••" disabled={loading} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};