// =============================================
// MODULE: services/invoiceService.js
// PREMIUM JEWELRY INVOICE — PDFKit
//
// 2 INVOICE TYPES:
//   1. GST Invoice  — CGST + SGST shown, GSTIN required
//   2. Non-GST Invoice — Simple bill, no tax breakdown
//
// DESIGN: Luxury Indian jewellery house aesthetic
//   - Deep navy (#050A30) + warm gold (#B8973A) palette
//   - Cormorant-inspired elegant section headers
//   - Gold accent rules, ivory alternating rows
//   - Exchange gold framed section
//   - Payment stat summary + history timeline
//
// LIBRARY: PDFKit  →  npm install pdfkit
//
// FLOW:
//   Controller → invoiceService.generateInvoicePDF(saleId, shopId)
//   → PDF Buffer return hota hai
//   → Controller res.send() se browser ko bhejta hai
// =============================================

import PDFDocument from 'pdfkit';
import { Sale, SaleItem, Customer, Shop, Payment, ExchangeItem } from '../models/index.js';

// ── BRAND TOKENS ────────────────────────────────
const C = {
  navy:        '#050A30',
  navyMid:     '#0D1645',
  gold:        '#B8973A',
  goldLight:   '#E8D5A0',
  goldLighter: '#F7F0DC',
  ivory:       '#FAF8F4',
  ink:         '#1A1A2E',
  muted:       '#6B6880',
  border:      '#DDD5B8',
  rowAlt:      '#FDFBF5',
  success:     '#1A6B3A',
  warning:     '#7A4A10',
  danger:      '#7A1A1A',
  white:       '#FFFFFF',
};

const FOOTER_SPACE = 80;

// ── PAGE GEOMETRY ────────────────────────────────
const PAGE = {
  width:   595,
  height:  842,
  margin:  40,
  inner:   515,
};

// ── COLUMN MAP for items table ───────────────────
const COL = {
  item:    40,
  purity:  195,
  gross:   245,
  stone:   295,
  net:     345,
  making:  395,
  total:   470,
};

// ═══════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════
export const generateInvoicePDF = async (saleId, shopId) => {

  // ── Fetch data ──────────────────────────────
  const sale = await Sale.findOne({
    where:   { id: saleId, shopId },
    include: [
      { model: SaleItem,     as: 'items' },
      { model: ExchangeItem, as: 'exchangeItems' },
      { model: Customer,     as: 'customer' },
      { model: Payment,      as: 'payments', order: [['paymentDate', 'ASC']] },
    ],
  });

  if (!sale) throw new Error('Sale not found');

  const shop = await Shop.findByPk(shopId);

  // ── Create PDFDocument ──────────────────────
  // const doc = new PDFDocument({
  //   size:    'A4',
  //   margin:  PAGE.margin,
  //   info: {
  //     Title:   `Invoice  ${sale.invoiceNumber}`,
  //     Author:  shop.name,
  //     Subject: 'Jewelry Invoice',
  //   },
  // });

 const doc = new PDFDocument({
  size: 'A4',
  margin: PAGE.margin,
  info: {
    Title: sale.isGst
      ? `Invoice ${sale.invoiceNumber}`
      : `Estimate Price ${sale.invoiceNumber}`,

    Author: shop.name,

    Subject: sale.isGst
      ? 'Jewelry Invoice'
      : 'Jewelry Estimate',
  },
});
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  const pdfPromise = new Promise((resolve, reject) => {
    doc.on('end',   ()  => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));
  });

  // ── Draw ────────────────────────────────────
  if (sale.isGst) {
    drawGSTInvoice(doc, sale, shop);
  } else {
    drawNonGSTInvoice(doc, sale, shop);
  }

  doc.end();
  return pdfPromise;
};


