import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { saleAPI, invoiceAPI } from '../../services/api';
import { fmtINR, fmtDate, fmtWt } from '../../utils/helper';
import { ArrowLeft, Printer, Download,MessageCircle,Mail } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import Badge   from '../../components/ui/Badge';

export default function InvoiceView() {
  const { id } = useParams();
  const [sale, setSale]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saleAPI.getById(id)
      .then(r => setSale(r.data.data))
      .finally(() => setLoading(false));
  }, [id]);

const printRef = useRef();


const handlePrint = useReactToPrint({
  contentRef: printRef,
});
  if (loading) return <Spinner center size="lg" />;
  if (!sale)   return <p className="text-sm text-gray-400 p-6">Invoice not found.</p>;

  const shop = sale.shop || {};
  const c    = sale.customer || {};

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

// Share WhatsApp
const handleWhatsApp = () => {
  const invoiceUrl =
  import.meta.env.MODE === "development"
    ? `${import.meta.env.VITE_API_URL}/api/invoice/${sale.id}/download`
    : `https://your-domain.com/api/invoice/${sale.id}/download`;

  const message = `Hello, your invoice is ready:\n${invoiceUrl}`;

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
};



//Add Mail 

const handleEmail = async () => {
  try {
    const invoiceUrl =
      window.location.origin + `/api/invoice/${sale.id}/download`;

    await fetch("/api/send-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: c.email, // uses customer email from your existing data
        invoiceUrl,
      }),
    });

    alert("Email sent successfully");
  } catch (err) {
    console.error(err);
    alert("Email failed");
  }
};



  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Link to="/invoices" className="btn-secondary"><ArrowLeft size={15}/>Back</Link>
        <div className="flex-1" />
        <button onClick={handlePrint} className="btn-secondary"><Printer size={15}/>Print</button>

        <button
          onClick={handleEmail}
          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
          title="Email"
        >
          <Mail  size={15}  />
        </button>


        <button
            onClick={handleWhatsApp}
            className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
            title="WhatsApp"
            >
            <MessageCircle size={15} /> 
        </button>
        <button
          onClick={() => handleDownload(sale.id)}
          className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
          title="Download"
          >
          <Download size={15}/>
        </button>     
        </div>

      {/* Invoice */}
      <div ref={printRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#050a30] px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">{shop.name || 'Jewelry Shop'}</h1>
              {shop.address && <p className="text-white/60 text-xs mt-1">{shop.address}{shop.city ? `, ${shop.city}` : ''}</p>}
              {shop.phone   && <p className="text-white/60 text-xs">{shop.phone}</p>}
              {/* {shop.gstin   && <p className="text-white/60 text-xs">GSTIN: {shop.gstin}</p>} */}
              {sale.isGst && shop.gstin && (
                <p className="text-white/60 text-xs">
                  GSTIN: {shop.gstin}
                </p>
              )}
           
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50 uppercase tracking-wider">{sale.isGst ? 'TAX INVOICE' : 'Invoice'}</p>
              <p className="text-lg font-bold mt-1">{sale.invoiceNumber}</p>
              <p className="text-white/60 text-xs mt-1">{fmtDate(sale.saleDate)}</p>
              <p className="text-white/60 text-xs">Gold Rate: ₹{sale.goldRate}/g</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Bill to */}
          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-[#050a30]">{c.name}</p>
            {c.phone   && <p className="text-sm text-gray-500">{c.phone}</p>}
            {c.address && <p className="text-sm text-gray-500">{c.address}</p>}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Items</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Item','Purity','Gross','Stone','Net','Making','Total'].map(h=>(
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sale.items||[]).map((it,i)=>(
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3 font-medium text-[#050a30]">{it.itemName}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{it.purity}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{fmtWt(it.grossWeight)}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{fmtWt(it.stoneWeight)}</td>
                    <td className="py-2.5 pr-3 font-medium">{fmtWt(it.netWeight)}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{fmtINR(it.makingCharges)}</td>
                    <td className="py-2.5 font-semibold text-[#050a30]">{fmtINR(it.itemTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Exchange */}
          {sale.exchangeItems?.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Exchange Gold</p>
              {sale.exchangeItems.map((ex,i)=>(
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-green-700">{ex.itemDescription} ({ex.purity}) — {fmtWt(ex.grossWeight)} @ ₹{ex.exchangeRate}/g</span>
                  <span className="font-semibold text-green-700">-{fmtINR(ex.exchangeValue)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtINR(sale.subtotal)}</span></div>
              {sale.isGst && <>
                <div className="flex justify-between"><span className="text-gray-500">CGST @ 1.5%</span><span>{fmtINR(sale.cgstAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST @ 1.5%</span><span>{fmtINR(sale.sgstAmount)}</span></div>
              </>}
              {parseFloat(sale.exchangeValue)>0 && (
                <div className="flex justify-between"><span className="text-gray-500">Exchange (−)</span><span className="text-green-600">−{fmtINR(sale.exchangeValue)}</span></div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base text-[#050a30]">
                <span>Total</span><span>{fmtINR(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-medium"><span>Paid</span><span>{fmtINR(sale.paidAmount)}</span></div>
              <div className="flex justify-between text-red-500 font-semibold"><span>Due</span><span>{fmtINR(sale.dueAmount)}</span></div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Badge status={sale.status} label={sale.status === 'paid' ? '✓ Fully Paid' : sale.status === 'partial' ? 'Partially Paid' : 'Payment Due'} />
            <p className="text-xs text-gray-400">Thank you for your purchase!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
