import { useState, useEffect } from 'react';
import { CheckCircle2 } from "lucide-react";
import { customerAPI, saleAPI } from '../../services/api';
import { PageHeader, Card, Btn, Modal, Input, Badge, Table, Tr, Td, Spinner, Empty } from '../../components/ui';
import { motion } from "framer-motion";
import {
  Search
} from "lucide-react";
const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function DuePage() {
  const [dues,     setDues]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [amount,   setAmount]   = useState('');
  const [payType,  setPayType]  = useState('cash');
  const [saving,   setSaving]   = useState(false);
  const [totals,   setTotals]   = useState({ due: 0, collected: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, hasPrevPage: false, hasNextPage: false });

  

  useEffect(() => {
  Promise.all([
    customerAPI.getAll(),
    saleAPI.getAll({ status: 'due' }),
    saleAPI.getAll({ status: 'partial' }),
    customerAPI.getDueCustomers({
      page,
      limit: 10,
      search,
    }),
  ])
    .then(([cr, dueR, partialR, dueCustomerRes]) => {
      // const customers = cr.data?.data || cr.data || [];
      const customers =
  dueCustomerRes.data?.data || [];
      const dueSales = dueR.data?.data || dueR.data || [];
      const partSales = partialR.data?.data || partialR.data || [];

      const allSales = [...dueSales, ...partSales];

      const saleMap = {};
      const paidMap = {};

      allSales.forEach(s => {
        const cid = s.customerId;
        if (!saleMap[cid]) saleMap[cid] = s.id;
        paidMap[cid] = (paidMap[cid] || 0) + parseFloat(s.paidAmount || 0);
      });

      const withDues = customers
        .filter(c => parseFloat(c.totalDue || 0) > 0)
        .map(c => ({
          _id: c.id,
          customerName: c.name,
          phone: c.phone || '—',
          due: parseFloat(c.totalDue || 0),
          paid: parseFloat(paidMap[c.id] || 0),
          saleId: saleMap[c.id] || null,
        }));

      const totalDue = withDues.reduce((s, d) => s + d.due, 0);
      const totalCollected = withDues.reduce((s, d) => s + d.paid, 0);

      setTotals({ due: totalDue, collected: totalCollected });
      setDues(withDues);

      // pagination from backend
setPagination(dueCustomerRes.data.pagination || { currentPage: 1, totalPages: 1, hasPrevPage: false, hasNextPage: false })    })
    .catch(() => {})
    .finally(() => setLoading(false));
}, [page, search]);

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) return alert('Please enter an amount');
    if (!selected.saleId) return alert('No pending sale found for this customer');
    try {
      setSaving(true);
      await saleAPI.addPayment(selected.saleId, {
        amount:      parseFloat(amount),
        paymentMode: payType,
      });

      const paid = parseFloat(amount);

      setDues(p =>
        p.map(d => d._id === selected._id
          ? { ...d, due: Math.max(0, d.due - paid), paid: d.paid + paid }
          : d
        ).filter(d => d.due > 0)
      );

      // Update summary totals
      setTotals(t => ({
        due:       Math.max(0, t.due - paid),
        collected: t.collected + paid,
      }));

      setSelected(null);
      setAmount('');
    } catch (e) {
      alert(e?.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      {/*<PageHeader title="Due Management" subtitle="Track pending payments" />*/}
       {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-200 w-full md:w-[340px] mb-6"
      >
        <Search className="text-gray-400" size={20} />
      
        <input
  type="text"
  placeholder="Search customer..."
  value={search}
  onChange={(e) => {
    setSearch(e.target.value);
    setPage(1); // reset page on search
  }}
  className="bg-transparent outline-none ml-3 w-full text-sm"
/>
      </motion.div>
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className=" font-slab text-xs text-red-400 uppercase tracking-wide font-medium mb-1">Total Due</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totals.due)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className=" font-slab text-xs text-amber-400 uppercase tracking-wide font-medium mb-1">Customers with Due</p>
          <p className="text-2xl font-bold text-amber-600">{dues.length}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="font-slab text-xs text-green-400 uppercase tracking-wide font-medium mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">{fmt(totals.collected)}</p>
        </div>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-slab font-semibold text-[#050a30]">Customer Due List</h3>
        </div>
        <Table headers={['Customer', 'Phone', 'Collected', 'Due Amount', 'Action']}
               empty={dues.length === 0 && <Empty
        icon={<CheckCircle2 size={40} className=" ml-[460px]  text-green-500" />}
        message="No dues pending!"
        />}>
          {dues.map(d => (
            <Tr key={d._id}>
              <Td><span className="font-semibold">{d.customerName}</span></Td>
              <Td className="text-gray-500">{d.phone}</Td>
              <Td className="text-green-600 font-medium">{fmt(d.paid)}</Td>
              <Td><span className="font-bold text-red-500">{fmt(d.due)}</span></Td>
              <Td>
                <Btn variant="success" className="text-xs py-1 px-3"
                     onClick={() => { setSelected(d); setAmount(''); }}>
                   Pay
                </Btn>
              </Td>
            </Tr>
          ))}
        </Table>
        
      </Card>
      <div className="flex items-center mt-10 justify-between">
          <p className=" font-sans text-sm text-gray-500">
            Page {pagination.currentPage || 1} of {pagination.totalPages || 1}

          </p>

          <div className="flex gap-2">
            <button
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => p - 1)}
              className=" font-sans px-3 py-1 border rounded  cursor-pointer disabled:opacity-50 bg-[#050A30] text-[#f5f3ee]"
            >
              Prev
            </button>

            <button
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className=" font-sans px-3 py-1 border rounded  text-[#f5f3ee] bg-[#050A30] cursor-pointer disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

      {/* Payment Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Accept Payment">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#f5f3ee] rounded-xl p-4">
              <p className=" font-slab text-xs text-gray-500 mb-1">Customer</p>
              <p className="font-semibold text-[#050a30]">{selected.customerName}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-red-500 font-medium">Due: {fmt(selected.due)}</span>
                <span className="font-slab text-green-600">Collected: {fmt(selected.paid)}</span>
              </div>
              {!selected.saleId && (
                <p className=" font-slab text-xs text-amber-500 mt-2"> No pending sale found</p>
              )}
            </div>
            <Input label="Payment Amount (₹) *" type="number" value={amount}
                   onChange={e => setAmount(e.target.value)} placeholder="Enter amount" />
            <div className="flex flex-col gap-1.5">
              <label className=" font-slab text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Mode</label>
              <select value={payType} onChange={e => setPayType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#050a30]">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="ghost" onClick={() => setSelected(null)}>Cancel</Btn>
              <Btn variant="success" onClick={handlePayment} disabled={saving}>
                {saving ? 'Saving...' : '✅ Confirm Payment'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


