import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { Gem, Eye, EyeOff } from 'lucide-react';

export default function RegisterSuperAdmin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', setupKey:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const onChange = (e) => { setForm(p=>({...p,[e.target.name]:e.target.value})); setError(''); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name||!form.email||!form.password||!form.setupKey) return setError('Sab fields fill karo');
    if (form.password.length < 8) return setError('Password minimum 8 characters');
    if (form.password !== form.confirm) return setError('Passwords match nahi kar rahe');
    try {
      setLoading(true);
      const res = await authAPI.registerSuperAdmin({ name:form.name, email:form.email, password:form.password, setupKey:form.setupKey });
      localStorage.setItem('jwtToken', res.data.token);
      navigate('/super-admin');
    } catch(err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-[#050a30] rounded-lg flex items-center justify-center">
            <Gem size={16} className="text-yellow-400" />
          </div>
          <span className="font-slab font-bold text-[#050a30]">New Fashion Jewellery</span>
        </div>
        <h2 className=" font-slab text-xl font-bold text-[#050a30] mb-1">Super Admin Setup</h2>
        <p className="font-slab text-sm text-gray-500 mb-2">Pehli baar server deploy karne ke baad use karo</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-700 mb-6">
          ⚠️ Yeh sirf <strong>ek baar</strong> use hota hai. <code className="bg-yellow-100 px-1 rounded">SETUP_KEY</code> .env file se lo.
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          {[{l:'Full Name',n:'name',t:'text',p:'Suresh Kumar'},{l:'Email',n:'email',t:'email',p:'admin@jewelry.com'}].map(f=>(
            <div key={f.n}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.l}</label>
              <input className="input-field" type={f.t} name={f.n} value={form[f.n]} onChange={onChange} placeholder={f.p} disabled={loading} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password (min 8 chars)</label>
            <div className="relative">
              <input className="input-field pr-10" type={show?'text':'password'} name="password" value={form.password} onChange={onChange} placeholder="Strong password" disabled={loading} />
              <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </div>
          <div>
            <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Confirm Password</label>
            <input className="input-field" type="password" name="confirm" value={form.confirm} onChange={onChange} placeholder="Same password dobara" disabled={loading} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Setup Key (.env → SETUP_KEY)</label>
            <input className="input-field font-mono tracking-wider" type="password" name="setupKey" value={form.setupKey} onChange={onChange} placeholder="Secret key" disabled={loading} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Registering...</> : '👑 Register as Super Admin'}
          </button>
        </form>
        <div className="mt-5 text-center">
          <Link to="/login" className="text-xs text-gray-400 hover:text-[#050a30]">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}