// ═══════════════════════════════════════════════
// GST INVOICE
// ═══════════════════════════════════════════════
const drawGSTInvoice = (doc, sale, shop) => {
  let y = drawHeader(doc, shop, sale, 'TAX INVOICE');
  y = drawGoldStrip(doc, sale, shop, y, true);
  y = drawBillingBlock(doc, sale, shop, y);
  y = drawItemsTable(doc, sale.items, y);

  if (sale.exchangeItems && sale.exchangeItems.length > 0) {
    y = drawExchangeSection(doc, sale.exchangeItems, y);
  }

  y = drawGSTSummary(doc, sale, y);
  y = drawPaymentSection(doc, sale, y);
  // drawFooter(doc, shop);
};

// ═══════════════════════════════════════════════
// NON-GST INVOICE
// ═══════════════════════════════════════════════
const drawNonGSTInvoice = (doc, sale, shop) => {
  let y = drawHeader(doc, shop, sale, 'Estimate Price');
  y = drawGoldStrip(doc, sale, shop, y, false);
  y = drawBillingBlock(doc, sale, shop, y);
  y = drawItemsTable(doc, sale.items, y);

  if (sale.exchangeItems && sale.exchangeItems.length > 0) {
    y = drawExchangeSection(doc, sale.exchangeItems, y);
  }

  y = drawSimpleSummary(doc, sale, y);
  y = drawPaymentSection(doc, sale, y);
  // drawFooter(doc, shop);
};

// ═══════════════════════════════════════════════
// SECTION DRAWERS
// ═══════════════════════════════════════════════

// ── HEADER ──────────────────────────────────────
const drawHeader = (doc, shop, sale, invoiceType) => {
  const H = 75;

  doc.rect(PAGE.margin, PAGE.margin, PAGE.inner, H).fill(C.navy);

  doc.save();
  doc.rect(PAGE.margin, PAGE.margin, PAGE.inner, H).clip();
  doc.moveTo(PAGE.width - PAGE.margin - 140, PAGE.margin)
     .lineTo(PAGE.width - PAGE.margin, PAGE.margin)
     .lineTo(PAGE.width - PAGE.margin, PAGE.margin + H)
     .lineTo(PAGE.width - PAGE.margin - 80, PAGE.margin + H)
     .fill('rgba(184,151,58,0.12)');
  doc.restore();

  doc.moveTo(PAGE.margin, PAGE.margin + H - 1)
     .lineTo(PAGE.width - PAGE.margin, PAGE.margin + H - 1)
     .lineWidth(0.8)
     .stroke(C.gold);

  doc.fontSize(22)
     .fillColor('#F5F2EA')
     .font('Helvetica-Bold')
     .text(shop.name.toUpperCase(), PAGE.margin + 12, PAGE.margin + 12, {
       width: PAGE.inner - 180,
       lineBreak: false,
     });

  doc.fontSize(7.5)
     .fillColor(C.goldLight)
     .font('Helvetica')
     .text(
       [shop.address, shop.city, shop.phone].filter(Boolean).join('  ·  '),
       PAGE.margin + 12,
       PAGE.margin + 38,
       { width: PAGE.inner - 180 }
     );

  doc.fontSize(10)
     .fillColor(C.gold)
     .font('Helvetica-Bold')
     .text(invoiceType, PAGE.width - PAGE.margin - 170, PAGE.margin + 12, {
       width: 158, align: 'right',
     });

  doc.fontSize(15)
     .fillColor('#F5F2EA')
     .font('Helvetica-Bold')
     .text(sale.invoiceNumber, PAGE.width - PAGE.margin - 170, PAGE.margin + 27, {
       width: 158, align: 'right',
     });

  doc.fontSize(8.5)
     .fillColor('rgba(245,242,234,0.55)')
     .font('Helvetica')
     .text(formatDate(sale.saleDate), PAGE.width - PAGE.margin - 170, PAGE.margin + 48, {
       width: 158, align: 'right',
     });

  return PAGE.margin + H + 1;
};

