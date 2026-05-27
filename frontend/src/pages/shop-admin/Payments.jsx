// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { saleAPI } from '../../services/api';
// import { Search, } from 'lucide-react';

// import {  Card, Badge, Table, Tr, Td, Spinner, Empty } from '../../components/ui';

// const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');

// const TYPE_COLORS = {
//   cash:   'green',
//   upi:    'blue',
//   card:   'yellow',
//   cheque: 'gray',
//   credit: 'red',
// };

// const STATUS_META = {
//   paid:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid'    },
//   partial: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Partial' },
//   due:     { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Due'     },
// };

// function SaleStatusBadge({ status }) {
//   const s = STATUS_META[status] || STATUS_META.due;
//   return (
//     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${s.bg} ${s.text}`}>
//       <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
//       {s.label}
//     </span>
//   );
// }

// export function PaymentsPage() {
//   const [sales,   setSales]   = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();
//   const [search,  setSearch]      = useState('');
//   const [page, setPage] = useState(1);
//   const [pagination, setPagination] = useState({});

  
//   useEffect(() => {
//     saleAPI.getAll()
//       .then(r => {
//         const all = r.data?.data || r.data || [];
//         // only sales where at least one payment exists
//         setSales(all.filter(s => parseFloat(s.paidAmount || 0) > 0));
//       })
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) return <Spinner />;

//   /*  Summary stats  */
//   const totalReceived = sales.reduce((s, x) => s + parseFloat(x.paidAmount  || 0), 0);
//   const totalDue      = sales.reduce((s, x) => s + parseFloat(x.dueAmount   || 0), 0);
//   const totalCash     = sales
//     .filter(s => (s.paymentMode || '').toLowerCase() === 'cash')
//     .reduce((s, x) => s + parseFloat(x.paidAmount || 0), 0);
//   const totalDigital  = sales
//     .filter(s => ['upi','card'].includes((s.paymentMode || '').toLowerCase()))
//     .reduce((s, x) => s + parseFloat(x.paidAmount || 0), 0);

//   return (
//     <div className="fade-in">
//    <div className="relative flex-1 max-w-sm mb-8">
//           <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input
//               className="input-field pl-9"
//               placeholder="Search by name or phone..."
//               value={search}
//               onChange={(e) => {
//               setSearch(e.target.value);
//               setPage(1);
//           }}
//         />
//         </div>
      
//       {/* ── Stat cards ── */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
//         <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
//           <p className="font-slab text-[10px] text-gray-400 uppercase tracking-widest mb-1">Total Received</p>
//           <p className="text-sm md:text-sm lg:text-xl font-bold text-[#050a30]">{fmt(totalReceived)}</p>
//         </div>
//         <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
//           <p className="font-slab text-[10px] text-gray-400 uppercase tracking-widest mb-1">Cash Payments</p>
//           <p className="text-sm md:text-sm lg:text-xl  font-bold text-emerald-600">{fmt(totalCash)}</p>
//         </div>
//         <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
//           <p className="font-slab text-[10px] text-gray-400 uppercase tracking-widest mb-1">UPI / Digital</p>
//           <p className="text-sm md:text-sm lg:text-xl  font-bold text-blue-600">{fmt(totalDigital)}</p>
//         </div>
//         <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
//           <p className="font-slab text-[10px] text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
//           <p className="text-sm md:text-base lg:text-xl font-bold text-rose-600">{fmt(totalDue)}</p>
//         </div>
//       </div>

//       {/* ── Table ── */}
//       <Card>
//         <Table
//           headers={['Invoice', 'Customer', 'Paid', 'Due', 'Mode', 'Status', '']}
//           empty={sales.length === 0 && <Empty />}
//         >
//           {sales.map(sale => {
//             /* how many payment transactions this sale has */
//             const txCount = (sale.payments || []).length;

//             return (
//               <Tr
//                 key={sale.id}
//                 onClick={() => navigate(`/sales/${sale.id}/payments`)}
//                 className="cursor-pointer hover:bg-[#050a30]/[0.02] transition-colors group"
//               >
//                 {/* Invoice */}
//                 <Td className="font-mono text-xs font-semibold text-[#050a30]">
//                   {sale.invoiceNumber}
//                 </Td>

//                 {/* Customer */}
//                 <Td>
//                   <div>
//                     <p className="font-semibold text-gray-800">{sale.customer?.name || '—'}</p>
//                     {sale.customer?.phone && (
//                       <p className="text-[11px] text-gray-400">{sale.customer.phone}</p>
//                     )}
//                   </div>
//                 </Td>

//                 {/* Paid */}
//                 <Td className="font-bold text-emerald-600">{fmt(sale.paidAmount)}</Td>

//                 {/* Due */}
//                 <Td className={`font-semibold ${parseFloat(sale.dueAmount) > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
//                   {fmt(sale.dueAmount)}
//                 </Td>

//                 {/* Mode */}
//                 <Td>
//                   <Badge
//                     label={(sale.paymentMode || 'cash').toUpperCase()}
//                     color={TYPE_COLORS[sale.paymentMode] || 'gray'}
//                   />
//                 </Td>

//                 {/* Status */}
//                 <Td><SaleStatusBadge status={sale.status} /></Td>

