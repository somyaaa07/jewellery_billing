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

// ── Single Item Total ────────────────────────
// Used by both item cards (live display) and calcBill (summary)
// so both always show identical numbers
export const calcItemTotal = (item, goldRate, silverRate) => {
  const metalType = (item.metalType || 'gold').toLowerCase();
  const net       = calcNetWeight(item.grossWeight, item.stoneWeight);

  const activeRate =
    metalType === 'gold'
      ? parseFloat(goldRate  || 0)
      : parseFloat(silverRate || 0);

  const metalValue   = net * activeRate;
  const stoneCharges = parseFloat(item.stoneCharges || 0);

  let making = 0;

  if (metalType === 'silver') {
    // Silver → flat ₹ amount entered by user
    making = parseFloat(item.makingCharges || 0);
  } else {
    // Gold → percentage of metalValue
    // Frontend stores the % value in item.makingCharges
    // (payload transforms it to makingChargesPercent before sending to backend)
    const pct = parseFloat(
      item.makingChargesPercent !== undefined &&
      item.makingChargesPercent !== null &&
      item.makingChargesPercent !== ''
        ? item.makingChargesPercent
        : item.makingCharges || 0
    );
    making = (metalValue * pct) / 100;
  }

  return {
    metalValue:  +metalValue.toFixed(2),
    makingValue: +making.toFixed(2),
    stoneCharges: +stoneCharges.toFixed(2),
    total:       +(metalValue + making + stoneCharges).toFixed(2),
  };
};

// ── Billing Summary ──────────────────────────
export const calcBill = ({
  items = [],
  goldRate = 0,
  silverRate = 0,
  isGst = false,
  exchangeItems = [],
  discount = 0,
  paid = 0,
}) => {
  let subtotal = 0;

  items.forEach(item => {
    const { total } = calcItemTotal(item, goldRate, silverRate);
    subtotal += total;
  });

  const cgst = isGst ? +(subtotal * 0.015).toFixed(2) : 0;
  const sgst = isGst ? +(subtotal * 0.015).toFixed(2) : 0;

  const exchangeValue = exchangeItems.reduce(
    (s, ex) => s + parseFloat(ex.grossWeight || 0) * parseFloat(ex.exchangeRate || 0),
    0
  );

  const totalBeforeRound = +(
    subtotal + cgst + sgst - exchangeValue - parseFloat(discount || 0)
  ).toFixed(2);

  const total    = Math.round(totalBeforeRound);
  const roundOff = parseFloat((total - totalBeforeRound).toFixed(2));
  const due      = +Math.max(0, total - parseFloat(paid || 0)).toFixed(2);
  const status   = due <= 0 ? 'paid' : parseFloat(paid) > 0 ? 'partial' : 'due';

  return {
    subtotal: +subtotal.toFixed(2),
    cgst,
    sgst,
    exchangeValue: +exchangeValue.toFixed(2),
    roundOff,
    total,
    due,
    status,
  };
};

// ── Status Badge Color ───────────────────────
export const statusColor = (s) =>
  ({
    paid:    'bg-green-50 text-green-700 border border-green-200',
    partial: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    due:     'bg-red-50 text-red-600 border border-red-200',
    active:  'bg-green-50 text-green-700 border border-green-200',
    expired: 'bg-red-50 text-red-600 border border-red-200',
  }[s] || 'bg-gray-50 text-gray-600 border border-gray-200');