// ── GOLD RATE STRIP ──────────────────────────────
const drawGoldStrip = (doc, sale, shop, y, showGstin) => {
  const H = 22;

  doc.rect(PAGE.margin, y, PAGE.inner, H).fill(C.goldLighter);

  doc.fontSize(8).fillColor(C.muted).font('Helvetica');
  doc.text('Gold Rate', PAGE.margin + 12, y + 7);
  doc.fontSize(9).fillColor(C.ink).font('Helvetica-Bold');
  doc.text(`Rs.${fmtAmt(sale.goldRate)}/g`, PAGE.margin + 60, y + 6);

  if (showGstin && shop.gstin) {
    const badgeW = 155;
    const badgeX = PAGE.width - PAGE.margin - badgeW;
    doc.rect(badgeX, y, badgeW, H).fill(C.navy);
    doc.fontSize(7.5).fillColor(C.goldLight).font('Helvetica-Bold');
    doc.text(`GSTIN: ${shop.gstin}`, badgeX + 8, y + 8, { width: badgeW - 16 });
  }

  doc.moveTo(PAGE.margin, y + H)
     .lineTo(PAGE.width - PAGE.margin, y + H)
     .lineWidth(0.4)
     .stroke(C.border);

  return y + H + 1;
};

// ── BILLING BLOCK ────────────────────────────────
const drawBillingBlock = (doc, sale, shop, y) => {
  const startY = y + 14;
  const customer = sale.customer;

  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('BILL TO', PAGE.margin, startY, { characterSpacing: 1.5 });

  doc.fontSize(14).fillColor(C.ink).font('Helvetica-Bold')
     .text(customer.name, PAGE.margin, startY + 11);

  doc.fontSize(8.5).fillColor(C.muted).font('Helvetica');
  let detY = startY + 28;
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, PAGE.margin, detY);
    detY += 12;
  }
  if (customer.address) {
    doc.text(`Address: ${customer.address}`, PAGE.margin, detY, { width: 240 });
    detY += 12;
  }

  const rX = 360;
  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('INVOICE DETAILS', rX, startY, { characterSpacing: 1.5, width: 195, align: 'right' });

  const metaRows = [
    [`Invoice No.`, sale.invoiceNumber],
    [`Date`,        formatDate(sale.saleDate)],
    [`Gold Rate`,   `Rs.${fmtAmt(sale.goldRate)}/g`],
  ];

  let mY = startY + 11;
  metaRows.forEach(([label, val]) => {
    doc.fontSize(8).fillColor(C.muted).font('Helvetica')
       .text(label, rX, mY, { width: 95 });
    doc.fontSize(8).fillColor(C.ink).font('Helvetica-Bold')
       .text(val, rX + 95, mY, { width: 100, align: 'right' });
    mY += 13;
  });

  const endY = Math.max(detY, mY) + 14;

  doc.moveTo(PAGE.margin, endY)
     .lineTo(PAGE.width - PAGE.margin, endY)
     .lineWidth(0.4)
     .stroke(C.border);

  return endY + 14;
};