//                 {/* Transaction count + arrow */}
//                 <Td>
//                   <div className="flex items-center justify-end gap-2">
//                     {txCount > 0 && (
//                       <span className="bg-[#050a30]/10 text-[#050a30] text-[10px] font-bold px-2 py-0.5 rounded-full">
//                         {txCount} txn{txCount > 1 ? 's' : ''}
//                       </span>
//                     )}
//                     <span className="text-gray-300 group-hover:text-[#050a30] group-hover:translate-x-0.5 transition-all text-sm">
//                       →
//                     </span>
//                   </div>
//                 </Td>
//               </Tr>
//             );
//           })}
//         </Table>
//       </Card>

//        {/* Pagination UI */}
//       <div className="flex items-center justify-between">
//         <p className=" font-sans text-sm text-gray-500">
//           Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
//         </p>

//         <div className="flex gap-2">
//           <button
//             disabled={!pagination.hasPrevPage}
//             onClick={() => setPage((p) => p - 1)}
//             className=" font-sans px-3 py-1 bg-[#050A30] text-[#f5f3ee] border rounded cursor-pointer disabled:opacity-50 "
//           >
//             Prev
//           </button>

//           <button
//             disabled={!pagination.hasNextPage}
//             onClick={() => setPage((p) => p + 1)}
//             className=" font-sans px-3 py-1 bg-[#050A30] text-[#f5f3ee]  border rounded cursor-pointer disabled:opacity-50"
//           >
//             Next
//           </button>
//         </div>
//       </div>

//     </div>
//   );
// }

// export default PaymentsPage;


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saleAPI } from '../../services/api';
import { Search } from 'lucide-react';

import { Card, Badge, Table, Tr, Td, Spinner, Empty } from '../../components/ui';

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');

const TYPE_COLORS = {
  cash: 'green',
  upi: 'blue',
  card: 'yellow',
  cheque: 'gray',
  credit: 'red',
};

const STATUS_META = {
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid' },
  partial: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Partial' },
  due: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Due' },
};

function SaleStatusBadge({ status }) {
  const s = STATUS_META[status] || STATUS_META.due;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function PaymentsPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const navigate = useNavigate();

  // API CALL
  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await saleAPI.getAll({
        page,
        limit: 10,
        search,
      });

      const data = res.data?.data || [];

      setSales(data.filter(s => parseFloat(s.paidAmount || 0) > 0));
      setPagination(res.data?.pagination || {});
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  //  debounce search & pagination
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 400);

    return () => clearTimeout(timer);
  }, [page, search]);

  if (loading) return <Spinner />;

  // pagination fix
  const currentPage = pagination.currentPage || pagination.page || 1;
  const totalPages = Math.ceil(
    (pagination.total || 0) / (pagination.limit || 10)
  );

  /* stats */
  const totalReceived = sales.reduce((s, x) => s + Number(x.paidAmount || 0), 0);
  const totalDue = sales.reduce((s, x) => s + Number(x.dueAmount || 0), 0);

  const totalCash = sales
    .filter(s => (s.paymentMode || '').toLowerCase() === 'cash')
    .reduce((s, x) => s + Number(x.paidAmount || 0), 0);

  const totalDigital = sales
    .filter(s => ['upi', 'card'].includes((s.paymentMode || '').toLowerCase()))
    .reduce((s, x) => s + Number(x.paidAmount || 0), 0);

  return (
    <div className="fade-in">

      {/* SEARCH */}
      <div className="relative max-w-sm mb-8">
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

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className="p-4 bg-white rounded-xl">Total: {fmt(totalReceived)}</div>
        <div className="p-4 bg-white rounded-xl">Cash: {fmt(totalCash)}</div>
        <div className="p-4 bg-white rounded-xl">UPI: {fmt(totalDigital)}</div>
        <div className="p-4 bg-white rounded-xl">Due: {fmt(totalDue)}</div>
      </div>

      {/* TABLE */}
      <Card>
        <Table
          headers={['Invoice', 'Customer', 'Paid', 'Due', 'Mode', 'Status', '']}
          empty={!sales.length && <Empty />}
        >
          {sales.map((sale) => {
            const txCount = sale.payments?.length || 0;

            return (
              <Tr
                key={sale.id}
                onClick={() => navigate(`/sales/${sale.id}/payments`)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <Td className="font-mono text-xs">{sale.invoiceNumber}</Td>

                <Td>
                  <p className="font-semibold">{sale.customer?.name || '—'}</p>
                  <p className="text-xs text-gray-400">{sale.customer?.phone}</p>
                </Td>

                <Td className="text-emerald-600 font-bold">{fmt(sale.paidAmount)}</Td>

                <Td className={Number(sale.dueAmount) > 0 ? 'text-red-500 font-bold' : 'text-gray-400'}>
                  {fmt(sale.dueAmount)}
                </Td>

                <Td>
                  <Badge
                    label={(sale.paymentMode || 'cash').toUpperCase()}
                    color={TYPE_COLORS[sale.paymentMode] || 'gray'}
                  />
                </Td>

                <Td>
                  <SaleStatusBadge status={sale.status} />
                </Td>

                <Td className="text-right text-xs text-gray-500">
                  {txCount} txn
                </Td>
              </Tr>
            );
          })}
        </Table>
      </Card>

      {/* PAGINATION */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </p>

        <div className="flex gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 bg-[#050A30] text-[#f5f3ee] rounded disabled:opacity-40"
          >
            Prev
          </button>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 bg-[#050A30] text-[#f5f3ee] rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );
}

export default PaymentsPage;