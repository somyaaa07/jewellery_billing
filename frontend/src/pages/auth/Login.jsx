import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../../context/AuthContext';
import { Eye, EyeOff, Gem, Clock3, Lock } from 'lucide-react';

export default function Login() {
  const navigate        = useNavigate();
  const { login, user } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [shopInactive, setShopInactive]               = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'super_admin' ? '/super-admin' : '/dashboard');
  }, [user, navigate]);

  const onChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
    setShopInactive(false);
    setSubscriptionExpired(false);
  };

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
        setShopInactive(true); setSubscriptionExpired(false); setError('');
      } else if (data?.code === 'SUBSCRIPTION_EXPIRED') {
        setSubscriptionExpired(true); setShopInactive(false); setError('');
      } else {
        setShopInactive(false); setSubscriptionExpired(false);
        setError(data?.message || 'Login failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  const Alerts = () => (
    <>
      {shopInactive && (
        <div className="font-slab bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-4 text-center space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700 justify-center">
            <Lock className="h-4 w-4 shrink-0" /> Shop Deactivated
          </p>
          <p className="text-xs text-red-500">Your shop has been deactivated.</p>
          <p className="text-xs text-gray-500">Please contact support to reactivate.</p>
        </div>
      )}
      {subscriptionExpired && (
        <div className="font-slab bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 mb-4 text-center space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 justify-center">
            <Clock3 className="h-4 w-4 shrink-0" /> Subscription Expired
          </p>
          <p className="text-xs text-amber-600">Your subscription has expired.</p>
          <p className="text-xs text-gray-500">Kindly contact your admin to renew it.</p>
        </div>
      )}
      {error && (
        <div className="font-slab bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}
    </>
  );

  const FormFields = () => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">
          Email Address
        </label>
        <input
          className="input-field w-full"
          type="email" name="email"
          value={form.email} onChange={onChange}
          placeholder="admin@jewelry.com" disabled={loading}
        />
      </div>
      <div>
        <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            className="input-field pr-10 w-full"
            type={showPw ? 'text' : 'password'}
            name="password" value={form.password} onChange={onChange}
            placeholder="••••••••" disabled={loading}
          />
          <button
            type="button" onClick={() => setShowPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button
        type="submit" disabled={loading}
        className="btn-primary w-full justify-center py-2.5 mt-2"
      >
        {loading ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />Signing in...</>
        ) : 'Sign In'}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex flex-col md:flex-row">

      {/* ── MOBILE only: top logo bar ── */}
      <div className="md:hidden flex items-center gap-2.5 px-5 pt-8 pb-2">
        <div className="w-9 h-9 bg-[#050a30] rounded-lg flex items-center justify-center shrink-0">
          <Gem size={18} className="text-white" />
        </div>
        <div>
          <span className="font-slab font-bold text-[#050a30] text-sm block leading-tight">Jewellery Billing</span>
          <span className="font-slab text-[10px] text-gray-500">Jewellery Management Suite</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          LEFT PANEL — visible on md (tablet) + lg (desktop)
          Identical layout for both
      ══════════════════════════════════════════ */}
      <div className="
        hidden md:flex
        md:w-1/2
        bg-[#050A30] text-white
        flex-col justify-between
        md:px-10 lg:px-14
        md:py-10 lg:py-12
      ">
        {/* Logo */}
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10 shrink-0">
            <Gem className="md:w-5 md:h-5 lg:w-7 lg:h-7" />
          </div>
          <div>
            <h1 className="font-slab md:text-xl lg:text-2xl font-semibold tracking-wide">
              Jewellery Billing
            </h1>
            <p className="font-slab md:text-xs lg:text-sm text-white/70">
              Jewellery Management Suite
            </p>
          </div>
        </div>

        {/* Headline + feature cards */}
        <div className="max-w-xl">
          <h2 className="font-slab md:text-2xl lg:text-4xl font-bold leading-tight">
            Run your jewellery business with the calm of a craftsman.
          </h2>
          <p className="font-slab md:mt-4 lg:mt-6 md:text-sm lg:text-lg text-white/80 leading-relaxed">
            Billing, inventory and oversight — all in one quiet, considered workspace.
          </p>
          <div className="md:mt-7 lg:mt-10 grid grid-cols-2 md:gap-3 lg:gap-4">
            <div className="bg-white/10 border border-white/10 rounded-2xl md:p-4 lg:p-5 backdrop-blur-sm">
              <h3 className="font-slab font-semibold md:text-sm lg:text-lg">Smart Billing</h3>
              <p className="font-slab md:text-xs lg:text-sm text-white/70 md:mt-1.5 lg:mt-2">
                GST billing, invoices & receipts with fast checkout.
              </p>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-2xl md:p-4 lg:p-5 backdrop-blur-sm">
              <h3 className="font-slab font-semibold md:text-sm lg:text-lg">Inventory Control</h3>
              <p className="font-slab md:text-xs lg:text-sm text-white/70 md:mt-1.5 lg:mt-2">
                Gold, silver & diamond stock management in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="font-slab md:text-xs lg:text-sm text-white/60">
          © 2026 Jewellery Billing
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — form (all breakpoints)
      ══════════════════════════════════════════ */}
      <div className="
        flex-1 flex items-center justify-center
        px-5 md:px-8 lg:px-6
        py-10 md:py-0
      ">
        <div className="w-full max-w-[360px] md:max-w-[340px] lg:max-w-[380px]">
          <h2 className="font-slab md:text-2xl lg:text-3xl text-2xl font-bold leading-tight">
            Welcome back
          </h2>
          <p className="font-slab text-xs md:text-sm text-gray-500 mb-6 md:mb-7 mt-1">
            Sign in to your account
          </p>
          <Alerts />
          <FormFields />

          {/* Mobile-only footer */}
          <p className="font-slab text-xs text-gray-400 text-center mt-10 md:hidden">
            © 2026 Jewellery Billing
          </p>
        </div>
      </div>

    </div>
  );
}