// ── ITEMS TABLE ───────────────────────────────────
const drawItemsTable = (doc, items, y) => {
  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('ITEMS PURCHASED', PAGE.margin, y, { characterSpacing: 1.5 });

  y += 12;

  const HEADER_H = 20;

  doc.rect(PAGE.margin, y, PAGE.inner, HEADER_H).fill(C.navy);

  doc.fontSize(7.5).fillColor(C.white).font('Helvetica-Bold');
  doc.text('ITEM',      COL.item,   y + 7);
  doc.text('PURITY',    COL.purity, y + 7, { width: 45, align: 'center' });
  doc.text('GROSS(g)',  COL.gross,  y + 7, { width: 45, align: 'right' });
  doc.text('STONE(g)',  COL.stone,  y + 7, { width: 45, align: 'right' });
  doc.text('NET(g)',    COL.net,    y + 7, { width: 45, align: 'right' });
  doc.text('MAKING',   COL.making, y + 7, { width: 70, align: 'right' });
  doc.text('TOTAL',    COL.total,  y + 7, { width: 85, align: 'right' });

  y += HEADER_H;

  items.forEach((item, idx) => {
    const hasHuid = !!item.huid;
    const ROW_H = hasHuid ? 30 : 22;

    // ── FIX: check page break before each row ──
    y = checkPageBreak(doc, y, ROW_H + 10);

    if (idx % 2 === 1) {
      doc.rect(PAGE.margin, y, PAGE.inner, ROW_H).fill(C.rowAlt);
    }

    const textY = y + (hasHuid ? 5 : 7);

    doc.fontSize(9).fillColor(C.ink).font('Helvetica-Bold')
       .text(item.itemName, COL.item, textY, { width: 145, lineBreak: false });

    if (hasHuid) {
      doc.fontSize(7).fillColor(C.muted).font('Helvetica')
         .text(`HUID: ${item.huid}`, COL.item, textY + 13, { width: 145 });
    }

    const purity = item.purity || '22K';
    const pX = COL.purity + 2;
    const pW = 38;
    doc.roundedRect(pX, y + 6, pW, 14, 3).fill(C.goldLighter);
    doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
       .text(purity, pX, y + 10, { width: pW, align: 'center' });

    doc.fontSize(8.5).fillColor(C.ink).font('Helvetica');
    doc.text(parseFloat(item.grossWeight).toFixed(3), COL.gross,  textY, { width: 45, align: 'right' });
    doc.text(parseFloat(item.stoneWeight).toFixed(3), COL.stone,  textY, { width: 45, align: 'right' });
    doc.text(parseFloat(item.netWeight).toFixed(3),   COL.net,    textY, { width: 45, align: 'right' });
    doc.text(`Rs.${fmtAmt(item.makingCharges)}`,      COL.making, textY, { width: 70, align: 'right' });

    doc.fontSize(9.5).fillColor(C.navy).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(item.itemTotal)}`, COL.total, textY, { width: 85, align: 'right' });

    doc.moveTo(PAGE.margin, y + ROW_H)
       .lineTo(PAGE.width - PAGE.margin, y + ROW_H)
       .lineWidth(0.3)
       .stroke('rgba(184,151,58,0.2)');

    y += ROW_H;
  });

  return y + 12;
};

// ── EXCHANGE SECTION ──────────────────────────────
const drawExchangeSection = (doc, exchangeItems, y) => {
  const PADDING  = 10;
  const rowCount = exchangeItems.length;
  const boxH     = 20 + 18 + rowCount * 18 + PADDING;

  // ── FIX: check page break with actual box height ──
  y = checkPageBreak(doc, y, boxH + 20);

  doc.rect(PAGE.margin, y, PAGE.inner, boxH)
     .fill(C.goldLighter)
     .strokeColor(C.border)
     .lineWidth(0.5)
     .stroke();

  doc.rect(PAGE.margin, y, 3, boxH).fill(C.gold);

  const iX = PAGE.margin + 14;

  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('EXCHANGE GOLD DETAILS', iX, y + PADDING, { characterSpacing: 1.5 });

  const tHY = y + PADDING + 14;
  doc.fontSize(7.5).fillColor(C.muted).font('Helvetica');
  doc.text('Description',     iX,        tHY, { width: 140 });
  doc.text('Weight (g)',      iX + 145,  tHY, { width: 60, align: 'right' });
  doc.text('Purity',          iX + 215,  tHY, { width: 45, align: 'center' });
  doc.text('Rate (Rs./g)',    iX + 265,  tHY, { width: 70, align: 'right' });
  doc.text('Value',           iX + 340,  tHY, { width: 80, align: 'right' });

  let rY = tHY + 14;
  exchangeItems.forEach(ex => {
    doc.fontSize(8.5).fillColor(C.ink).font('Helvetica');
    doc.text(ex.itemDescription || 'Old Gold', iX,        rY, { width: 140 });
    doc.text(parseFloat(ex.grossWeight).toFixed(3), iX + 145, rY, { width: 60, align: 'right' });
    doc.text(ex.purity || '22K',              iX + 215,  rY, { width: 45, align: 'center' });
    doc.text(fmtAmt(ex.exchangeRate),         iX + 265,  rY, { width: 70, align: 'right' });
    doc.fontSize(9).fillColor(C.success).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(ex.exchangeValue)}`, iX + 340, rY, { width: 80, align: 'right' });
    rY += 18;
  });

  return y + boxH + 14;
};

