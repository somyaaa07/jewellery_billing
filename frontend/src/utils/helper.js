// ── Currency Format ──────────────────────────
export const fmtINR = (n) =>
  '₹' + parseFloat(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

// ── Date Format ──────────────────────────────
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : '—';

// ── Weight Format ────────────────────────────
export const fmtWt = (n) => parseFloat(n || 0).toFixed(3) + 'g';

// ── Net Weight Calc ──────────────────────────
export const calcNetWeight = (gross, stone) =>
  Math.max(0, parseFloat(gross || 0) - parseFloat(stone || 0));



// ── Billing Summary ──────────────────────────
export const calcBill = ({
  items = [],
  goldRate = 0,
  isGst = false,
  exchangeItems = [],
  discount = 0,
  paid = 0
}) => {

  let subtotal = 0;

  items.forEach(item => {

    const net = calcNetWeight(
      item.grossWeight,
      item.stoneWeight
    );

    // Gold value
    const goldValue =
      net * parseFloat(goldRate || 0);

    // Making %
    const makingPercent =
      parseFloat(item.makingCharges || 0);

    // Making ₹ value
    const makingValue =
      goldValue * (makingPercent / 100);

    // Stone charges
    const stoneCharges =
      parseFloat(item.stoneCharges || 0);

    // Final item total
    const total =
      goldValue +
      makingValue +
      stoneCharges;

    subtotal += total;
  });
 

  const cgst = isGst ? +(subtotal * 0.015).toFixed(2) : 0;
  const sgst = isGst ? +(subtotal * 0.015).toFixed(2) : 0;

  const exchangeValue = exchangeItems.reduce((s, ex) =>
    s + parseFloat(ex.grossWeight || 0) * parseFloat(ex.exchangeRate || 0), 0);

  const total  = +(subtotal + cgst + sgst - exchangeValue - parseFloat(discount)).toFixed(2);
  const due    = +Math.max(0, total - parseFloat(paid)).toFixed(2);
  const status = due <= 0 ? 'paid' : parseFloat(paid) > 0 ? 'partial' : 'due';

  return { subtotal: +subtotal.toFixed(2), cgst, sgst, exchangeValue: +exchangeValue.toFixed(2), total, due, status };
};

// ── Status badge color ───────────────────────
export const statusColor = (s) => ({
  paid:    'bg-green-50 text-green-700 border border-green-200',
  partial: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  due:     'bg-red-50 text-red-600 border border-red-200',
  active:  'bg-green-50 text-green-700 border border-green-200',
  expired: 'bg-red-50 text-red-600 border border-red-200',
}[s] || 'bg-gray-50 text-gray-600 border border-gray-200');