import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Download, FileText } from 'lucide-react';
import { saleAPI, invoiceAPI } from '../../services/api';
import { fmtINR, fmtDate } from '../../utils/helper';
import Badge   from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function Invoices() {
  const [sales, setSales]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    saleAPI.getAll({ limit: 100 })
      .then(r => setSales(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
  setCurrentPage(1);
}, [search, status]);

  const filtered = sales.filter(s => {
    const matchSearch =
      s.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'all' || s.status === status;
    return matchSearch && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedSales = filtered.slice(
    startIndex,
    startIndex + itemsPerPage
  );


  const handleDownload = async (id) => {
  try {
    const token = localStorage.getItem('jwtToken');

    const response = await fetch(
      `/api/invoice/${id}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = `invoice-${id}.pdf`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert('Invoice download failed');
  }
};
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search invoice or customer..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all','paid','partial','due'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                status === s ? 'bg-[#050a30] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>{['Invoice No.','Customer','Date','Type','Total','Paid','Due','Status','Actions'].map(h=>(
                <th key={h} className="table-th whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9}><Spinner center /></td></tr>
              : filtered.length === 0
                ? <tr><td colSpan={9} className="text-center py-14 text-sm text-gray-400">
                    <FileText size={30} className="mx-auto mb-2 opacity-30"/>Not any invoice</td></tr>
              : paginatedSales.map(sale=>(
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-xs font-semibold text-[#050a30]">{sale.invoiceNumber}</td>
                    <td className="table-td font-medium">{sale.customer?.name}</td>
                    <td className="table-td text-xs whitespace-nowrap">{fmtDate(sale.saleDate)}</td>
                    <td className="table-td">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sale.isGst?'bg-blue-50 text-blue-600':'bg-gray-100 text-gray-600'}`}>
                        {sale.isGst?'GST':'Non-GST'}
                      </span>
                    </td>
                    <td className="table-td font-medium">{fmtINR(sale.totalAmount)}</td>
                    <td className="table-td text-green-600">{fmtINR(sale.paidAmount)}</td>
                    <td className={`table-td font-medium ${parseFloat(sale.dueAmount)>0?'text-red-500':'text-gray-400'}`}>{fmtINR(sale.dueAmount)}</td>
                    <td className="table-td"><Badge status={sale.status}/></td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/invoice/${sale.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="View"><Eye size={15}/></Link>
                      <button
                        onClick={() => handleDownload(sale.id)}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
                        title="Download"
                      >
                        <Download size={15}/>
                      </button>                      
                      </div>
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
          Page {currentPage.currentPage || 1} of {currentPage.totalPages || 1}
        </p>

        <div className="flex gap-2">
          <button
            disabled={!currentPage.hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
            className=" font-sans px-3 py-1 bg-[#050A30] text-[#f5f3ee] border rounded cursor-pointer disabled:opacity-50 "
          >
            Prev
          </button>

          <button
            disabled={!currentPage.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className=" font-sans px-3 py-1 bg-[#050A30] text-[#f5f3ee]  border rounded cursor-pointer disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
        


    </div>
  );
}