// ── GST SUMMARY ───────────────────────────────────
const drawGSTSummary = (doc, sale, y) => {
  // ── FIX: check page break for entire summary block ──
  y = checkPageBreak(doc, y, 120);

  const sX   = 350;
  const valX = sX + 100;
  const valW = 95;

  const rows = [
    ['Subtotal',    `Rs.${fmtAmt(sale.subtotal)}`,    C.ink,     false],
    ['CGST @ 1.5%', `Rs.${fmtAmt(sale.cgstAmount)}`,  C.ink,     false],
    ['SGST @ 1.5%', `Rs.${fmtAmt(sale.sgstAmount)}`,  C.ink,     false],
  ];

  if (parseFloat(sale.exchangeValue) > 0) {
    rows.push([`Exchange Deduction`, `− Rs.${fmtAmt(sale.exchangeValue)}`, C.success, false]);
  }
  if (parseFloat(sale.discountAmount) > 0) {
    rows.push([`Discount`, `− Rs.${fmtAmt(sale.discountAmount)}`, C.warning, false]);
  }

  drawAmountInWords(doc, sale.totalAmount, y);

  rows.forEach(([label, value, color]) => {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
       .text(label, sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(color).font('Helvetica-Bold')
       .text(value, valX, y, { width: valW, align: 'right' });
    y += 15;
  });

  doc.moveTo(sX, y + 3).lineTo(PAGE.width - PAGE.margin, y + 3)
     .lineWidth(0.8).stroke(C.gold);
  y += 8;

  doc.fontSize(12).fillColor(C.navy).font('Helvetica-Bold')
     .text('Total Amount', sX, y);
  doc.fontSize(14).fillColor(C.navy).font('Helvetica-Bold')
     .text(`Rs.${fmtAmt(sale.totalAmount)}`, valX, y - 1, { width: valW, align: 'right' });

  return y + 28;
};

// ── SIMPLE (NON-GST) SUMMARY ──────────────────────
const drawSimpleSummary = (doc, sale, y) => {
  // ── FIX: check page break for entire summary block ──
  y = checkPageBreak(doc, y, 100);

  const sX   = 350;
  const valX = sX + 100;
  const valW = 95;

  drawAmountInWords(doc, sale.totalAmount, y);

  if (parseFloat(sale.subtotal) !== parseFloat(sale.totalAmount)) {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
       .text('Subtotal', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.ink).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(sale.subtotal)}`, valX, y, { width: valW, align: 'right' });
    y += 15;
  }

  if (parseFloat(sale.exchangeValue) > 0) {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
       .text('Exchange Deduction', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.success).font('Helvetica-Bold')
       .text(`− Rs.${fmtAmt(sale.exchangeValue)}`, valX, y, { width: valW, align: 'right' });
    y += 15;
  }

  if (parseFloat(sale.discountAmount) > 0) {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
       .text('Discount', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.warning).font('Helvetica-Bold')
       .text(`− Rs.${fmtAmt(sale.discountAmount)}`, valX, y, { width: valW, align: 'right' });
    y += 15;
  }

  doc.moveTo(sX, y + 3).lineTo(PAGE.width - PAGE.margin, y + 3)
     .lineWidth(0.8).stroke(C.gold);
  y += 8;

  doc.fontSize(12).fillColor(C.navy).font('Helvetica-Bold')
     .text('Total Amount', sX, y);
  doc.fontSize(14).fillColor(C.navy).font('Helvetica-Bold')
     .text(`Rs.${fmtAmt(sale.totalAmount)}`, valX, y - 1, { width: valW, align: 'right' });

  return y + 28;
};

// ── AMOUNT IN WORDS (left side of summary) ────────
const drawAmountInWords = (doc, amount, y) => {
  doc.rect(PAGE.margin, y, 3, 34).fill(C.gold);
  doc.rect(PAGE.margin + 3, y, 280, 34).fill(C.goldLighter);

  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('AMOUNT IN WORDS', PAGE.margin + 10, y + 6, { characterSpacing: 1.2 });

  doc.fontSize(8.5).fillColor(C.muted).font('Helvetica-Oblique')
     .text(amountInWords(parseFloat(amount)), PAGE.margin + 10, y + 18, { width: 265 });
};

// ── PAYMENT SECTION ───────────────────────────────
const drawPaymentSection = (doc, sale, y) => {
  // ── FIX: check page break for header + stat block ──
  y = checkPageBreak(doc, y, 80);

  const statusMap = {
    paid:    { label: 'FULLY PAID',       bg: '#EAF5EE', text: C.success,  border: 'rgba(26,107,58,0.4)' },
    partial: { label: 'PARTIALLY PAID',   bg: '#FEF5E7', text: C.warning,  border: 'rgba(122,74,16,0.4)' },
    due:     { label: 'PAYMENT DUE',      bg: '#FEF0EF', text: C.danger,   border: 'rgba(122,26,26,0.4)' },
  };
  const st = statusMap[sale.status] || statusMap.due;

  // Section header bar
  doc.rect(PAGE.margin, y, PAGE.inner, 22).fill(C.ivory)
     .strokeColor(C.border).lineWidth(0.4).stroke();

  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('PAYMENT SUMMARY', PAGE.margin + 12, y + 8, { characterSpacing: 1.5 });

  const pillW = 110;
  const pillX = PAGE.width - PAGE.margin - pillW - 6;
  doc.rect(pillX, y + 5, pillW, 14)
     .fill(st.bg)
     .strokeColor(st.border).lineWidth(0.4).stroke();
  doc.fontSize(7.5).fillColor(st.text).font('Helvetica-Bold')
     .text(st.label, pillX, y + 9, { width: pillW, align: 'center', characterSpacing: 0.8 });

  y += 24;

  // Stat row — 3 columns
  const statW = PAGE.inner / 3;
  const stats = [
    { label: 'Total Amount',  value: `Rs.${fmtAmt(sale.totalAmount)}`,  color: C.ink },
    { label: 'Paid Amount',   value: `Rs.${fmtAmt(sale.paidAmount)}`,   color: C.success },
    { label: 'Due Amount',    value: `Rs.${fmtAmt(sale.dueAmount)}`,    color: parseFloat(sale.dueAmount) > 0 ? C.danger : C.muted },
  ];

  stats.forEach((stat, i) => {
    const sX = PAGE.margin + i * statW;
    doc.rect(sX, y, statW, 38)
       .fill(i % 2 === 0 ? C.ivory : C.white)
       .strokeColor(C.border).lineWidth(0.3).stroke();

    doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
       .text(stat.label, sX, y + 7, { width: statW, align: 'center' });
    doc.fontSize(12).fillColor(stat.color).font('Helvetica-Bold')
       .text(stat.value, sX, y + 19, { width: statW, align: 'center' });
  });

  y += 42;

  // Payment history
  if (sale.payments && sale.payments.length > 0) {
    // ── FIX: check page break before history heading ──
    y = checkPageBreak(doc, y, 28);

    doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
       .text('PAYMENT HISTORY', PAGE.margin, y + 8, { characterSpacing: 1.5 });
    y += 20;

    sale.payments.forEach((pmt, i) => {
      // ── FIX: check page break before each payment row ──
      y = checkPageBreak(doc, y, 22);

      if (i % 2 === 0) {
        doc.rect(PAGE.margin, y, PAGE.inner, 18).fill(C.ivory);
      }

      doc.circle(PAGE.margin + 10, y + 9, 3).fill(C.gold);

      doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
         .text(`${i + 1}. ${formatDate(pmt.paymentDate)}`, PAGE.margin + 20, y + 5, { width: 140 });

      const modeW = 45;
      const modeX = PAGE.width - PAGE.margin - modeW - 100;
      doc.rect(modeX, y + 4, modeW, 12).fill(C.goldLighter);
      doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
         .text(pmt.paymentMode.toUpperCase(), modeX, y + 8, { width: modeW, align: 'center' });

      doc.fontSize(9).fillColor(C.ink).font('Helvetica-Bold')
         .text(`Rs.${fmtAmt(pmt.amount)}`, PAGE.width - PAGE.margin - 100, y + 5, { width: 95, align: 'right' });

      y += 18;
    });
  }

  return y + 4;
};

// ── FOOTER ────────────────────────────────────────
const drawFooter = (doc, shop) => {
  const fY = PAGE.height - 70;

  doc.moveTo(PAGE.margin, fY).lineTo(PAGE.width - PAGE.margin, fY)
     .lineWidth(0.6).stroke(C.gold);

  const sigW = 150;

  doc.moveTo(PAGE.margin, fY + 35).lineTo(PAGE.margin + sigW, fY + 35)
     .lineWidth(0.4).stroke(C.border);
  doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
     .text('Customer Signature', PAGE.margin, fY + 39, { width: sigW, align: 'center' });

  const authX = PAGE.width - PAGE.margin - sigW;
  doc.moveTo(authX, fY + 35).lineTo(authX + sigW, fY + 35)
     .lineWidth(0.4).stroke(C.border);
  doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
     .text(`Authorized Signatory\n${shop.name}`, authX, fY + 39, { width: sigW, align: 'center' });

  doc.fontSize(8).fillColor('rgba(184,151,58,0.4)').font('Helvetica')
     .text(`— ${shop.name.toUpperCase()} —`, PAGE.margin, fY + 42, {
       width: PAGE.inner, align: 'center',
     });

  doc.fontSize(7).fillColor('rgba(107,104,128,0.55)').font('Helvetica')
     .text(
       'This is a computer generated invoice.  ·  Thank you for your purchase!',
       PAGE.margin, fY + 56,
       { width: PAGE.inner, align: 'center' }
     );
};

// ═══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

// ── PAGE BREAK GUARD ──────────────────────────────
// Adds a new page if `y + neededHeight` would overflow into the footer zone.
// Always call this before drawing any block; returns the new y position.
const checkPageBreak = (doc, y, neededHeight = 60) => {
  if (y + neededHeight > PAGE.height - FOOTER_SPACE) {
    doc.addPage();
    return PAGE.margin;
  }
  return y;
};

const fmtAmt = (n) =>
  parseFloat(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits:  2,
    maximumFractionDigits:  2,
  });

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });

// Amount to words — supports Crore / Lakh / Thousand
const amountInWords = (amount) => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num2words = (n) => {
    if (n === 0)        return '';
    if (n < 20)         return ones[n];
    if (n < 100)        return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000)       return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + num2words(n % 100) : '');
    if (n < 100000)     return num2words(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + num2words(n % 1000) : '');
    if (n < 10000000)   return num2words(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + num2words(n % 100000) : '');
    return num2words(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + num2words(n % 10000000) : '');
  };

  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);

  let result = num2words(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + num2words(paise) + ' Paise';
  return result + ' Only';
};