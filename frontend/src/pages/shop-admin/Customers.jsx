import { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, Mail } from 'lucide-react';
import { customerAPI } from '../../services/api';
import { fmtINR, fmtDate } from '../../utils/helper';
import Modal   from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import Badge   from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

const EMPTY = { name:'', phone:'', email:'', address:'', city:'' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search,  setSearch]      = useState('');
  const [addOpen, setAddOpen]     = useState(false);
  const [editItem,setEditItem]    = useState(null);
  const [form,    setForm]        = useState(EMPTY);
  const [saving,  setSaving]      = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const load = () => {
  setLoading(true);

  customerAPI.getAll({
    search,
    page,
    limit: 10,
  })
  .then((r) => {
    setCustomers(r.data.data || []);
    setPagination(r.data.pagination || {});
  })
  .finally(() => setLoading(false));
};

  // useEffect(() => { load(); }, [search]);
  useEffect(() => {
  load();
}, [search, page]);

  const openAdd  = () => { setForm(EMPTY); setEditItem(null); setAddOpen(true); };
  const openEdit = (c) => { setForm(c); setEditItem(c); setAddOpen(true); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      setSaving(true);
      if (editItem) await customerAPI.update(editItem.id, form);
      else           await customerAPI.create(form);
      setAddOpen(false); load();
    } catch(err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
          className="input-field pl-9"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={16}/>Add Customer</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>{['Customer','Phone','Email','City','Total Due','Added','Action'].map(h=>(
                <th key={h} className="table-th">{h}</th>
              ))}</tr>
            </thead>
           
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><Spinner center /></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                  <User size={32} className="mx-auto mb-2 opacity-30" />
                 I couldn’t find any customers
                </td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                   
                      <Link to ={`/customers/${c.id}`} >
                  <td className="table-td">
                                       

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#050a30]/8 rounded-full flex items-center justify-center text-[#050a30] font-semibold text-xs flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <span className="font-medium text-[#050a30]">{c.name}</span>
                   
                    </div>

                       
                  </td>
                  </Link>
                  <td className="table-td text-gray-600">{c.phone || '—'}</td>
                  <td className="table-td text-gray-600 max-w-[160px] truncate">{c.email || '—'}</td>
                  <td className="table-td text-gray-600">{c.city || '—'}</td>
                  <td className="table-td">
                    <span className={parseFloat(c.totalDue) > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {fmtINR(c.totalDue)}
                    </span>
                  </td>
                  <td className="table-td text-gray-500 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                  <td className="table-td">
                    <button onClick={() => openEdit(c)} className="text-xs text-[#050a30] hover:underline font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
       
          </table>
        </div>
      </div>
       {/* Pagination UI */}
      <div className="flex items-center justify-between">
        <p className=" font-sans text-sm text-gray-500">
          Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
        </p>

        <div className="flex gap-2">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
            className=" font-sans px-3 py-1 bg-[#050A30] text-[#f5f3ee] border rounded cursor-pointer disabled:opacity-50 "
          >
            Prev
          </button>

          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className=" font-sans px-3 py-1 bg-[#050A30] text-[#f5f3ee]  border rounded cursor-pointer disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      {/* Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={editItem ? 'Edit Customer' : 'Add Customer'} size="sm">
        <form onSubmit={onSubmit} className="space-y-3">
          {[{l:'Name *',n:'name',t:'text',p:'Enter your name'},{l:'Phone',n:'phone',t:'tel',p:'9876543210'},
            {l:'Email',n:'email',t:'email',p:'email@gmail.com'},{l:'Address',n:'address',t:'text',p:'123 Main St'},
            {l:'City',n:'city',t:'text',p:'Pune'}].map(f => (
            <div key={f.n}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
              <input className="input-field" type={f.t} placeholder={f.p}
                value={form[f.n] || ''} onChange={e => setForm(p=>({...p,[f.n]:e.target.value}))}
                required={f.n==='name'} />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center mt-2">
            {saving ? 'Saving...' : editItem ? 'Update Customer' : 'Add Customer'}
          </button>
        </form>
      </Modal>
    </div>
  );
}