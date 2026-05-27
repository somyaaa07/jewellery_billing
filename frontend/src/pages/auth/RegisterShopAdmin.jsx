import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { Gem, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function RegisterShopAdmin() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get('token');
  const [shopName, setShopName] = useState('');
  const [tokenValid, setTokenValid] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); setError('Invite token missing. Super admin se link lo.'); return; }
    authAPI.validateInviteToken(token)
      .then(r => { setShopName(r.data.shopName); setTokenValid(true); })
      .catch(e => { setTokenValid(false); setError(e.response?.data?.message || 'Invalid token'); });
  }, [token]);

  const onChange = (e) => { setForm(p=>({...p,[e.target.name]:e.target.value})); setError(''); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name||!form.email||!form.password) return setError('Sab fields fill karo');
    if (form.password.length < 6) return setError('Password minimum 6 characters');
    if (form.password !== form.confirm) return setError('Passwords match nahi kar rahe');
    try {
      setLoading(true);
      const res = await authAPI.registerShopAdmin({ name:form.name, email:form.email, password:form.password, inviteToken:token });
      localStorage.setItem('jwtToken', res.data.token);
      navigate('/dashboard');
    } catch(e) { setError(e.response?.data?.message||'Registration failed'); }
    finally { setLoading(false); }
  };

  if (tokenValid === null) return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center">
      <div className="text-center"><Loader2 className="animate-spin mx-auto mb-3 text-[#050a30]" size={32}/><p className="text-sm text-gray-500">Token verify ho raha hai...</p></div>
    </div>
  );

  if (!tokenValid) return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
        <div className="text-4xl mb-4">❌</div>
        <h2 className=" font-slab text-lg font-bold text-red-600 mb-2">Invalid Token</h2>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <Link to="/login" className="btn-primary inline-flex">← Back to Login</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-[#050a30] rounded-lg flex items-center justify-center"><Gem size={16} className="text-yellow-400"/></div>
          <span className=" font-slab font-bold text-[#050a30]">New Fashion Jewellery</span>
        </div>
        <h2 className=" font-slab text-xl font-bold text-[#050a30] mb-1">Shop Admin Register</h2>
        <div className="inline-flex items-center gap-2 bg-[#050a30]/5 border border-[#050a30]/10 rounded-lg px-3 py-1.5 mb-5 mt-1">
          <span className="text-sm">🏪</span>
          <span className="text-sm font-medium text-[#050a30]">{shopName}</span>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          {[{l:'Full Name',n:'name',t:'text',p:'Ramesh Shah'},{l:'Email',n:'email',t:'email',p:'ramesh@shop.com'}].map(f=>(
            <div key={f.n}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.l}</label>
              <input className="input-field" type={f.t} name={f.n} value={form[f.n]} onChange={onChange} placeholder={f.p} disabled={loading}/>
            </div>
          ))}
          <div>
            <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Password (min 6 chars)</label>
            <div className="relative">
              <input className="input-field pr-10" type={show?'text':'password'} name="password" value={form.password} onChange={onChange} placeholder="Apna password" disabled={loading}/>
              <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </div>
          <div>
            <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Confirm Password</label>
            <input className="input-field" type="password" name="confirm" value={form.confirm} onChange={onChange} placeholder="Same password dobara" disabled={loading}/>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating Account...</> : ' Register & Login'}
          </button>
        </form>
        <div className="mt-5 text-center"><Link to="/login" className="text-xs text-gray-400 hover:text-[#050a30]">← Back to Login</Link></div>
      </div>
    </div>
  );
}