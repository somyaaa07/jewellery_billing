import { Router }             from 'express';
import nodemailer             from 'nodemailer';
import { generateInvoicePDF } from '../services/invoiceService.js';
import auth                   from '../middleware/auth.js';
import { subscriptionCheck }  from '../middleware/roleCheck.js';
import jwt from 'jsonwebtoken';
const router = Router();

// ── View inline ──────────────────────────────────────────────
router.get('/:saleId', auth, subscriptionCheck, async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePDF(req.params.saleId, req.user.shopId);
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${req.params.saleId}.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Force download ────────────────────────────────────────────
router.get('/:saleId/download', auth, subscriptionCheck, async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePDF(req.params.saleId, req.user.shopId);
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${req.params.saleId}.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Send email with PDF attached (THE FIX) ────────────────────
router.post('/send-email', auth, async (req, res) => {
  try {
    const { email, saleId, customerName } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    // Generate PDF directly on server — no HTTP call, no auth issue
    const pdfBuffer = await generateInvoicePDF(saleId, req.user.shopId);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: `Your Invoice`,
      html: `
        <h3>Hello ${customerName || ''},</h3>
        <p>Please find your invoice attached.</p>
        <p>Thank you for your purchase!</p>
      `,
      attachments: [{
        filename:    `invoice-${saleId}.pdf`,
        content:     pdfBuffer,          // ✅ PDF buffer directly — no link needed
        contentType: 'application/pdf',
      }],
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// Generates a public link valid for 24 hours
router.get('/:saleId/whatsapp-token', auth, async (req, res) => {
  try {
    const shareToken = jwt.sign(
      { saleId: req.params.saleId, shopId: req.user.shopId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const base = process.env.VITE_API_URL || `https://ditbilling.store`;
    const publicUrl = `${base}/api/invoice/public/${shareToken}/download`;

    res.json({ publicUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public download — no auth, uses share token
router.get('/public/:token/download', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const pdfBuffer = await generateInvoicePDF(decoded.saleId, decoded.shopId);

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${decoded.saleId}.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(403).json({ message: 'Link expired or invalid' });
  }
});
export default router;