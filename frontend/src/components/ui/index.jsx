// ── Reusable UI Components ──
// Inhe puri app mein use karo

// Stat Card — dashboard pe numbers dikhane ke liye
export function StatCard({ icon, label, value, sub, color = '#050a30' }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
           style={{ background: `${color}15` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#050a30] leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// Page Header
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#050a30]">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Primary Button
export function Btn({ children, onClick, type = 'button', variant = 'primary', disabled, className = '' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:  'bg-[#050a30] text-white hover:bg-[#0a1550] shadow-sm',
    danger:   'bg-red-500 text-white hover:bg-red-600',
    ghost:    'bg-white border border-gray-200 text-[#050a30] hover:bg-gray-50',
    success:  'bg-green-600 text-white hover:bg-green-700',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
            className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// Input Field
export function Input({ label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>}
      <input {...props}
             className={`w-full border rounded-lg px-3 py-2.5 text-sm text-[#050a30] outline-none transition-all
                         focus:border-[#050a30] focus:ring-2 focus:ring-[#050a30]/10
                         ${error ? 'border-red-400' : 'border-gray-200'}
                         ${props.className || ''}`} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Select
export function Select({ label, children, error, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>}
      <select {...props}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-[#050a30] outline-none transition-all bg-white
                          focus:border-[#050a30] focus:ring-2 focus:ring-[#050a30]/10
                          ${error ? 'border-red-400' : 'border-gray-200'}`}>
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Card wrapper
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

// Badge
export function Badge({ label, color = 'gray' }) {
  const colors = {
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}

// Modal wrapper
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-[#050a30] text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// Empty state
export function Empty({ icon = '📭', message = 'No Data is available' }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

// Spinner
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-[#050a30] rounded-full animate-spin"/>
    </div>
  );
}

// Table wrapper
export function Table({ headers, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map(h => (
              <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Tr({ children, onClick }) {
  return (
    <tr onClick={onClick}
        className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${onClick ? 'cursor-pointer' : ''}`}>
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-[#050a30] ${className}`}>{children}</td>;
}