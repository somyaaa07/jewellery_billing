import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sale, SaleItem, Customer, Shop, Payment, ExchangeItem } from '../models/index.js';

// ── LOGO PATHS ────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH     = path.join(__dirname, '../assets/logo.png');
const BIS_LOGO_PATH = path.join(__dirname, '../assets/bis-logo.png');

// ── BRAND TOKENS ────────────────────────────────
const C = {
  navy:        '#003399',
  navyMid:     '#002277',
  gold:        '#CC2200',
  goldLight:   '#F7C8C0',
  goldLighter: '#FFF0EE',
  ivory:       '#F8FAFF',
  ink:         '#111133',
  muted:       '#556688',
  border:      '#AABBD4',
  rowAlt:      '#F4F7FF',
  success:     '#1A6B3A',
  successLight:'#EAF5EE',
  warning:     '#7A4A10',
  danger:      '#7A1A1A',
  white:       '#FFFFFF',
};

const FOOTER_SPACE = 60;

const PAGE = {
  width:   595,
  height:  841,
  margin:  40,
  inner:   515,
};

// ── COLUMN X POSITIONS ───────────────────────────
const COL = {
  item:    40,
  karat:   150,
  gross:   190,
  net:     230,
  rate:    270,
  huid:    320,
  hsn:     374,
  making:  416,
  total:   466,
};

// ── COLUMN WIDTHS ────────────────────────────────
const COL_W = {
  item:    100,
  karat:   35,
  gross:   35,
  net:     35,
  rate:    45,
  huid:    50,
  hsn:     38,
  making:  46,
  total:   89,
};

// ── SAFE NUMBER HELPER ───────────────────────────
const safeNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

const fmtAmt = (n) =>
  safeNum(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });


export const generateInvoicePDF = async (saleId, shopId) => {

  const PLAYFAIR_FONT_PATH = path.join(
    __dirname,
    '../assets/fonts/PlayfairDisplay-Bold.ttf'
  );

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

  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE.margin,
    info: {
      Title:   sale.isGst ? `Invoice ${sale.invoiceNumber}` : `Estimate Price ${sale.invoiceNumber}`,
      Author:  shop.name,
      Subject: sale.isGst ? 'Jewelry Invoice' : 'Jewelry Estimate',
    },
  });

  doc.registerFont('PlayfairDisplayBold', PLAYFAIR_FONT_PATH);

  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  const pdfPromise = new Promise((resolve, reject) => {
    doc.on('end',   ()  => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));
  });

  if (sale.isGst) {
    drawGSTInvoice(doc, sale, shop);
  } else {
    drawNonGSTInvoice(doc, sale, shop);
  }

  doc.end();
  return pdfPromise;
};


const drawGSTInvoice = (doc, sale, shop) => {
  let y = drawHeader(doc, shop, sale, 'TAX INVOICE');
  y = drawRateStrip(doc, sale, shop, y, true);
  y = drawBillingBlock(doc, sale, shop, y);
  y = drawItemsTable(doc, sale, y);
  if (sale.exchangeItems && sale.exchangeItems.length > 0) {
    y = drawExchangeSection(doc, sale.exchangeItems, y);
  }
  y = drawGSTSummary(doc, sale, y);
  y = drawPaymentSection(doc, sale, y);
};


const drawNonGSTInvoice = (doc, sale, shop) => {
  let y = drawHeader(doc, shop, sale, 'Estimate Price');
  y = drawRateStrip(doc, sale, shop, y, false);
  y = drawBillingBlock(doc, sale, shop, y);
  y = drawItemsTable(doc, sale, y);
  if (sale.exchangeItems && sale.exchangeItems.length > 0) {
    y = drawExchangeSection(doc, sale.exchangeItems, y);
  }
  y = drawSimpleSummary(doc, sale, y);
  y = drawPaymentSection(doc, sale, y);
};


