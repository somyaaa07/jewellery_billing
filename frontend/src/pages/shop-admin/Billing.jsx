import { useState, useEffect } from 'react';
import { useNavigate }   from 'react-router-dom';
import { Plus, Trash2, Save, Wallet, ChevronDown } from 'lucide-react';
import { customerAPI, saleAPI, advanceAPI } from '../../services/api';
import { calcBill, calcNetWeight, fmtINR, fmtWt } from '../../utils/helper';
import Modal  from '../../components/ui/Modal';
import Select from 'react-select';

const METAL_TYPES = ['gold', 'silver'];

const EMPTY_ITEM = {
  metalType:    'gold',
  itemName:     '',
  grossWeight:  '',
  stoneWeight:  '',
  makingCharges:'',
  stoneCharges: '',
  purity:       '22K',
  huid:         '',
  hsnCode:      '',
};

const EMPTY_EX = { itemDescription:'Old Gold', grossWeight:'', purity:'22K', exchangeRate:'' };

const GOLD_PURITIES   = ['24K','22K','18K','14K'];
const SILVER_PURITIES = ['999','925','800'];

const DEFAULT_HSN = { gold: '7113', silver: '7114' };

export default function Billing() {
  const navigate = useNavigate();

  const [customers,   setCustomers]   = useState([]);
  const [customerId,  setCustomerId]  = useState('');
  const [goldRate,    setGoldRate]    = useState('');
  const [silverRate,  setSilverRate]  = useState('');
  const [isGst,       setIsGst]       = useState(false);
  const [items,       setItems]       = useState([{ ...EMPTY_ITEM }]);
  const [exItems,     setExItems]     = useState([]);
  const [paidAmount,  setPaidAmount]  = useState('');
  const [payMode,     setPayMode]     = useState('cash');
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const [addCustOpen, setAddCustOpen] = useState(false);
  const [newCust,     setNewCust]     = useState({ name:'', phone:'', email:'', address:'' });

  const [advanceBalance,   setAdvanceBalance]   = useState(0);
  const [advanceList,      setAdvanceList]      = useState([]);
  const [useAdvanceAmount, setUseAdvanceAmount] = useState('');
  const [loadingAdvance,   setLoadingAdvance]   = useState(false);

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    amount: '', paymentMethod: 'cash', transactionReference: '', notes: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });
  const [savingAdv, setSavingAdv] = useState(false);
  const [advSaved,  setAdvSaved]  = useState(false);
  const [advError,  setAdvError]  = useState('');

  const hasSilverItem = items.some(it => (it.metalType || 'gold') === 'silver');
  const hasGoldItem   = items.some(it => (it.metalType || 'gold') === 'gold');

  useEffect(() => {
    customerAPI.getAll({ limit: 200 })
      .then(r => setCustomers(r.data.data || []))
      .catch(console.error);
  }, []);

  // ── Jab customer change ho tab advance balance fetch karo ──
  useEffect(() => {
    setAdvanceBalance(0);
    setAdvanceList([]);
    setUseAdvanceAmount('');

    if (!customerId) return;

    setLoadingAdvance(true);
    advanceAPI.getBalance(customerId)
      .then(r => {
        const data = r.data.data;
        setAdvanceBalance(data.totalBalance || 0);
        setAdvanceList(data.advances       || []);
      })
      .catch(() => {
        setAdvanceBalance(0);
        setAdvanceList([]);
      })
      .finally(() => setLoadingAdvance(false));
  }, [customerId]);

  const updateItem = (i, f, v) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

  const changeMetalType = (i, metalType) => {
    const defaultPurity = metalType === 'gold' ? '22K' : '';
    const defaultHsn    = DEFAULT_HSN[metalType] || '';
    setItems(p => p.map((it, idx) =>
      idx === i
        ? { ...it, metalType, purity: defaultPurity, hsnCode: defaultHsn, makingCharges: '', huid: '' }
        : it
    ));
  };

  const addItem    = () => setItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));

  const updateEx = (i, f, v) =>
    setExItems(p => p.map((e, idx) => idx === i ? { ...e, [f]: v } : e));
  const addEx    = () => setExItems(p => [...p, { ...EMPTY_EX }]);
  const removeEx = (i) => setExItems(p => p.filter((_, idx) => idx !== i));

  const summary = calcBill({
    items,
    goldRate,
    silverRate,
    isGst,
    exchangeItems: exItems,
    paid: paidAmount,
  });

  // ── Advance calculation ──
  const advanceToUse  = Math.min(
    parseFloat(useAdvanceAmount || 0),
    advanceBalance,
    Math.max(0, summary.total - parseFloat(paidAmount || 0))
  );
  const totalPaidDisp = parseFloat(paidAmount || 0) + advanceToUse;
  const finalDue      = Math.max(0, summary.total - totalPaidDisp);

  // ── Save Bill ──
  const handleSave = async () => {
    if (!customerId) return setError('Customer select karo');
    if (hasGoldItem   && !goldRate)   return setError('Enter Gold Rate');
    if (hasSilverItem && !silverRate) return setError('Enter Silver Rate');

    for (let i = 0; i < items.length; i++) {
      const it        = items[i];
      const metalType = (it.metalType || 'gold').toLowerCase();
      const idx       = i + 1;

      if (!it.itemName || !String(it.itemName).trim())
        return setError(`Item ${idx}: Item name required hai`);
      if (!it.grossWeight || parseFloat(it.grossWeight) <= 0)
        return setError(`Item ${idx}: Gross weight required hai`);
      if (metalType === 'gold' && !it.purity)
        return setError(`Item ${idx}: Gold ke liye purity required hai`);
      // ✅ Silver: making charge (flat) required
      if (metalType === 'silver' && (it.makingCharges === '' || it.makingCharges === undefined))
        return setError(`Item ${idx}: Silver ke liye making charges required hai`);
    }

    if (advanceToUse > advanceBalance)
      return setError(`Advance balance sirf ${fmtINR(advanceBalance)} available hai`);

    try {
      setSaving(true);
      setError('');

      const payload = {
        customerId:        parseInt(customerId),
        goldRate:          parseFloat(goldRate   || 0),
        silverRate:        parseFloat(silverRate || 0),
        isGst,
        paidAmount:        parseFloat(paidAmount || 0),
        paymentMode:       payMode,
        notes,
        advanceUsedAmount:    parseFloat(advanceToUse.toFixed(2)),
        advanceReceivedAmount: 0,

        // ✅ FIX: Gold → makingChargesPercent, Silver → makingCharges (flat ₹)
        items: items.map(it => {
          const metalType = (it.metalType || 'gold').toLowerCase();
          return {
            metalType,
            itemName:     it.itemName,
            grossWeight:  parseFloat(it.grossWeight  || 0),
            stoneWeight:  parseFloat(it.stoneWeight  || 0),
            stoneCharges: parseFloat(it.stoneCharges || 0),
            purity:   metalType === 'gold' ? (it.purity || '22K') : null,
            huid:     it.huid    || null,
            hsnCode:  it.hsnCode || DEFAULT_HSN[metalType] || null,
            netWeight: calcNetWeight(it.grossWeight, it.stoneWeight),
            ...(metalType === 'silver'
              ? { makingCharges: parseFloat(it.makingCharges || 0) }          // flat ₹
              : { makingChargesPercent: parseFloat(it.makingCharges || 0) }   // percent
            ),
          };
        }),

        exchangeItems: exItems.map(ex => ({
          itemDescription: ex.itemDescription,
          grossWeight:     parseFloat(ex.grossWeight  || 0),
          purity:          ex.purity,
          exchangeRate:    parseFloat(ex.exchangeRate || 0),
          exchangeValue:   parseFloat(ex.grossWeight  || 0) * parseFloat(ex.exchangeRate || 0),
        })),
      };

      const res = await saleAPI.create(payload);
      navigate(`/invoice/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Bill save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  // ── Save Advance ──
  const handleSaveAdvance = async () => {
    if (!customerId) return setAdvError('Pehle customer select karo');
    if (!advanceForm.amount || parseFloat(advanceForm.amount) <= 0)
      return setAdvError('Valid amount enter karo');
    try {
      setSavingAdv(true);
      setAdvError('');
      await advanceAPI.create({ ...advanceForm, customerId: parseInt(customerId) });
      setAdvSaved(true);
      setAdvanceForm({
        amount: '', paymentMethod: 'cash', transactionReference: '', notes: '',
        paymentDate: new Date().toISOString().split('T')[0],
      });

      const r    = await advanceAPI.getBalance(customerId);
      const data = r.data.data;
      setAdvanceBalance(data.totalBalance || 0);
      setAdvanceList(data.advances       || []);

      setTimeout(() => setAdvSaved(false), 3000);
    } catch (err) {
      setAdvError(err.response?.data?.message || 'Advance save nahi hua');
    } finally {
      setSavingAdv(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.name) return;
    try {
      const res = await customerAPI.create(newCust);
      setCustomers(p => [res.data.data, ...p]);
      setCustomerId(String(res.data.data.id));
      setAddCustOpen(false);
      setNewCust({ name:'', phone:'', email:'', address:'' });
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.name}, ${c.phone}`,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Row 1: Customer + Rates + GST ── */}
      <div className="card">
        <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Bill Details</h3>
        <div className="grid sm:grid-cols-4 gap-4">

          <div className="sm:col-span-2">
            <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Customer *</label>
            <div className="flex gap-2">
              <Select
                options={customerOptions}
                placeholder="Search customer..."
                value={customerOptions.find(o => o.value === customerId) || null}
                onChange={sel => setCustomerId(sel ? sel.value : '')}
                isClearable
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: state.isFocused ? '#fff' : '#d0d2d7',
                    boxShadow:   state.isFocused ? '0 0 0 2px rgba(5,10,48,0.15)' : 'none',
                    '&:hover':   { borderColor: '#050a30' },
                    minHeight:   '42px',
                    borderRadius:'12px',
                  }),
                }}
              />
              <button onClick={() => setAddCustOpen(true)} className="btn-secondary px-2.5 flex-shrink-0" title="Add new customer">
                <Plus size={16} />
              </button>
            </div>

            {customerId && (
              <div className="mt-2">
                {loadingAdvance ? (
                  <p className="text-xs text-gray-400">Checking advance balance...</p>
                ) : advanceBalance > 0 ? (
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                    <Wallet size={12} className="text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 font-medium">
                      Advance available: <span className="font-bold">{fmtINR(advanceBalance)}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">No advance balance</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">
              Gold Rate (₹/g){hasGoldItem ? ' *' : ''}
            </label>
            <input
              className="input-field" type="number" placeholder="00"
              value={goldRate} onChange={e => setGoldRate(e.target.value)}
            />
          </div>

          <div>
            <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">
              Silver Rate (₹/g){hasSilverItem ? ' *' : ''}
            </label>
            <input
              className="input-field" type="number" placeholder="00"
              value={silverRate} onChange={e => setSilverRate(e.target.value)}
            />
          </div>
        </div>

        {/* GST Toggle */}
        <div className="mt-4">
          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
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

      {/* ── Row 2: Items ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm">Jewellery Items</h3>
          <button onClick={addItem} className="font-slab btn-secondary text-xs px-3 py-1.5">
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((it, i) => {
            const isGold     = (it.metalType || 'gold') === 'gold';
            const net        = calcNetWeight(it.grossWeight, it.stoneWeight);
            const activeRate = isGold ? parseFloat(goldRate || 0) : parseFloat(silverRate || 0);
            const metalValue = net * activeRate;
            const makingRaw  = parseFloat(it.makingCharges || 0);

            // ✅ FIX: Gold = percent of metalValue, Silver = flat ₹ amount
            const makingValue = isGold
              ? metalValue * (makingRaw / 100)
              : makingRaw;

            const total = metalValue + makingValue + parseFloat(it.stoneCharges || 0);

            return (
              <div
                key={i}
                className={`rounded-xl border p-4 space-y-3 relative group
                  ${isGold ? 'border-yellow-200 bg-yellow-50/40' : 'border-gray-200 bg-gray-50/40'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
                      {METAL_TYPES.map(mt => (
                        <button
                          key={mt}
                          type="button"
                          onClick={() => changeMetalType(i, mt)}
                          className={`px-3 py-1.5 capitalize transition-colors
                            ${it.metalType === mt
                              ? mt === 'gold' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-400 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {mt === 'gold' ? ' Gold' : ' Silver'}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">Item {i + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${isGold ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      ₹{activeRate > 0 ? activeRate.toLocaleString('en-IN') : '—'}/g
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Item Name *</label>
                    <input
                      className="input-field text-xs py-1.5"
                      placeholder={isGold ? 'Gold Ring' : 'Silver Anklet'}
                      value={it.itemName}
                      onChange={e => updateItem(i, 'itemName', e.target.value)}
                    />
                  </div>

                  {isGold && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Karat (K)</label>
                      <select
                        className="input-field text-xs py-1.5"
                        value={it.purity}
                        onChange={e => updateItem(i, 'purity', e.target.value)}
                      >
                        {GOLD_PURITIES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">HSN Code</label>
                    <input
                      className="input-field text-xs py-1.5"
                      placeholder={DEFAULT_HSN[it.metalType] || '7113'}
                      value={it.hsnCode}
                      onChange={e => updateItem(i, 'hsnCode', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Gross Weight (g) *</label>
                    <input
                      className="input-field text-xs py-1.5" type="number" placeholder="10.500"
                      value={it.grossWeight}
                      onChange={e => updateItem(i, 'grossWeight', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Stone Weight (g)</label>
                    <input
                      className="input-field text-xs py-1.5" type="number" placeholder="0.000"
                      value={it.stoneWeight}
                      onChange={e => updateItem(i, 'stoneWeight', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Net Weight (g)</label>
                    <div className="input-field text-xs py-1.5 bg-gray-100 text-gray-600 select-none">
                      {fmtWt(net)}
                    </div>
                  </div>
                  {isGold ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">HUID</label>
                      <input
                        className="input-field text-xs py-1.5 font-mono tracking-wider uppercase"
                        placeholder="AB1234" maxLength={6}
                        value={it.huid}
                        onChange={e => updateItem(i, 'huid', e.target.value.toUpperCase())}
                      />
                    </div>
                  ) : <div />}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    {/* ✅ FIX: Label changes based on metal type */}
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {isGold ? 'Making (%)' : 'Making (₹)'}
                    </label>
                    <input
                      className="input-field text-xs py-1.5" type="number"
                      placeholder={isGold ? '5' : '200'}
                      value={it.makingCharges}
                      onChange={e => updateItem(i, 'makingCharges', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Stone Charges (₹)</label>
                    <input
                      className="input-field text-xs py-1.5" type="number" placeholder="0"
                      value={it.stoneCharges}
                      onChange={e => updateItem(i, 'stoneCharges', e.target.value)}
                    />
                  </div>
                  {makingRaw > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Making Value</label>
                      <div className="input-field text-xs py-1.5 bg-gray-50 text-gray-600 select-none">
                        {fmtINR(makingValue)}
                      </div>
                    </div>
                  )}
                  <div className={isGold && makingRaw > 0 ? '' : 'sm:col-start-4'}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Item Total</label>
                    <div className={`input-field text-xs py-1.5 font-bold select-none
                      ${isGold ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                      {fmtINR(total)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 3: Exchange Gold ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm">
            Exchange Items <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span>
          </h3>
          <button onClick={addEx} className="font-slab btn-secondary text-xs px-3 py-1.5">
            <Plus size={14} /> Add Exchange
          </button>
        </div>
        {exItems.length === 0 ? (
          <p className="font-slab text-xs text-gray-400 py-2">Exchange Items</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>{['Description','Weight(g)','Rate(₹/g)','Value',''].map(h => (
                  <th key={h} className="font-slab table-th">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {exItems.map((ex, i) => {
                  const val = parseFloat(ex.grossWeight||0) * parseFloat(ex.exchangeRate||0);
                  return (
                    <tr key={i} className="group">
                      <td className="table-td"><input className="input-field text-xs py-1.5" placeholder="Old Items" value={ex.itemDescription} onChange={e=>updateEx(i,'itemDescription',e.target.value)}/></td>
                      <td className="table-td"><input className="input-field text-xs py-1.5 w-24" type="number" placeholder="5.000" value={ex.grossWeight} onChange={e=>updateEx(i,'grossWeight',e.target.value)}/></td>
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

        {/* Bill Summary */}
        <div className="card">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Bill Summary</h3>
          <div className="space-y-2.5 text-sm">
           {[
  { label:'Subtotal', val: fmtINR(summary.subtotal) },
  ...(isGst ? [
    { label:'CGST @ 1.5%', val: fmtINR(summary.cgst) },
    { label:'SGST @ 1.5%', val: fmtINR(summary.sgst) },
  ] : []),
  ...(summary.exchangeValue > 0 ? [
    { label:'Exchange Deduction', val:`- ${fmtINR(summary.exchangeValue)}`, cls:'text-green-600' },
  ] : []),
  // ✅ Round off row — only show if non-zero
  ...(summary.roundOff !== 0 ? [
    {
      label: 'Round Off',
      val: (summary.roundOff > 0 ? '+ ' : '- ') + fmtINR(Math.abs(summary.roundOff)),
      cls: 'text-gray-400',
    },
  ] : []),
].map(({ label, val, cls }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className={`font-medium ${cls || ''}`}>{val}</span>
              </div>
            ))}

            <div className="border-t border-gray-100 pt-2.5 flex justify-between">
              <span className="font-slab font-semibold text-[#050a30]">Total Amount</span>
              <span className="font-bold text-[#050a30] text-base">{fmtINR(summary.total)}</span>
            </div>

            {advanceToUse > 0 && (
              <div className="flex justify-between text-sm bg-green-50 rounded-lg px-2 py-1.5 -mx-1">
                <span className="text-green-700 flex items-center gap-1.5">
                  <Wallet size={12} /> Advance Used
                </span>
                <span className="font-semibold text-green-700">- {fmtINR(advanceToUse)}</span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-2.5 flex justify-between">
              <span className="font-slab font-semibold text-red-500">Final Due</span>
              <span className={`font-bold text-base ${finalDue > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {fmtINR(finalDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="card">
          <h3 className="font-slab font-semibold text-[#050a30] text-sm mb-4">Payment Details</h3>
          <div className="space-y-3">

            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Payment Mode</label>
              <select className="input-field" value={payMode} onChange={e => setPayMode(e.target.value)}>
                {['cash','upi','card','bank_transfer','cheque'].map(m => (
                  <option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Cash / UPI Paid (₹)</label>
              <input
                className="input-field" type="number" placeholder="0"
                value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
              />
            </div>

            {/* ── Advance Section ── */}
            {advanceBalance > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wallet size={13} className="text-green-600" />
                    <p className="text-xs font-semibold text-green-700">Use Advance Payment</p>
                  </div>
                  <span className="text-xs text-green-600 font-medium">
                    Available: {fmtINR(advanceBalance)}
                  </span>
                </div>
                <input
                  className="input-field text-sm"
                  type="number"
                  placeholder="0"
                  max={Math.min(advanceBalance, Math.max(0, summary.total - parseFloat(paidAmount || 0)))}
                  value={useAdvanceAmount}
                  onChange={e => setUseAdvanceAmount(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setUseAdvanceAmount(
                        String(
                          Math.min(
                            advanceBalance,
                            Math.max(0, summary.total - parseFloat(paidAmount || 0))
                          ).toFixed(2)
                        )
                      )
                    }
                    className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Use Max
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseAdvanceAmount('')}
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Payment summary box */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              {/* <div className="flex justify-between text-sm">
                <span className="font-slab text-gray-500">Cash Paid</span>
                <span className="font-medium text-green-600">{fmtINR(paidAmount || 0)}</span>
              </div> */}
              {advanceToUse > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-slab text-gray-500">Advance Used</span>
                  <span className="font-medium text-green-600">{fmtINR(advanceToUse)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5">
                <span className="font-slab text-gray-500">Total Paid</span>
                <span className="font-semibold text-green-600">{fmtINR(totalPaidDisp)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-slab text-gray-500">Due</span>
                <span className={`font-bold ${finalDue > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {fmtINR(finalDue)}
                </span>
              </div>
            </div>

            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <textarea
                className="input-field resize-none" rows={2}
                placeholder="Optional notes..."
                value={notes} onChange={e => setNotes(e.target.value)}
              />
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

      {/* ── Row 5: Record Advance Payment ── */}
      <div className="card">
        <button
          type="button"
          onClick={() => { setAdvanceOpen(o => !o); setAdvError(''); setAdvSaved(false); }}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-green-600" />
            <h3 className="font-slab font-semibold text-[#050a30] text-sm">
              Record Advance Payment
            </h3>
            <span className="text-xs text-gray-400 font-normal">(Optional)</span>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${advanceOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {advanceOpen && (
          <div className="mt-4 space-y-3">

            {advError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2">
                {advError}
              </div>
            )}

            {advSaved && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="font-bold">✓</span> Advance successfully saved
              </div>
            )}

            {!customerId && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Select customer for advance payment
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Amount (₹) *</label>
                <input
                  className="input-field" type="number" placeholder="10000"
                  value={advanceForm.amount}
                  onChange={e => setAdvanceForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                <input
                  className="input-field" type="date"
                  value={advanceForm.paymentDate}
                  onChange={e => setAdvanceForm(p => ({ ...p, paymentDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
                <select
                  className="input-field"
                  value={advanceForm.paymentMethod}
                  onChange={e => setAdvanceForm(p => ({ ...p, paymentMethod: e.target.value }))}
                >
                  {['cash','upi','card','bank_transfer','cheque'].map(m => (
                    <option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Transaction Ref.</label>
                <input
                  className="input-field" placeholder="UPI ID / Cheque no."
                  value={advanceForm.transactionReference}
                  onChange={e => setAdvanceForm(p => ({ ...p, transactionReference: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="font-slab block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <input
                className="input-field" placeholder="Optional..."
                value={advanceForm.notes}
                onChange={e => setAdvanceForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveAdvance}
              disabled={savingAdv || !customerId}
              className="btn-primary w-full justify-center py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              {savingAdv ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Wallet size={16} />
                  Save Advance Payment
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal open={addCustOpen} onClose={() => setAddCustOpen(false)} title="Add New Customer" size="sm">
        <form onSubmit={handleAddCustomer} className="space-y-3">
          {[
            { l:'Name *',  n:'name',    t:'text',  p:'Priya Sharma'    },
            { l:'Phone',   n:'phone',   t:'tel',   p:'9876543210'      },
            { l:'Email',   n:'email',   t:'email', p:'priya@email.com' },
            { l:'Address', n:'address', t:'text',  p:'Pune'            },
          ].map(f => (
            <div key={f.n}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
              <input
                className="input-field" type={f.t} placeholder={f.p}
                value={newCust[f.n]}
                onChange={e => setNewCust(p => ({ ...p, [f.n]: e.target.value }))}
                required={f.n === 'name'}
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full justify-center mt-2">
            Add Customer
          </button>
        </form>
      </Modal>
    </div>
  );
}