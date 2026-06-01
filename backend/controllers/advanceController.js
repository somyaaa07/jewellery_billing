import { Op, fn, col, literal } from 'sequelize';
import {
  sequelize, AdvancePayment, AdvanceTransaction,
  Customer, Sale, User,
} from '../models/index.js';

// ─────────────────────────────────────────────
// CREATE ADVANCE PAYMENT
// POST /api/advances
// Customer se advance lo
// ─────────────────────────────────────────────
export const createAdvance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      customerId, amount, paymentMethod,
      transactionReference, notes, paymentDate,
    } = req.body;

    const shopId = req.user.shopId;

    // Validation
    if (!customerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'customerId required hai' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Amount 0 se zyada hona chahiye' });
    }

    // Customer exist karta hai is shop mein?
    const customer = await Customer.findOne({ where: { id: customerId, shopId } });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const advanceAmount = parseFloat(amount);

    // ── Create AdvancePayment record ──────────
    const advance = await AdvancePayment.create(
      {
        shopId,
        customerId,
        createdBy:            req.user.id,
        amount:               advanceAmount,
        remainingBalance:     advanceAmount,  // initially same as amount
        paymentMethod:        paymentMethod || 'cash',
        transactionReference: transactionReference || null,
        paymentDate:          paymentDate || new Date(),
        status:               'active',
        notes,
      },
      { transaction: t }
    );

    // ── Create Transaction audit entry ────────
    await AdvanceTransaction.create(
      {
        shopId,
        customerId,
        advancePaymentId: advance.id,
        saleId:           null,
        type:             'received',
        amount:           advanceAmount,
        balanceBefore:    0,
        balanceAfter:     advanceAmount,
        notes:            `Advance received via ${paymentMethod || 'cash'}`,
        transactionDate:  new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    const fullAdvance = await AdvancePayment.findByPk(advance.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: User,     as: 'recordedBy', attributes: ['id', 'name'] },
      ],
    });

    res.status(201).json({ success: true, data: fullAdvance });

  } catch (error) {
    await t.rollback();
    console.error('createAdvance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET CUSTOMER ADVANCES
// GET /api/advances/customer/:customerId
// Customer ka total balance aur advance list
// ─────────────────────────────────────────────
export const getCustomerAdvances = async (req, res) => {
  try {
    const { customerId } = req.params;
    const shopId = req.user.shopId;

    const advances = await AdvancePayment.findAll({
      where:   { customerId, shopId },
      include: [
        { model: AdvanceTransaction, as: 'transactions', order: [['transactionDate', 'DESC']] },
        { model: User, as: 'recordedBy', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Total available balance
    const totalBalance = advances
      .filter(a => a.status === 'active' || a.status === 'partially_refunded')
      .reduce((sum, a) => sum + parseFloat(a.remainingBalance), 0);

    const totalReceived = advances.reduce((sum, a) => sum + parseFloat(a.amount), 0);
    const totalUtilized = totalReceived - advances.reduce((sum, a) => sum + parseFloat(a.remainingBalance), 0);

    res.json({
      success: true,
      data: {
        advances,
        summary: {
          totalBalance:  parseFloat(totalBalance.toFixed(2)),
          totalReceived: parseFloat(totalReceived.toFixed(2)),
          totalUtilized: parseFloat(totalUtilized.toFixed(2)),
          activeAdvances: advances.filter(a => a.status === 'active').length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL ADVANCES (shop-wise)
// GET /api/advances
// ─────────────────────────────────────────────
export const getAllAdvances = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { status, customerId, page = 1, limit = 20, search } = req.query;

    const where = { shopId };
    if (status)     where.status     = status;
    if (customerId) where.customerId = customerId;

    // Search by customer name — join through include
    const customerWhere = {};
    if (search) customerWhere.name = { [Op.like]: `%${search}%` };

    const { count, rows: advances } = await AdvancePayment.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          as:    'customer',
          attributes: ['id', 'name', 'phone'],
          where: Object.keys(customerWhere).length ? customerWhere : undefined,
        },
        { model: User, as: 'recordedBy', attributes: ['id', 'name'] },
      ],
      order:  [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: advances,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// APPLY ADVANCE TO SALE
// POST /api/advances/apply
// Sale banate waqt advance use karo
//
// FLOW:
//   1. Customer ka available advance check karo
//   2. FIFO order mein advances consume karo
//      (purana pehle use hoga)
//   3. Sale ke dueAmount se advance minus karo
//   4. AdvanceTransaction records banao
// ─────────────────────────────────────────────
export const applyAdvanceToSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { saleId, advanceAmount } = req.body;
    const shopId = req.user.shopId;

    if (!saleId || !advanceAmount || parseFloat(advanceAmount) <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'saleId aur advanceAmount required hain' });
    }

    // Sale find karo
    const sale = await Sale.findOne({ where: { id: saleId, shopId } });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const customerId = sale.customerId;
    let amountToApply = parseFloat(advanceAmount);

    // Can't apply more than due amount
    if (amountToApply > parseFloat(sale.dueAmount)) {
      amountToApply = parseFloat(sale.dueAmount);
    }

    // Get active advances — FIFO (oldest first)
    const activeAdvances = await AdvancePayment.findAll({
      where: {
        customerId,
        shopId,
        status:           { [Op.in]: ['active', 'partially_refunded'] },
        remainingBalance: { [Op.gt]: 0 },
      },
      order: [['paymentDate', 'ASC'], ['createdAt', 'ASC']],
      lock:  t.LOCK.UPDATE,
      transaction: t,
    });

    // Check total available
    const totalAvailable = activeAdvances.reduce(
      (sum, a) => sum + parseFloat(a.remainingBalance), 0
    );

    if (totalAvailable < amountToApply) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient advance balance. Available: ₹${totalAvailable.toFixed(2)}`,
      });
    }

    // FIFO consume karo
    let remaining = amountToApply;
    for (const advance of activeAdvances) {
      if (remaining <= 0) break;

      const available    = parseFloat(advance.remainingBalance);
      const toUse        = Math.min(available, remaining);
      const newBalance   = parseFloat((available - toUse).toFixed(2));
      const newStatus    = newBalance <= 0 ? 'fully_used' : advance.status;

      await AdvanceTransaction.create(
        {
          shopId,
          customerId,
          advancePaymentId: advance.id,
          saleId,
          type:             'utilized',
          amount:           -toUse,   // negative = debit
          balanceBefore:    available,
          balanceAfter:     newBalance,
          notes:            `Used in invoice #${sale.invoiceNumber}`,
          transactionDate:  new Date(),
        },
        { transaction: t }
      );

      await advance.update(
        { remainingBalance: newBalance, status: newStatus },
        { transaction: t }
      );

      remaining -= toUse;
    }

    // Update sale — dueAmount aur paidAmount update karo
    const newPaidAmount = parseFloat(sale.paidAmount) + amountToApply;
    const newDueAmount  = parseFloat(Math.max(0, sale.totalAmount - newPaidAmount).toFixed(2));
    const newStatus     = newDueAmount <= 0 ? 'paid' : 'partial';

    await sale.update(
      { paidAmount: newPaidAmount, dueAmount: newDueAmount, status: newStatus },
      { transaction: t }
    );

    // Customer totalDue update
    await Customer.decrement(
      'totalDue',
      { by: amountToApply, where: { id: customerId }, transaction: t }
    );

    await t.commit();

    const updatedSale = await Sale.findByPk(saleId);
    res.json({
      success:        true,
      message:        `₹${amountToApply.toFixed(2)} advance applied successfully!`,
      appliedAmount:  amountToApply,
      data:           updatedSale,
    });

  } catch (error) {
    await t.rollback();
    console.error('applyAdvanceToSale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// REFUND ADVANCE
// POST /api/advances/:id/refund
// ─────────────────────────────────────────────
export const refundAdvance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { refundAmount, notes } = req.body;
    const shopId = req.user.shopId;

    const advance = await AdvancePayment.findOne({
      where: { id, shopId },
      lock:  t.LOCK.UPDATE,
      transaction: t,
    });

    if (!advance) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Advance not found' });
    }

    if (advance.status === 'refunded') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Advance already fully refunded hai' });
    }

    const toRefund     = parseFloat(refundAmount);
    const currentBal   = parseFloat(advance.remainingBalance);

    if (toRefund <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Refund amount 0 se zyada hona chahiye' });
    }

    if (toRefund > currentBal) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Refund amount remaining balance se zyada hai. Available: ₹${currentBal}`,
      });
    }

    const newBalance = parseFloat((currentBal - toRefund).toFixed(2));
    const newStatus  = newBalance <= 0 ? 'refunded' : 'partially_refunded';

    await AdvanceTransaction.create(
      {
        shopId,
        customerId:       advance.customerId,
        advancePaymentId: advance.id,
        saleId:           null,
        type:             'refunded',
        amount:           toRefund,   // positive = credit back
        balanceBefore:    currentBal,
        balanceAfter:     newBalance,
        notes:            notes || 'Advance refunded',
        transactionDate:  new Date(),
      },
      { transaction: t }
    );

    await advance.update(
      { remainingBalance: newBalance, status: newStatus },
      { transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: `₹${toRefund.toFixed(2)} refunded successfully!`,
      data:    await AdvancePayment.findByPk(advance.id),
    });

  } catch (error) {
    await t.rollback();
    console.error('refundAdvance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET CUSTOMER ADVANCE BALANCE (quick check)
// GET /api/advances/balance/:customerId
// Billing form mein use hoga — available balance fetch
// ─────────────────────────────────────────────
export const getCustomerBalance = async (req, res) => {
  try {
    const { customerId } = req.params;
    const shopId = req.user.shopId;

    const advances = await AdvancePayment.findAll({
      where: {
        customerId,
        shopId,
        status:           { [Op.in]: ['active', 'partially_refunded'] },
        remainingBalance: { [Op.gt]: 0 },
      },
      attributes: ['id', 'amount', 'remainingBalance', 'paymentDate', 'status'],
    });

    const totalBalance = advances.reduce(
      (sum, a) => sum + parseFloat(a.remainingBalance), 0
    );

    res.json({
      success: true,
      data: {
        totalBalance:   parseFloat(totalBalance.toFixed(2)),
        advances:       advances,
        hasBalance:     totalBalance > 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// ADVANCE REPORTS
// GET /api/advances/reports
// ─────────────────────────────────────────────
export const getAdvanceReports = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate
      ? { paymentDate: { [Op.between]: [startDate, endDate] } }
      : {};

    const [
      totalReceived,
      totalUtilized,
      totalRefunded,
      totalBalance,
      customerSummary,
      recentTransactions,
    ] = await Promise.all([

      // Total advance received
      AdvancePayment.sum('amount', { where: { shopId, ...dateFilter } }),

      // Total utilized (from transactions)
      AdvanceTransaction.sum('amount', {
        where: { shopId, type: 'utilized' },
      }).then(v => Math.abs(v || 0)),

      // Total refunded
      AdvanceTransaction.sum('amount', {
        where: { shopId, type: 'refunded' },
      }),

      // Current total balance
      AdvancePayment.sum('remainingBalance', {
        where: { shopId, status: { [Op.in]: ['active', 'partially_refunded'] } },
      }),

      // Per-customer summary
      AdvancePayment.findAll({
        where:      { shopId, ...dateFilter },
        attributes: [
          'customerId',
          [fn('SUM', col('amount')),           'totalReceived'],
          [fn('SUM', col('remainingBalance')), 'totalBalance'],
          [fn('COUNT', col('id')),             'advanceCount'],
        ],
        include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] }],
        group:   ['customerId', 'customer.id'],
        order:   [[literal('totalBalance'), 'DESC']],
        limit:   10,
        raw:     false,
      }),

      // Recent 20 transactions
      AdvanceTransaction.findAll({
        where:   { shopId },
        include: [
          { model: Customer,       as: 'customer',  attributes: ['id', 'name'] },
          { model: AdvancePayment, as: 'advance',   attributes: ['id', 'amount', 'paymentMethod'] },
        ],
        order: [['transactionDate', 'DESC']],
        limit: 20,
      }),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalReceived:  parseFloat((totalReceived  || 0).toFixed(2)),
          totalUtilized:  parseFloat((totalUtilized  || 0).toFixed(2)),
          totalRefunded:  parseFloat((totalRefunded  || 0).toFixed(2)),
          totalBalance:   parseFloat((totalBalance   || 0).toFixed(2)),
        },
        customerSummary,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('getAdvanceReports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET TRANSACTION HISTORY for one advance
// GET /api/advances/:id/transactions
// ─────────────────────────────────────────────
export const getAdvanceTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user.shopId;

    const advance = await AdvancePayment.findOne({
      where: { id, shopId },
      include: [
        { model: Customer,           as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: User,               as: 'recordedBy', attributes: ['id', 'name'] },
        {
          model: AdvanceTransaction,
          as:    'transactions',
          include: [
            { model: Sale, as: 'sale', attributes: ['id', 'invoiceNumber', 'totalAmount'] },
          ],
          order: [['transactionDate', 'DESC']],
        },
      ],
    });

    if (!advance) {
      return res.status(404).json({ success: false, message: 'Advance not found' });
    }

    res.json({ success: true, data: advance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};