// ── HEADER ────────────────────────────────────────
const drawHeader = (doc, shop, sale, title) => {
  const startY    = 20;
  const pageWidth = doc.page.width;
  const logoSize  = 90; // ✅ increased from 70

  // ── LEFT LOGO ──
  try {
    doc.image(LOGO_PATH, PAGE.margin, startY, {
      fit: [logoSize, logoSize],
    });
  } catch (e) {}

  // ── RIGHT BIS LOGO ──
  try {
    doc.image(BIS_LOGO_PATH, pageWidth - PAGE.margin - logoSize, startY, {
      fit: [logoSize, logoSize],
    });
  } catch (e) {}

  // ── SHOP NAME ──
  const centerContentX  = PAGE.margin + logoSize + 10;
  const centerContentW  = pageWidth - (PAGE.margin + logoSize + 10) * 2;

  doc.font('PlayfairDisplayBold')
     .fontSize(23)
     .fillColor('#D81E05')
     .text(shop.name.toUpperCase(), centerContentX, startY + 6, {
       width: centerContentW,
       align: 'center',
     });
// ── ADDRESS ──
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor('#1D4ED8')
     .text(
       `Address: ${shop.address || ''}`,
       centerContentX,
       startY + 46,                 // ✅ thoda neeche push — logo se gap
       {
         width:       centerContentW,
         align:       'center',
         lineBreak:   true,
         lineGap:     1,            // ✅ line spacing kam
         wordSpacing: 2,
       }
     );

  const addressHeight = doc.heightOfString(
    `Address: ${shop.address || ''}`,
    { width: centerContentW, fontSize: 9, lineGap: 1 }  // ✅ match karo lineGap
  );

  const mobileY = startY + 36 + addressHeight + 15;  // ✅ address ke baad 6px gap

  doc.font('Helvetica-Bold')
     .fontSize(9)
     .fillColor('#111133')
     .text(
       `Mobile: ${shop.mobile || shop.phone || shop.contact || ''}`,
       centerContentX,
       mobileY,
       { width: centerContentW, align: 'center' }
     );

  // ── TITLE ──
  const titleY = mobileY + 16;   // ✅ mobile ke baad same 18px gap (address top gap ke barabar)

  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#000');

  const textWidth = doc.widthOfString(title);
  const centerX   = (pageWidth - textWidth) / 2;
  doc.text(title, centerX, titleY);

  // ── DIVIDER ──
  const dividerY = titleY + 22;

  doc.moveTo(PAGE.margin, dividerY)
     .lineTo(pageWidth - PAGE.margin, dividerY)
     .strokeColor('#1E3A8A')
     .lineWidth(1)
     .stroke();

  return dividerY + 14; // ✅ dynamic — adjusts if address wraps to 2 lines
};


// ── RATE STRIP ────────────────────────────────────
const drawRateStrip = (doc, sale, shop, y, showGstin) => {
  const hasSilver = sale.silverRate && safeNum(sale.silverRate) > 0;
  const hasGold   = sale.goldRate   && safeNum(sale.goldRate)   > 0;
  const H = 22;

  doc.rect(PAGE.margin, y, PAGE.inner, H).fill(C.goldLighter);

  let textX = PAGE.margin + 12;

  if (hasGold) {
    doc.fontSize(8).fillColor(C.muted).font('Helvetica').text('Gold Rate', textX, y + 7);
    doc.fontSize(9).fillColor(C.ink).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(sale.goldRate)}/g`, textX + 52, y + 6);
    textX += 130;
  }

  if (hasSilver) {
    doc.fontSize(8).fillColor(C.muted).font('Helvetica').text('Silver Rate', textX, y + 7);
    doc.fontSize(9).fillColor(C.ink).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(sale.silverRate)}/g`, textX + 55, y + 6);
  }

  if (showGstin && shop.gstin) {
    const badgeW = 155;
    const badgeX = PAGE.width - PAGE.margin - badgeW;
    doc.rect(badgeX, y, badgeW, H).fill(C.navy);
    doc.fontSize(7.5).fillColor(C.goldLight).font('Helvetica-Bold')
       .text(`GSTIN: ${shop.gstin}`, badgeX + 8, y + 8, { width: badgeW - 16 });
  }

  doc.moveTo(PAGE.margin, y + H).lineTo(PAGE.width - PAGE.margin, y + H)
     .lineWidth(0.4).stroke(C.border);

  return y + H + 1;
};


