import { Op } from 'sequelize';
import { sequelize, Sale, SaleItem, Customer, Payment, ExchangeItem } from '../models/index.js';

export const createSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      customerId,
      items,
      goldRate,
      isGst,
      exchangeItems,
      paidAmount,
      paymentMode,
      notes,
    } = req.body;

    console.log('req.user:', req.user);
    console.log('items received:', items);
    console.log('exchangeItems received:', exchangeItems);
    console.log('paidAmount received:', paidAmount);

    // shopId check
    const shopId = req.user?.shopId;
    if (!shopId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'shopId missing. Shop Admin ka token use karo.',
      });
    }

    // items check
    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'items array required hai.',
      });
    }

    if (!customerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'customerId required hai' });
    }

    if (!goldRate) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'goldRate required hai' });
    }

    // Invoice Number
    const count = await Sale.count({ where: { shopId } });
    const year  = new Date().getFullYear();
    const seq   = String(count + 1).padStart(4, '0');
    const invoiceNumber = `INV-${shopId}-${year}-${seq}`;

    // Items Calculate
    let subtotal = 0;
    const processedItems = items.map(item => {
      const netWeight  = Math.max(0, parseFloat(item.grossWeight || 0) - parseFloat(item.stoneWeight || 0));
      const goldValue  = netWeight * parseFloat(goldRate);

      // ── FIX: makingChargesPercent se calculate karo ──
      const makingPercent = parseFloat(item.makingChargesPercent || 0);
      const making = makingPercent > 0
        ? parseFloat(((makingPercent / 100) * goldValue).toFixed(2))
        : parseFloat(item.makingCharges || 0);  // fallback: flat amount

      const stoneCharges = parseFloat(item.stoneCharges || 0);
      const itemTotal    = goldValue + making + stoneCharges;
      subtotal += itemTotal;

      return {
        itemName:      item.itemName  || 'Item',
        huid:          item.huid      || null,
        purity:        item.purity    || '22K',
        grossWeight:   parseFloat(item.grossWeight || 0),
        stoneWeight:   parseFloat(item.stoneWeight || 0),
        netWeight:     parseFloat(netWeight.toFixed(3)),
        makingCharges: making,         // ← ab sahi value store hogi
        stoneCharges,
        itemTotal:     parseFloat(itemTotal.toFixed(2)),
        quantity:      item.quantity  || 1,
      };
    });

    console.log('subtotal:', subtotal);

    // GST
    const cgstAmount = isGst ? parseFloat((subtotal * 0.015).toFixed(2)) : 0;
    const sgstAmount = isGst ? parseFloat((subtotal * 0.015).toFixed(2)) : 0;

    console.log('cgst:', cgstAmount, 'sgst:', sgstAmount);

    // Exchange
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

    console.log('totalExchangeValue:', totalExchangeValue);

    // Final Total — discount nahi hai
    const totalAmount = parseFloat(
      (subtotal + cgstAmount + sgstAmount - totalExchangeValue).toFixed(2)
    );

    console.log('totalAmount (final):', totalAmount);

    const paid   = parseFloat(paidAmount || 0);
    const due    = parseFloat(Math.max(0, totalAmount - paid).toFixed(2));
    const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due';

    const sale = await Sale.create(
      {
        shopId,
        customerId,
        invoiceNumber,
        saleDate:       new Date(),
        goldRate:       parseFloat(goldRate),
        isGst:          !!isGst,
        subtotal:       parseFloat(subtotal.toFixed(2)),
        cgstAmount,
        sgstAmount,
        exchangeValue:  parseFloat(totalExchangeValue.toFixed(2)),
        discountAmount: 0,
        totalAmount,
        paidAmount:     paid,
        dueAmount:      due,
        status,
        notes,
        paymentMode:    paymentMode || 'cash',
      },
      { transaction: t }
    );

    // Save Items
    for (const item of processedItems) {
      await SaleItem.create({ ...item, saleId: sale.id }, { transaction: t });
    }

    // Save Exchange Items
    for (const ex of processedExchange) {
      await ExchangeItem.create({ ...ex, saleId: sale.id }, { transaction: t });
    }

    // Payment record
    if (paid > 0) {
      await Payment.create(
        {
          saleId:      sale.id,
          shopId,
          customerId,
          amount:      paid,
          paymentDate: new Date(),
          paymentMode: paymentMode || 'cash',
        },
        { transaction: t }
      );
    }

    // Update Customer Due
    await Customer.increment(
      'totalDue',
      { by: due, where: { id: customerId }, transaction: t }
    );

    await t.commit();

    // Full response with all relations
    const fullSale = await Sale.findByPk(sale.id, {
      include: [
        { model: SaleItem,     as: 'items' },
        { model: ExchangeItem, as: 'exchangeItems' },
        { model: Customer,     as: 'customer' },
        { model: Payment,      as: 'payments' },
      ],
    });

    res.status(201).json({ success: true, data: fullSale });

  } catch (error) {
    await t.rollback();
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// get All Sales
export const getAllSales = async (req, res) => {
  try {
    const {
      status,
      customerId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const shopId = req.user.shopId;

    const where = { shopId };

    if (status) {
      where.status = { [Op.in]: status.split(',') };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate && endDate) {
      where.saleDate = {
        [Op.between]: [startDate, endDate],
      };
    }

    const searchCondition = search
      ? {
          [Op.or]: [
            { invoiceNumber: { [Op.like]: `%${search}%` } },
            { '$customer.name$': { [Op.like]: `%${search}%` } },
            { '$customer.phone$': { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows: sales } = await Sale.findAndCountAll({
      where: {
        ...where,
        ...searchCondition,
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone'],
        },
        { model: Payment,  as: 'payments' },
        { model: SaleItem, as: 'items' },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      subQuery: false,
    });

    return res.json({
      success: true,
      data: sales,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      where: { id: req.params.id, shopId: req.user.shopId },
      include: [
        { model: SaleItem,     as: 'items' },
        { model: ExchangeItem, as: 'exchangeItems' },
        { model: Customer,     as: 'customer' },
        { model: Payment,      as: 'payments' },
      ],
    });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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