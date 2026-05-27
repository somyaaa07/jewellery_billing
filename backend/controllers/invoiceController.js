import { generateInvoicePDF } from '../services/invoiceService.js';
import Sale from '../models/Sale.js';   
import invoice from '../routes/invoice.js';

export const viewInvoice = async (req, res) => {
  try {
    const pdf = await generateInvoicePDF(req.params.id, req.user.shopId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');  // opens in browser tab
    res.send(pdf);
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const pdf = await generateInvoicePDF(req.params.id, req.user.shopId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`); // forces download
    res.send(pdf);
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

/**
 *  WHATSAPP / PUBLIC DOWNLOAD (IMPORTANT FIX)
 */
export const downloadInvoicePublic = async (req, res) => {
  try {
    const { token } = req.params;

    const sale = await Sale.findOne({ shareToken: token });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired link"
      });
    }

    const pdf = await generateInvoicePDF(
      sale._id,
      sale.shopId
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${sale._id}.pdf"`
    );

    res.send(pdf);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//pagination add 
export const getInvoices = async (req, res) => {
  try {
    // page and limit from query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // skip calculation
    const skip = (page - 1) * limit;

    // total invoices count
    const total = await Invoice.countDocuments();

    // paginated invoices
    const invoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      invoices,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalInvoices: total,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};