// ── BILLING BLOCK ────────────────────────────────
const drawBillingBlock = (doc, sale, shop, y) => {
  const startY   = y + 14;
  const customer = sale.customer;
  const leftX    = PAGE.margin;
  const rightX   = 355;

  const cardHeight = 78;

  doc.roundedRect(leftX, startY, 260, cardHeight, 6)
     .fillAndStroke('#FAFAFA', C.border);

  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.gold)
     .text('BILL TO', leftX + 12, startY + 10, { characterSpacing: 1.5 });

  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.ink)
     .text(customer.name || '-', leftX + 12, startY + 24);

  let detailY = startY + 45;

  if (customer.phone) {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
       .text(`${customer.phone}`, leftX + 12, detailY);
    detailY += 13;
  }

  if (customer.address) {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
       .text(customer.address, leftX + 12, detailY, { width: 230 });
  }

  const infoWidth = 190;

  doc.roundedRect(rightX, startY, infoWidth, cardHeight, 6)
     .fillAndStroke('#FAFAFA', C.border);

  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.gold)
     .text('INVOICE DETAILS', rightX + 12, startY + 10, { characterSpacing: 1.5 });

  const rows = [
    ['Invoice No.', sale.invoiceNumber],
    ['Date',        formatDate(sale.saleDate)],
    ['Time',        formatTime(sale.saleDate)],
  ];

  let rowY = startY + 26;

  rows.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text(label, rightX + 12, rowY);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink)
       .text(value || '-', rightX + 85, rowY, { width: 90, align: 'right' });
    rowY += 14;
    doc.moveTo(rightX + 12, rowY - 3)
       .lineTo(rightX + infoWidth - 12, rowY - 3)
       .lineWidth(0.25).stroke('#EAEAEA');
  });

  const endY = startY + cardHeight + 18;

  doc.moveTo(PAGE.margin, endY)
     .lineTo(PAGE.width - PAGE.margin, endY)
     .lineWidth(0.6).stroke(C.border);

  return endY + 12;
};


