import { Op } from 'sequelize';
import {
  sequelize, Sale, SaleItem, Customer, Payment,
  ExchangeItem, AdvancePayment, AdvanceTransaction,
} from '../models/index.js';


// ─────────────────────────────────────────────
// HELPER: Validate item fields per metal type
// ─────────────────────────────────────────────
const validateItemByMetalType = (item, idx) => {
  const metalType = (item.metalType || 'gold').toLowerCase();

  if (!item.itemName || !String(item.itemName).trim()) {
    return `Item ${idx + 1}: itemName required hai`;
  }

  if (!item.grossWeight || parseFloat(item.grossWeight) <= 0) {
    return `Item ${idx + 1}: grossWeight required hai`;
  }

  if (metalType === 'gold') {
    if (!item.purity || !String(item.purity).trim()) {
      return `Item ${idx + 1}: Gold ke liye purity required hai`;
    }
    if (item.makingChargesPercent === undefined && item.makingCharges === undefined) {
      return `Item ${idx + 1}: Gold ke liye makingCharges required hai`;
    }
  }

  return null;
};


// ─────────────────────────────────────────────
// CREATE SALE
// ─────────────────────────────────────────────
export const createSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      customerId,
      items,
      goldRate,
      silverRate,
      isGst,
      exchangeItems,
      paidAmount,
      paymentMode,
      notes,
    } = req.body;

    // advanceUsedAmount  = existing advance balance jo billing pe use ho raha hai (Billing.jsx se aata hai)
    // advanceReceivedAmount = fresh advance jo customer abhi de raha hai (sale ke saath)
    const advanceUsed     = parseFloat(req.body.advanceUsedAmount     || 0);
    const advanceReceived = parseFloat(req.body.advanceReceivedAmount || 0);

    console.log('req.user:', req.user);
    console.log('paidAmount received:', paidAmount);
    console.log('advanceUsed received:', advanceUsed);
    console.log('advanceReceived received:', advanceReceived);

    const shopId = req.user?.shopId;
    if (!shopId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'shopId missing.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'items array required hai.' });
    }

    if (!customerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'customerId required hai' });
    }

    const hasGoldItems   = items.some(it => (it.metalType || 'gold').toLowerCase() === 'gold');
    const hasSilverItems = items.some(it => (it.metalType || 'gold').toLowerCase() === 'silver');

    if (hasGoldItems && !goldRate) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'goldRate required hai' });
    }

    if (hasSilverItems && !silverRate) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'silverRate required hai' });
    }

    // ── Per-item validation ──
    for (let i = 0; i < items.length; i++) {
      const err = validateItemByMetalType(items[i], i);
      if (err) {
        await t.rollback();
        return res.status(400).json({ success: false, message: err });
      }
    }

    // ── Invoice Number ──
    const count = await Sale.count({ where: { shopId } });
    const year  = new Date().getFullYear();
    const seq   = String(count + 1).padStart(4, '0');
    const invoiceNumber = `INV-${shopId}-${year}-${seq}`;

    // ── Items Calculate ──
    let subtotal = 0;
    const processedItems = items.map(item => {
      const metalType  = (item.metalType || 'gold').toLowerCase();
      const netWeight  = Math.max(0, parseFloat(item.grossWeight || 0) - parseFloat(item.stoneWeight || 0));
      const activeRate = metalType === 'gold'
        ? parseFloat(goldRate   || 0)
        : parseFloat(silverRate || 0);

      const metalValue   = netWeight * activeRate;
      const stoneCharges = parseFloat(item.stoneCharges || 0);

      let making = 0;
      if (
        item.makingChargesPercent !== undefined &&
        item.makingChargesPercent !== null &&
        item.makingChargesPercent !== ''
      ) {
        making = (metalValue * parseFloat(item.makingChargesPercent || 0)) / 100;
      } else if (
        item.makingCharges !== undefined &&
        item.makingCharges !== null &&
        item.makingCharges !== ''
      ) {
        making = parseFloat(item.makingCharges || 0);
      }

      const itemTotal = metalValue + making + stoneCharges;
      subtotal += itemTotal;

      return {
        metalType,
        itemName:             item.itemName || 'Item',
        huid:                 item.huid    || null,
        hsnCode:              item.hsnCode || null,
        purity:               metalType === 'gold' ? (item.purity || '22K') : (item.purity || null),
        rate:                 activeRate,
        grossWeight:          parseFloat(item.grossWeight || 0),
        stoneWeight:          parseFloat(item.stoneWeight || 0),
        netWeight:            parseFloat(netWeight.toFixed(3)),
        makingChargesPercent: parseFloat(item.makingChargesPercent || 0),
        makingCharges:        parseFloat(making.toFixed(2)),
        stoneCharges,
        itemTotal:            parseFloat(itemTotal.toFixed(2)),
        quantity:             item.quantity || 1,
      };
    });

    // ── GST ──
    const cgstAmount = isGst ? parseFloat((subtotal * 0.015).toFixed(2)) : 0;
    const sgstAmount = isGst ? parseFloat((subtotal * 0.015).toFixed(2)) : 0;

    // ── Exchange ──
    let totalExchangeValue = 0;
    const processedExchange = (exchangeItems || []).map(ex => {
      const value = parseFloat(ex.grossWeight || 0) * parseFloat(ex.exchangeRate || 0);
      totalExchangeValue += value;
      return {
        itemDescription: ex.itemDescription || 'Old Gold',
        grossWeight:     parseFloat(ex.grossWeight  || 0),
        purity:          ex.purity || '22K',
        exchangeRate:    parseFloat(ex.exchangeRate || 0),
        exchangeValue:   parseFloat(value.toFixed(2)),
      };
    });

    // ── Final Total ──
    const totalAmount = parseFloat(
      (subtotal + cgstAmount + sgstAmount - totalExchangeValue).toFixed(2)
    );

    // ── Payment calculation ──
    // advanceUsed is already capped on frontend (Math.min(advanceBalance, total))
    // but we double-cap here for safety
    const cashPaid        = parseFloat(paidAmount || 0);
    const advanceApplied  = parseFloat(Math.min(advanceUsed, Math.max(0, totalAmount - cashPaid)).toFixed(2));
    const totalPaid       = parseFloat((cashPaid + advanceApplied).toFixed(2));
    const due             = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));
    const status          = due <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due';

    console.log('totalAmount:', totalAmount);
    console.log('cashPaid:', cashPaid);
    console.log('advanceApplied:', advanceApplied);
    console.log('totalPaid:', totalPaid);
    console.log('due:', due);

    // ── Create Sale ──
    const sale = await Sale.create(
      {
        shopId,
        customerId,
        invoiceNumber,
        saleDate:       new Date(),
        goldRate:       parseFloat(goldRate   || 0),
        silverRate:     parseFloat(silverRate || 0),
        isGst:          !!isGst,
        subtotal:       parseFloat(subtotal.toFixed(2)),
        cgstAmount,
        sgstAmount,
        exchangeValue:  parseFloat(totalExchangeValue.toFixed(2)),
        discountAmount: 0,
        totalAmount,
        paidAmount:     totalPaid,
        dueAmount:      due,
        advanceUsed:    advanceApplied,
        status,
        notes,
        paymentMode:    paymentMode || 'cash',
      },
      { transaction: t }
    );

    // ── Save Items ──
    for (const item of processedItems) {
      await SaleItem.create({ ...item, saleId: sale.id }, { transaction: t });
    }

    // ── Save Exchange Items ──
    for (const ex of processedExchange) {
      await ExchangeItem.create({ ...ex, saleId: sale.id }, { transaction: t });
    }

    // ── Cash Payment record ──
    if (cashPaid > 0) {
      await Payment.create(
        {
          saleId:      sale.id,
          shopId,
          customerId,
          amount:      cashPaid,
          paymentDate: new Date(),
          paymentMode: paymentMode || 'cash',
        },
        { transaction: t }
      );
    }

    // ────────────────────────────────────────────────────────────
    // ── DEDUCT EXISTING ADVANCE BALANCE (FIFO) ──
    // Jab billing pe customer ka existing advance use hota hai
    // tab unke AdvancePayment records se remainingBalance deduct karo
    // ────────────────────────────────────────────────────────────
    if (advanceApplied > 0) {
      const activeAdvances = await AdvancePayment.findAll({
        where: {
          customerId,
          shopId,
          status:           { [Op.in]: ['active', 'partially_refunded'] },
          remainingBalance: { [Op.gt]: 0 },
        },
        order: [['paymentDate', 'ASC'], ['createdAt', 'ASC']], // FIFO — purana pehle
        lock:  t.LOCK.UPDATE,
        transaction: t,
      });

      let remaining = advanceApplied;
      for (const advance of activeAdvances) {
        if (remaining <= 0) break;

        const available  = parseFloat(advance.remainingBalance);
        const toUse      = parseFloat(Math.min(available, remaining).toFixed(2));
        const newBalance = parseFloat((available - toUse).toFixed(2));
        const newStatus  = newBalance <= 0 ? 'fully_used' : advance.status;

        // Transaction audit entry
        await AdvanceTransaction.create(
          {
            shopId,
            customerId,
            advancePaymentId: advance.id,
            saleId:           sale.id,
            type:             'utilized',
            amount:           -toUse,       // negative = debit
            balanceBefore:    available,
            balanceAfter:     newBalance,
            notes:            `Used in invoice #${invoiceNumber}`,
            transactionDate:  new Date(),
          },
          { transaction: t }
        );

        // AdvancePayment record update
        await advance.update(
          { remainingBalance: newBalance, status: newStatus },
          { transaction: t }
        );

        remaining -= toUse;
      }
    }

    // ────────────────────────────────────────────────────────────
    // ── FRESH ADVANCE RECEIVED with this sale ──
    // Agar customer ne sale ke saath naya advance diya ho
    // ────────────────────────────────────────────────────────────
    if (advanceReceived > 0) {
      // Fresh advance mein se agar kuch bill pe apply hua to baaki future ke liye
      const remainingAfterCash      = parseFloat(Math.max(0, totalAmount - cashPaid).toFixed(2));
      const freshAdvanceApplied     = parseFloat(Math.min(advanceReceived, remainingAfterCash).toFixed(2));
      const freshAdvanceForFuture   = parseFloat(Math.max(0, advanceReceived - freshAdvanceApplied).toFixed(2));

      const advanceRecord = await AdvancePayment.create(
        {
          shopId,
          customerId,
          createdBy:        req.user.id,
          amount:           advanceReceived,
          remainingBalance: freshAdvanceForFuture,
          paymentMethod:    paymentMode || 'cash',
          paymentDate:      new Date(),
          status:           freshAdvanceForFuture <= 0 ? 'fully_used' : 'active',
          notes:            `Received with invoice #${invoiceNumber}`,
        },
        { transaction: t }
      );

      // Transaction: received
      await AdvanceTransaction.create(
        {
          shopId,
          customerId,
          advancePaymentId: advanceRecord.id,
          saleId:           null,
          type:             'received',
          amount:           advanceReceived,
          balanceBefore:    0,
          balanceAfter:     advanceReceived,
          notes:            `Advance received with invoice #${invoiceNumber}`,
          transactionDate:  new Date(),
        },
        { transaction: t }
      );

      // Transaction: utilized (if any applied to this bill)
      if (freshAdvanceApplied > 0) {
        await AdvanceTransaction.create(
          {
            shopId,
            customerId,
            advancePaymentId: advanceRecord.id,
            saleId:           sale.id,
            type:             'utilized',
            amount:           -freshAdvanceApplied,
            balanceBefore:    advanceReceived,
            balanceAfter:     freshAdvanceForFuture,
            notes:            `Applied to invoice #${invoiceNumber}`,
            transactionDate:  new Date(),
          },
          { transaction: t }
        );
      }
    }

    // ── Update Customer totalDue ──
    if (due > 0) {
      await Customer.increment(
        'totalDue',
        { by: due, where: { id: customerId }, transaction: t }
      );
    }

    // ── Decrement Customer totalDue if advance was used ──
    // (advance use hone se customer ka due kam hota hai)
    if (advanceApplied > 0) {
      await Customer.decrement(
        'totalDue',
        { by: advanceApplied, where: { id: customerId }, transaction: t }
      );
    }

    await t.commit();

    const fullSale = await Sale.findByPk(sale.id, {
      include: [
        { model: SaleItem,           as: 'items' },
        { model: ExchangeItem,       as: 'exchangeItems' },
        { model: Customer,           as: 'customer' },
        { model: Payment,            as: 'payments' },
        { model: AdvanceTransaction, as: 'advanceTransactions' },
      ],
    });

    res.status(201).json({
      success: true,
      data:    fullSale,
      advanceSummary: advanceApplied > 0 ? {
        existingAdvanceUsed: advanceApplied,
      } : advanceReceived > 0 ? {
        received:       advanceReceived,
        appliedToBill:  parseFloat(Math.min(advanceReceived, Math.max(0, totalAmount - cashPaid)).toFixed(2)),
        savedForFuture: parseFloat(Math.max(0, advanceReceived - Math.min(advanceReceived, Math.max(0, totalAmount - cashPaid))).toFixed(2)),
      } : null,
    });

  } catch (error) {
    await t.rollback();
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────
// GET ALL SALES
// ─────────────────────────────────────────────
export const getAllSales = async (req, res) => {
  try {
    const {
      status, customerId, startDate, endDate,
      page = 1, limit = 20, search,
    } = req.query;

    const shopId = req.user.shopId;
    const where  = { shopId };

    if (status)     where.status     = { [Op.in]: status.split(',') };
    if (customerId) where.customerId = customerId;

    if (startDate && endDate) {
      where.saleDate = { [Op.between]: [startDate, endDate] };
    }

    const searchCondition = search
      ? {
          [Op.or]: [
            { invoiceNumber:      { [Op.like]: `%${search}%` } },
            { '$customer.name$':  { [Op.like]: `%${search}%` } },
            { '$customer.phone$': { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows: sales } = await Sale.findAndCountAll({
      where: { ...where, ...searchCondition },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Payment,  as: 'payments' },
        { model: SaleItem, as: 'items' },
      ],
      order:    [['createdAt', 'DESC']],
      limit:    parseInt(limit),
      offset:   (parseInt(page) - 1) * parseInt(limit),
      subQuery: false,
    });

    return res.json({
      success: true,
      data: sales,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────
// GET SALE BY ID
// ─────────────────────────────────────────────
export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      where: { id: req.params.id, shopId: req.user.shopId },
      include: [
        { model: SaleItem,           as: 'items' },
        { model: ExchangeItem,       as: 'exchangeItems' },
        { model: Customer,           as: 'customer' },
        { model: Payment,            as: 'payments' },
        { model: AdvanceTransaction, as: 'advanceTransactions' },
      ],
    });

    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────
// ADD PAYMENT TO EXISTING SALE
// ─────────────────────────────────────────────
export const addPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amount, paymentMode, referenceNumber, notes } = req.body;

    const sale = await Sale.findOne({
      where: { id: req.params.id, shopId: req.user.shopId },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    if (parseFloat(amount) > parseFloat(sale.dueAmount)) {
      return res.status(400).json({
        success: false,
        message: `Amount ₹${amount} due se zyada hai (Due: ₹${sale.dueAmount})`,
      });
    }

    await Payment.create(
      {
        saleId:          sale.id,
        shopId:          req.user.shopId,
        customerId:      sale.customerId,
        amount:          parseFloat(amount),
        paymentDate:     new Date(),
        paymentMode:     paymentMode || 'cash',
        referenceNumber: referenceNumber || null,
        notes:           notes || null,
      },
      { transaction: t }
    );

    const newPaid   = parseFloat(sale.paidAmount) + parseFloat(amount);
    const newDue    = parseFloat(Math.max(0, sale.totalAmount - newPaid).toFixed(2));
    const newStatus = newDue <= 0 ? 'paid' : 'partial';

    await sale.update(
      { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
      { transaction: t }
    );

    await Customer.decrement(
      'totalDue',
      { by: parseFloat(amount), where: { id: sale.customerId }, transaction: t }
    );

    await t.commit();

    const updatedSale = await Sale.findByPk(sale.id, {
      include: [
        { model: Payment,  as: 'payments' },
        { model: Customer, as: 'customer' },
      ],
    });

    res.json({ success: true, message: 'Payment added!', data: updatedSale });

  } catch (error) {
    await t.rollback();
    console.error('addPayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};