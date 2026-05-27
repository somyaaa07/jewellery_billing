import { useState, useEffect, useCallback } from 'react';
import { useNavigate }   from 'react-router-dom';
import { Plus, Trash2, ChevronDown,Save } from 'lucide-react';
import { customerAPI, saleAPI } from '../../services/api';
import { calcBill, calcNetWeight, fmtINR, fmtWt } from '../../utils/helper';
import Modal from '../../components/ui/Modal';
import Select from "react-select";

const EMPTY_ITEM = { itemName:'', grossWeight:'', stoneWeight:'', makingCharges:'', stoneCharges:'', purity:'22K' };
const EMPTY_EX   = { itemDescription:'Old Gold', grossWeight:'', purity:'22K', exchangeRate:'' };

export default function Billing() {
  const navigate = useNavigate();
  const [customers, setCustomers]   = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [goldRate,  setGoldRate]    = useState('');
  const [isGst,     setIsGst]       = useState(false);
  const [items,     setItems]       = useState([{ ...EMPTY_ITEM }]);
  const [exItems,   setExItems]     = useState([]);
  const [paidAmount,setPaidAmount]  = useState('');
  const [payMode,   setPayMode]     = useState('cash');
  const [notes,     setNotes]       = useState('');
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [newCust, setNewCust]       = useState({ name:'', phone:'', email:'', address:'' });
  const [saving,  setSaving]        = useState(false);
  const [error,   setError]         = useState('');

  useEffect(() => {
    customerAPI.getAll({ limit: 100 })
      .then(r => setCustomers(r.data.data || []))
      .catch(console.error);
  }, []);

  // Item update
  const updateItem = (i, field, val) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  };
  const addItem    = () => setItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));

  // Exchange update
  const updateEx  = (i, f, v) => setExItems(p => p.map((e, idx) => idx === i ? {...e,[f]:v} : e));
  const addEx     = () => setExItems(p => [...p, { ...EMPTY_EX }]);
  const removeEx  = (i) => setExItems(p => p.filter((_, idx) => idx !== i));

  // Bill summary
  const summary = calcBill({ items, goldRate, isGst, exchangeItems: exItems, paid: paidAmount });

  // Save bill
  const handleSave = async () => {
    if (!customerId)     return setError('Select your Customer ');
    if (!goldRate)       return setError('Enter Gold Rate');
    if (items.some(it => !it.itemName || !it.grossWeight)) return setError('fill item name and weight');
    try {
      setSaving(true); setError('');
      const payload = {
        customerId: parseInt(customerId), goldRate: parseFloat(goldRate), isGst,
        paidAmount: parseFloat(paidAmount || 0), paymentMode: payMode, notes,
        items: items.map(it => ({
          itemName:      it.itemName,
          grossWeight:   parseFloat(it.grossWeight || 0),
          stoneWeight:   parseFloat(it.stoneWeight || 0),
          makingChargesPercent: parseFloat(it.makingCharges || 0),
          stoneCharges:  parseFloat(it.stoneCharges || 0),
          purity:        it.purity,
          netWeight:     calcNetWeight(it.grossWeight, it.stoneWeight),
        })),
        exchangeItems: exItems.map(ex => ({
          itemDescription: ex.itemDescription,
          grossWeight:     parseFloat(ex.grossWeight || 0),
          purity:          ex.purity,
          exchangeRate:    parseFloat(ex.exchangeRate || 0),
          exchangeValue:   parseFloat(ex.grossWeight||0) * parseFloat(ex.exchangeRate||0),
        })),
      };
      const res = await saleAPI.create(payload);
      navigate(`/invoice/${res.data.data.id}`);
    } catch(err) {
      setError(err.response?.data?.message || 'Bill Not Save');
    } finally { setSaving(false); }
  };

  // Add customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.name) return;
    try {
      const res = await customerAPI.create(newCust);
      setCustomers(p => [res.data.data, ...p]);
      // setCustomerId(res.data.data.id);
      setCustomerId(String(res.data.data.id));
      setAddCustOpen(false);
      setNewCust({ name:'', phone:'', email:'', address:'' });
    } catch(err) { alert(err.response?.data?.message || 'Error'); }
  };

  const customerOptions = customers.map(c => ({
  value: c.id,
  label: `${c.name}, ${c.phone}`
}));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* ── Row 1: Customer + Gold rate + GST ── */}
      <div className="card">
        <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Bill Details</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className=" font-slab block text-xs font-medium text-gray-600 mb-1.5">Customer *</label>
            <div className="flex gap-2">
              {/* <select className="input-field" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
              </select> */}

               <Select
                options={customerOptions}
                placeholder="Search customer..."
                value={
                  customerOptions.find(
                    option => option.value === customerId
                  ) || null
                }
                onChange={(selected) =>
                  setCustomerId(selected ? selected.value : "")
                }
                isClearable
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: state.isFocused ? "#fff" : "#d0d2d7",
                    boxShadow: state.isFocused
                      ? "0 0 0 2px rgba(5, 10, 48, 0.15)"
                      : "none",
                    "&:hover": {
                      borderColor: "#050a30",
                    },
                    minHeight: "42px",
                    borderRadius: "12px",
                  }),
                }}
               />

              <button onClick={() => setAddCustOpen(true)} className="btn-secondary px-2.5 flex-shrink-0" title="Add new customer">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5"> Rate (₹/gram) *</label>
            <input className="input-field" type="number" placeholder="00" value={goldRate}
              onChange={e => setGoldRate(e.target.value)} />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setIsGst(g => !g)}
                className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 cursor-pointer
                  ${isGst ? 'bg-[#050a30]' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isGst ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#050a30]">{isGst ? 'GST Invoice' : 'Non-GST Invoice'}</p>
                <p className="text-xs text-gray-400">{isGst ? 'CGST 1.5% + SGST 1.5%' : 'No tax'}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── Row 2: Items ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm">Jewellery Items</h3>
          <button onClick={addItem} className="font-slab btn-secondary text-xs px-3 py-1.5">
            <Plus size={14} /> Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Item Name','Purity','Gross(g)','Stone(g)','Net(g)','Making(%)','Stone charge(₹)','Total',''].map(h => (
                  <th key={h} className="table-th whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const net   = calcNetWeight(it.grossWeight, it.stoneWeight);
                // const total = net * parseFloat(goldRate || 0) + parseFloat(it.makingCharges || 0) + parseFloat(it.stoneCharges || 0);
                const makingPercent = parseFloat(it.makingCharges || 0);
                const makingValue =(net * parseFloat(goldRate || 0)) * (makingPercent / 100);

                const total =
                  net * parseFloat(goldRate || 0) +
                  makingValue +
                  parseFloat(it.stoneCharges || 0);
                return (
                  <tr key={i} className="group">
                    <td className="table-td"><input className="input-field text-xs py-1.5" placeholder="Items" value={it.itemName} onChange={e => updateItem(i,'itemName',e.target.value)} /></td>
                    <td className="table-td">
                      <select className="input-field text-xs py-1.5 w-20" value={it.purity} onChange={e => updateItem(i,'purity',e.target.value)}>
                        {['24K','22K','18K','14K'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="table-td"><input className="input-field text-xs py-1.5 w-24" type="number" placeholder="10.500" value={it.grossWeight} onChange={e => updateItem(i,'grossWeight',e.target.value)} /></td>
                    <td className="table-td"><input className="input-field text-xs py-1.5 w-24" type="number" placeholder="0.000" value={it.stoneWeight} onChange={e => updateItem(i,'stoneWeight',e.target.value)} /></td>
                    <td className="table-td"><span className="text-xs font-medium text-[#050a30] bg-gray-50 px-2 py-1 rounded">{fmtWt(net)}</span></td>
                    <td className="table-td"><input className="input-field text-xs py-1.5 w-24" type="number" placeholder="5%" value={it.makingCharges} onChange={e => updateItem(i,'makingCharges',e.target.value)} /></td>
                    <td className="table-td"><input className="input-field text-xs py-1.5 w-24" type="number" placeholder="00.0" value={it.stoneCharges} onChange={e => updateItem(i,'stoneCharges',e.target.value)} /></td>

                    <td className="table-td font-semibold text-[#050a30] whitespace-nowrap">{fmtINR(total)}</td>
                    <td className="table-td">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 3: Exchange gold ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm">Exchange Gold <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span></h3>
          <button onClick={addEx} className="font-slab btn-secondary text-xs px-3 py-1.5"><Plus size={14} /> Add Exchange</button>
        </div>
        {exItems.length === 0 ? (
          <p className="font-slab text-xs text-gray-400 py-2">There’s no exchange gold — add it using the button above</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{['Description','Weight(g)','Purity','Rate(₹/g)','Value',''].map(h => <th key={h} className=" font-slab table-th">{h}</th>)}</tr></thead>
              <tbody>
                {exItems.map((ex, i) => {
                  const val = parseFloat(ex.grossWeight||0) * parseFloat(ex.exchangeRate||0);
                  return (
                    <tr key={i} className="group">
                      <td className="table-td"><input className="input-field text-xs py-1.5" placeholder="Old Gold Ring" value={ex.itemDescription} onChange={e=>updateEx(i,'itemDescription',e.target.value)}/></td>
                      <td className="table-td"><input className="input-field text-xs py-1.5 w-24" type="number" placeholder="5.000" value={ex.grossWeight} onChange={e=>updateEx(i,'grossWeight',e.target.value)}/></td>
                      <td className="table-td"><select className="input-field text-xs py-1.5 w-20" value={ex.purity} onChange={e=>updateEx(i,'purity',e.target.value)}>{['24K','22K','18K'].map(p=><option key={p}>{p}</option>)}</select></td>
                      <td className="table-td"><input className="input-field text-xs py-1.5 w-24" type="number" placeholder="6800" value={ex.exchangeRate} onChange={e=>updateEx(i,'exchangeRate',e.target.value)}/></td>
                      <td className="table-td font-semibold text-green-600">{fmtINR(val)}</td>
                      <td className="table-td"><button onClick={()=>removeEx(i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={15}/></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Row 4: Summary + Payment ── */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Bill summary */}
        <div className="card">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Bill Summary</h3>
          <div className="space-y-2.5 text-sm">
            {[
              { label:'Subtotal',            val: fmtINR(summary.subtotal) },
              ...(isGst ? [
                { label:'CGST @ 1.5%',       val: fmtINR(summary.cgst) },
                { label:'SGST @ 1.5%',       val: fmtINR(summary.sgst) },
              ] : []),
              ...(summary.exchangeValue > 0 ? [
                { label:'Exchange Deduction', val: `- ${fmtINR(summary.exchangeValue)}`, cls:'text-green-600' },
              ] : []),
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className={`font-medium ${cls || ''}`}>{val}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2.5 flex justify-between">
              <span className=" font-slab font-semibold text-[#050a30]">Total Amount</span>
              <span className="font-bold text-[#050a30] text-base">{fmtINR(summary.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="card">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Payment Details</h3>
          <div className="space-y-3">
            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Payment Mode</label>
              <select className="input-field" value={payMode} onChange={e=>setPayMode(e.target.value)}>
                {['cash','upi','card','bank_transfer','cheque'].map(m=><option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Amount Paid (₹)</label>
              <input className="input-field" type="number" placeholder="0" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-slab text-gray-500">Paid</span>
                <span className="font-medium text-green-600">{fmtINR(paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-slab text-gray-500">Due</span>
                <span className={`font-bold ${summary.due > 0 ? 'text-red-500' : 'text-green-600'}`}>{fmtINR(summary.due)}</span>
              </div>
            </div>
            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Optional notes..." value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full justify-center py-2.5 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Bill & View Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal open={addCustOpen} onClose={() => setAddCustOpen(false)} title="Add New Customer" size="sm">
        <form onSubmit={handleAddCustomer} className="space-y-3">
          {[{l:'Name *',n:'name',t:'text',p:'Priya Sharma'},{l:'Phone',n:'phone',t:'tel',p:'9876543210'},
            {l:'Email',n:'email',t:'email',p:'priya@email.com'},{l:'Address',n:'address',t:'text',p:'Pune'}].map(f=>(
            <div key={f.n}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
              <input className="input-field" type={f.t} placeholder={f.p} value={newCust[f.n]}
                onChange={e=>setNewCust(p=>({...p,[f.n]:e.target.value}))} required={f.n==='name'}/>
            </div>
          ))}
          <button type="submit" className="btn-primary w-full justify-center mt-2">Add Customer</button>
        </form>
      </Modal>
    </div>
  );
}