// ── ITEMS TABLE ───────────────────────────────────
const drawItemsTable = (doc, sale, y) => {
  const items = sale.items || [];

  doc.save();
  doc.fontSize(8).fillColor(C.gold).font('Helvetica-Bold')
     .text('ITEMS PURCHASED', PAGE.margin, y, { characterSpacing: 2 });

  y += 12;

  doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + 120, y)
     .lineWidth(1.2).stroke(C.gold);
  doc.moveTo(PAGE.margin + 125, y).lineTo(PAGE.width - PAGE.margin, y)
     .lineWidth(0.3).stroke(C.border);

  y += 10;

  // ── TABLE HEADER ─────────────────────────────────
  const HEADER_H = 34;
  const ITEM_HEADER_PADDING = 8;

  doc.rect(PAGE.margin, y, PAGE.inner, HEADER_H).fill('#1E3A8A');

  const hY = y + 12;

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');

  const ITEM_PADDING = 10;

  const headers = [
    ['ITEM',   COL.item,   COL_W.item,   'left'],
    ['KARAT',  COL.karat,  COL_W.karat,  'center'],
    ['GROSS',  COL.gross,  COL_W.gross,  'right'],
    ['NET',    COL.net,    COL_W.net,    'right'],
    ['RATE',   COL.rate,   COL_W.rate,   'right'],
    ['HUID',   COL.huid,   COL_W.huid,   'center'],
    ['HSN',    COL.hsn,    COL_W.hsn,    'center'],
    ['MAKING', COL.making, COL_W.making, 'right'],
    ['TOTAL',  COL.total,  COL_W.total,  'right'],
  ];

  headers.forEach(([label, x, w, align]) => {
    const posX = label === 'ITEM' ? x + ITEM_HEADER_PADDING : x;
    doc.text(label, posX, hY, { width: w, align, characterSpacing: 0.5 });
  });

  y += HEADER_H;

  // ── ROWS ─────────────────────────────────────────
  items.forEach((item, idx) => {
    const ROW_H = 30;
    y = checkPageBreak(doc, y, ROW_H + 6);

    doc.save();

    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F6F8FC';
    doc.rect(PAGE.margin, y, PAGE.inner, ROW_H).fill(bg);

    const textY = y + 9;
    const isGold = !item.metalType || item.metalType === 'gold';

    const itemRate = safeNum(item.rate) > 0
      ? safeNum(item.rate)
      : isGold
        ? safeNum(sale.goldRate)
        : safeNum(sale.silverRate);

    // ITEM NAME
    doc.fontSize(9).fillColor(C.ink).font('Helvetica-Bold')
       .text(item.itemName || '-', COL.item + ITEM_PADDING, textY, {
         width: COL_W.item - ITEM_PADDING,
         lineBreak: false,
       });

    // METAL TAG
    doc.fontSize(6.5)
       .fillColor(isGold ? '#B7791F' : '#4A5568')
       .font('Helvetica-Bold')
       .text(isGold ? 'GOLD' : 'SILVER', COL.item + ITEM_PADDING, y + 20);

    // KARAT BADGE
    if (item.purity) {
      doc.roundedRect(COL.karat + 4, y + 7, 30, 16, 3)
         .fill(isGold ? C.goldLighter : '#E8EEF7');
      doc.fontSize(7).fillColor(isGold ? C.gold : '#445566').font('Helvetica-Bold')
         .text(item.purity, COL.karat + 4, y + 11, { width: 30, align: 'center' });
    } else {
      doc.fontSize(8).fillColor(C.muted)
         .text('—', COL.karat, textY, { width: COL_W.karat, align: 'center' });
    }

    // GROSS WEIGHT
    doc.fontSize(8).fillColor(C.ink).font('Helvetica')
       .text(safeNum(item.grossWeight).toFixed(3), COL.gross, textY, {
         width: COL_W.gross, align: 'right',
       });

    // NET WEIGHT
    doc.text(safeNum(item.netWeight).toFixed(3), COL.net, textY, {
      width: COL_W.net, align: 'right',
    });

    // RATE
    doc.fontSize(7.5).fillColor(C.muted)
       .text(`Rs ${fmtAmt(itemRate)}`, COL.rate, textY, {
         width: COL_W.rate, align: 'right',
       });

    // HUID BADGE
    if (item.huid) {
      doc.roundedRect(COL.huid + 2, y + 7, 46, 16, 3).fill('#EAF2FF');
      doc.fontSize(7).fillColor('#1E40AF').font('Helvetica-Bold')
         .text(String(item.huid), COL.huid + 2, y + 11, { width: 46, align: 'center' });
    } else {
      doc.fontSize(8).fillColor(C.muted)
         .text('—', COL.huid, textY, { width: COL_W.huid, align: 'center' });
    }

    // HSN
    doc.fontSize(8).fillColor(item.hsnCode ? C.ink : C.muted).font('Helvetica')
       .text(item.hsnCode || '—', COL.hsn, textY, {
         width: COL_W.hsn, align: 'center',
       });

    // ✅ MAKING CHARGES — gold (percent-based) AND silver (flat ₹)
    if (item.makingCharges != null && safeNum(item.makingCharges) > 0) {
      doc.fontSize(8.5).fillColor(C.ink).font('Helvetica')
         .text(`Rs ${fmtAmt(item.makingCharges)}`, COL.making, textY, {
           width: COL_W.making, align: 'right',
         });
    } else {
      doc.fontSize(8).fillColor(C.muted)
         .text('—', COL.making, textY, { width: COL_W.making, align: 'right' });
    }

    // ITEM TOTAL
    doc.fontSize(9).fillColor(C.navy).font('Helvetica-Bold')
       .text(`Rs ${fmtAmt(item.itemTotal)}`, COL.total, textY - 1, {
         width: COL_W.total, align: 'right',
       });

    // Row divider
    doc.moveTo(PAGE.margin, y + ROW_H)
       .lineTo(PAGE.width - PAGE.margin, y + ROW_H)
       .lineWidth(0.3).stroke('#E6EAF2');

    doc.restore();
    y += ROW_H;
  });

  doc.moveTo(PAGE.margin, y + 2)
     .lineTo(PAGE.width - PAGE.margin, y + 2)
     .lineWidth(1).stroke(C.gold);

  doc.restore();
  return y + 14;
};


