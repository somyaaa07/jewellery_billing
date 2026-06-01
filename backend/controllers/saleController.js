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
      advanceReceivedAmount,
    } = req.body;

    console.log('req.user:', req.user);
    console.log('paidAmount received:', paidAmount);
    console.log('advanceReceivedAmount received:', advanceReceivedAmount);

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

    // Check if gold items exist — goldRate required only if gold items present
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
      const metalType    = (item.metalType || 'gold').toLowerCase();
      const netWeight    = Math.max(0, parseFloat(item.grossWeight || 0) - parseFloat(item.stoneWeight || 0));

      // Use correct rate per metal type
      const activeRate   = metalType === 'gold'
        ? parseFloat(goldRate || 0)
        : parseFloat(silverRate || 0);

      const metalValue   = netWeight * activeRate;
      const stoneCharges = parseFloat(item.stoneCharges || 0);

      // Making charges: Gold only
      let making = 0;
      if (metalType === 'gold') {
        const makingPercent = parseFloat(item.makingChargesPercent || 0);
        making = makingPercent > 0
          ? parseFloat(((makingPercent / 100) * metalValue).toFixed(2))
          : parseFloat(item.makingCharges || 0);
      }

      const itemTotal = metalValue + making + stoneCharges;
      subtotal += itemTotal;

      return {
        metalType,
        itemName:    item.itemName || 'Item',
        huid:        item.huid    || null,
        hsnCode:     item.hsnCode || null,
        purity:      metalType === 'gold' ? (item.purity || '22K') : (item.purity || null),
        rate:        activeRate,                           // correct rate per metal
        grossWeight: parseFloat(item.grossWeight || 0),
        stoneWeight: parseFloat(item.stoneWeight || 0),
        netWeight:   parseFloat(netWeight.toFixed(3)),
        makingChargesPercent: metalType === 'gold'
          ? parseFloat(item.makingChargesPercent || 0)
          : null,
        makingCharges: metalType === 'gold' ? making : null,
        stoneCharges,
        itemTotal:   parseFloat(itemTotal.toFixed(2)),
        quantity:    item.quantity || 1,
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

    // ── Advance ──
    const advanceReceived = parseFloat(advanceReceivedAmount || 0);
    const cashPaid        = parseFloat(paidAmount || 0);

    const remainingAfterCash   = parseFloat(Math.max(0, totalAmount - cashPaid).toFixed(2));
    const advanceAppliedToBill = parseFloat(Math.min(advanceReceived, remainingAfterCash).toFixed(2));
    const advanceForFuture     = parseFloat(Math.max(0, advanceReceived - advanceAppliedToBill).toFixed(2));

    const totalPaid = parseFloat((cashPaid + advanceAppliedToBill).toFixed(2));
    const due       = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));
    const status    = due <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due';

    console.log('totalAmount:', totalAmount);
    console.log('advanceReceived:', advanceReceived);
    console.log('advanceAppliedToBill:', advanceAppliedToBill);
    console.log('advanceForFuture:', advanceForFuture);
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
        advanceUsed:    advanceAppliedToBill,
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

    // ── Advance received ──
    if (advanceReceived > 0) {
      const advanceRecord = await AdvancePayment.create(
        {
          shopId,
          customerId,
          createdBy:        req.user.id,
          amount:           advanceReceived,
          remainingBalance: advanceForFuture,
          paymentMethod:    paymentMode || 'cash',
          paymentDate:      new Date(),
          status:           advanceForFuture <= 0 ? 'fully_used' : 'active',
          notes:            `Received with invoice #${invoiceNumber}`,
        },
        { transaction: t }
      );

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

      if (advanceAppliedToBill > 0) {
        await AdvanceTransaction.create(
          {
            shopId,
            customerId,
            advancePaymentId: advanceRecord.id,
            saleId:           sale.id,
            type:             'utilized',
            amount:           -advanceAppliedToBill,
            balanceBefore:    advanceReceived,
            balanceAfter:     advanceForFuture,
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
      data: fullSale,
      advanceSummary: advanceReceived > 0 ? {
        received:        advanceReceived,
        appliedToBill:   advanceAppliedToBill,
        savedForFuture:  advanceForFuture,
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