// ── EXCHANGE SECTION ──────────────────────────────
const drawExchangeSection = (doc, exchangeItems, y) => {
  const PADDING = 10;
  const boxH    = 20 + 18 + exchangeItems.length * 18 + PADDING;
  y = checkPageBreak(doc, y, boxH + 20);

  doc.rect(PAGE.margin, y, PAGE.inner, boxH)
     .fill(C.goldLighter).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.rect(PAGE.margin, y, 3, boxH).fill(C.gold);

  const iX = PAGE.margin + 14;
  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('EXCHANGE GOLD DETAILS', iX, y + PADDING, { characterSpacing: 1.5 });

  const tHY = y + PADDING + 14;
  doc.fontSize(7.5).fillColor(C.muted).font('Helvetica');
  doc.text('Description',  iX,       tHY, { width: 140 });
  doc.text('Weight (g)',   iX + 145, tHY, { width: 60,  align: 'right' });
  doc.text('Rate (Rs./g)', iX + 265, tHY, { width: 70,  align: 'left'  });
  doc.text('Value',        iX + 340, tHY, { width: 80,  align: 'right' });

  let rY = tHY + 14;
  exchangeItems.forEach(ex => {
    doc.fontSize(8.5).fillColor(C.ink).font('Helvetica');
    doc.text(ex.itemDescription || 'Old Gold',             iX,       rY, { width: 140 });
    doc.text(safeNum(ex.grossWeight).toFixed(3),           iX + 145, rY, { width: 60,  align: 'right' });
    doc.text(fmtAmt(ex.exchangeRate),                      iX + 265, rY, { width: 70,  align: 'left'  });
    doc.fontSize(9).fillColor(C.success).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(ex.exchangeValue)}`,             iX + 340, rY, { width: 80,  align: 'right' });
    rY += 18;
  });

  return y + boxH + 14;
};


// ── GST SUMMARY ───────────────────────────────────
const drawGSTSummary = (doc, sale, y) => {
  y = checkPageBreak(doc, y, 120);

  const sX   = 350;
  const valX = sX + 100;
  const valW = 95;

  const rows = [
    ['Subtotal',    `Rs.${fmtAmt(sale.subtotal)}`,   C.ink],
    ['CGST @ 1.5%', `Rs.${fmtAmt(sale.cgstAmount)}`, C.ink],
    ['SGST @ 1.5%', `Rs.${fmtAmt(sale.sgstAmount)}`, C.ink],
  ];

  if (safeNum(sale.exchangeValue) > 0)
    rows.push(['Exchange Deduction', `- Rs.${fmtAmt(sale.exchangeValue)}`, C.success]);
  if (safeNum(sale.discountAmount) > 0)
    rows.push(['Discount', `- Rs.${fmtAmt(sale.discountAmount)}`, C.warning]);

  // ✅ Round off row
  if (safeNum(sale.roundOffAmount) !== 0) {
    const roundOff = safeNum(sale.roundOffAmount);
    rows.push([
      'Round Off',
      `${roundOff > 0 ? '+ ' : '- '}Rs.${fmtAmt(Math.abs(roundOff))}`,
      C.muted,
    ]);
  }

  drawAmountInWords(doc, sale.totalAmount, y);

  rows.forEach(([label, value, color]) => {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica').text(label, sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(color).font('Helvetica-Bold').text(value, valX, y, { width: valW, align: 'right' });
    y += 15;
  });

  doc.moveTo(sX, y + 3).lineTo(PAGE.width - PAGE.margin, y + 3).lineWidth(0.8).stroke(C.gold);
  y += 8;

  doc.fontSize(12).fillColor(C.navy).font('Helvetica-Bold').text('Total Amount', sX, y);
  doc.fontSize(14).fillColor(C.navy).font('Helvetica-Bold')
     .text(`Rs.${fmtAmt(sale.totalAmount)}`, valX, y - 1, { width: valW, align: 'right' });

  y += 28;
  y = drawAdvanceSummaryRows(doc, sale, y, sX, valX, valW);
  return y;
};


// ── SIMPLE (NON-GST) SUMMARY ──────────────────────
const drawSimpleSummary = (doc, sale, y) => {
  y = checkPageBreak(doc, y, 100);

  const sX   = 350;
  const valX = sX + 100;
  const valW = 95;

  drawAmountInWords(doc, sale.totalAmount, y);

  if (safeNum(sale.subtotal) !== safeNum(sale.totalAmount)) {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica').text('Subtotal', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.ink).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(sale.subtotal)}`, valX, y, { width: valW, align: 'right' });
    y += 15;
  }

  if (safeNum(sale.exchangeValue) > 0) {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica').text('Exchange Deduction', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.success).font('Helvetica-Bold')
       .text(`- Rs.${fmtAmt(sale.exchangeValue)}`, valX, y, { width: valW, align: 'right' });
    y += 15;
  }

  if (safeNum(sale.discountAmount) > 0) {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica').text('Discount', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.warning).font('Helvetica-Bold')
       .text(`- Rs.${fmtAmt(sale.discountAmount)}`, valX, y, { width: valW, align: 'right' });
    y += 15;
  }

  // ✅ Round off row for non-GST invoice too
  if (safeNum(sale.roundOffAmount) !== 0) {
    const roundOff = safeNum(sale.roundOffAmount);
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica').text('Round Off', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica-Bold')
       .text(
         `${roundOff > 0 ? '+ ' : '- '}Rs.${fmtAmt(Math.abs(roundOff))}`,
         valX, y, { width: valW, align: 'right' }
       );
    y += 15;
  }

  doc.moveTo(sX, y + 3).lineTo(PAGE.width - PAGE.margin, y + 3).lineWidth(0.8).stroke(C.gold);
  y += 8;

  doc.fontSize(12).fillColor(C.navy).font('Helvetica-Bold').text('Total Amount', sX, y);
  doc.fontSize(14).fillColor(C.navy).font('Helvetica-Bold')
     .text(`Rs.${fmtAmt(sale.totalAmount)}`, valX, y - 1, { width: valW, align: 'right' });

  y += 28;
  y = drawAdvanceSummaryRows(doc, sale, y, sX, valX, valW);
  return y;
};


// ── ADVANCE SUMMARY ROWS ──────────────────────────
const drawAdvanceSummaryRows = (doc, sale, y, sX, valX, valW) => {
  y = checkPageBreak(doc, y, 80);

  const advanceUsed = safeNum(sale.advanceUsed);
  const totalPaid   = safeNum(sale.paidAmount);
  const due         = safeNum(sale.dueAmount);
  const cashPaid    = safeNum((totalPaid - advanceUsed).toFixed(2));

  if (advanceUsed > 0) {
    if (cashPaid > 0) {
      doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
         .text('Cash / UPI Paid', sX, y, { width: 100 });
      doc.fontSize(8.5).fillColor(C.success).font('Helvetica-Bold')
         .text(`Rs.${fmtAmt(cashPaid)}`, valX, y, { width: valW, align: 'right' });
      y += 15;
    }

    const boxH = 20;
    const boxX = sX - 4;
    const boxW = PAGE.width - PAGE.margin - boxX;

    doc.rect(boxX, y, boxW, boxH)
       .fill(C.successLight).strokeColor('#A3D9B1').lineWidth(0.5).stroke();
    doc.rect(boxX, y, 3, boxH).fill(C.success);

    doc.fontSize(8.5).fillColor(C.success).font('Helvetica-Bold')
       .text('Advance Used', sX + 2, y + 6, { width: 100 });
    doc.fontSize(8.5).fillColor(C.success).font('Helvetica-Bold')
       .text(`- Rs.${fmtAmt(advanceUsed)}`, valX, y + 6, { width: valW, align: 'right' });

    y += boxH + 6;

    doc.moveTo(sX, y).lineTo(PAGE.width - PAGE.margin, y).lineWidth(0.5).stroke(C.border);
    y += 4;

    doc.fontSize(9).fillColor(C.success).font('Helvetica-Bold')
       .text('Total Paid', sX, y, { width: 100 });
    doc.fontSize(9).fillColor(C.success).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(totalPaid)}`, valX, y, { width: valW, align: 'right' });
    y += 16;

  } else {
    doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
       .text('Paid Amount', sX, y, { width: 100 });
    doc.fontSize(8.5).fillColor(C.success).font('Helvetica-Bold')
       .text(`Rs.${fmtAmt(totalPaid)}`, valX, y, { width: valW, align: 'right' });
    y += 15;
  }

  const dueColor = due > 0 ? C.danger : C.muted;
  doc.fontSize(9).fillColor(C.muted).font('Helvetica')
     .text('Due Amount', sX, y, { width: 100 });
  doc.fontSize(9).fillColor(dueColor).font('Helvetica-Bold')
     .text(`Rs.${fmtAmt(due)}`, valX, y, { width: valW, align: 'right' });
  y += 18;

  return y;
};


// ── AMOUNT IN WORDS ───────────────────────────────
const drawAmountInWords = (doc, amount, y) => {
  doc.rect(PAGE.margin, y, 3, 34).fill(C.gold);
  doc.rect(PAGE.margin + 3, y, 280, 34).fill(C.goldLighter);
  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('AMOUNT IN WORDS', PAGE.margin + 10, y + 6, { characterSpacing: 1.2 });
  doc.fontSize(8.5).fillColor(C.muted).font('Helvetica-Oblique')
     .text(amountInWords(safeNum(amount)), PAGE.margin + 10, y + 18, { width: 265 });
};


// ── PAYMENT SECTION ───────────────────────────────
const drawPaymentSection = (doc, sale, y) => {
  y = checkPageBreak(doc, y, 80);

  const statusMap = {
    paid:    { label: 'FULLY PAID',     bg: '#EAF5EE', text: C.success, border: 'rgba(26,107,58,0.4)'  },
    partial: { label: 'PARTIALLY PAID', bg: '#FEF5E7', text: C.warning, border: 'rgba(122,74,16,0.4)'  },
    due:     { label: 'PAYMENT DUE',    bg: '#FEF0EF', text: C.danger,  border: 'rgba(122,26,26,0.4)'  },
  };
  const st = statusMap[sale.status] || statusMap.due;

  doc.rect(PAGE.margin, y, PAGE.inner, 22).fill(C.ivory)
     .strokeColor(C.border).lineWidth(0.4).stroke();
  doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
     .text('PAYMENT SUMMARY', PAGE.margin + 12, y + 8, { characterSpacing: 1.5 });

  const pillW = 110;
  const pillX = PAGE.width - PAGE.margin - pillW - 6;
  doc.rect(pillX, y + 5, pillW, 14).fill(st.bg).strokeColor(st.border).lineWidth(0.4).stroke();
  doc.fontSize(7.5).fillColor(st.text).font('Helvetica-Bold')
     .text(st.label, pillX, y + 9, { width: pillW, align: 'center', characterSpacing: 0.8 });

  y += 24;

  const statW       = PAGE.inner / 3;
  const advanceUsed = safeNum(sale.advanceUsed);

  const stats = [
    { label: 'Total Amount', value: `Rs.${fmtAmt(sale.totalAmount)}`, color: C.ink     },
    { label: 'Paid Amount',  value: `Rs.${fmtAmt(sale.paidAmount)}`,  color: C.success },
    { label: 'Due Amount',   value: `Rs.${fmtAmt(sale.dueAmount)}`,   color: safeNum(sale.dueAmount) > 0 ? C.danger : C.muted },
  ];

  stats.forEach((stat, i) => {
    const sX = PAGE.margin + i * statW;
    doc.rect(sX, y, statW, 38).fill(i % 2 === 0 ? C.ivory : C.white)
       .strokeColor(C.border).lineWidth(0.3).stroke();
    doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
       .text(stat.label, sX, y + 7, { width: statW, align: 'center' });
    doc.fontSize(12).fillColor(stat.color).font('Helvetica-Bold')
       .text(stat.value, sX, y + 19, { width: statW, align: 'center' });
  });

  y += 42;

  if (advanceUsed > 0) {
    y = checkPageBreak(doc, y, 28);
    const badgeW = PAGE.inner;
    doc.rect(PAGE.margin, y, badgeW, 22)
       .fill(C.successLight).strokeColor('#A3D9B1').lineWidth(0.5).stroke();
    doc.rect(PAGE.margin, y, 3, 22).fill(C.success);
    doc.fontSize(8).fillColor(C.success).font('Helvetica-Bold')
       .text(
         `Advance Payment Used: Rs.${fmtAmt(advanceUsed)}   |   Cash / UPI Paid: Rs.${fmtAmt(Math.max(0, safeNum(sale.paidAmount) - advanceUsed))}`,
         PAGE.margin + 10, y + 7, { width: badgeW - 20 }
       );
    y += 26;
  }

  if (sale.payments && sale.payments.length > 0) {
    y = checkPageBreak(doc, y, 28);
    doc.fontSize(7.5).fillColor(C.gold).font('Helvetica-Bold')
       .text('PAYMENT HISTORY', PAGE.margin, y + 8, { characterSpacing: 1.5 });
    y += 30;

    sale.payments.forEach((pmt, i) => {
      y = checkPageBreak(doc, y, 24);
      if (i % 2 === 0) doc.rect(PAGE.margin, y, PAGE.inner, 18).fill(C.ivory);
      doc.circle(PAGE.margin + 10, y + 9, 3).fill(C.gold);

      doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
         .text(`${i + 1}. ${formatDateTime(pmt.paymentDate)}`, PAGE.margin + 20, y + 5, { width: 160 });

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


// ── UTILITIES ─────────────────────────────────────
const checkPageBreak = (doc, y, neededHeight = 28) => {
  if (y + neededHeight > PAGE.height - FOOTER_SPACE) {
    doc.addPage();
    return PAGE.margin;
  }
  return y;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day:      '2-digit',
    month:    'short',
    year:     'numeric',
  });

const formatTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   true,
  }).toUpperCase();

const formatDateTime = (d) => `${formatDate(d)}, ${formatTime(d)}`;

const amountInWords = (amount) => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num2words = (n) => {
    if (n === 0)      return '';
    if (n < 20)       return ones[n];
    if (n < 100)      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000)     return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + num2words(n % 100) : '');
    if (n < 100000)   return num2words(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + num2words(n % 1000) : '');
    if (n < 10000000) return num2words(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + num2words(n % 100000) : '');
    return num2words(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + num2words(n % 10000000) : '');
  };

  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let result   = num2words(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + num2words(paise) + ' Paise';
  return result + ' Only';
};