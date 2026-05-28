// =============================================
// MODULE: routes/invoice.js
// FIX: Yeh file missing thi — ab create kar di
// MODULE: routes/invoice.js (HYBRID VERSION)
// =============================================

import { Router }            from 'express';
import { generateInvoicePDF } from '../services/invoiceService.js';
import auth                  from '../middleware/auth.js';
import { subscriptionCheck } from '../middleware/roleCheck.js';
import { viewInvoice, downloadInvoice,downloadInvoicePublic } from '../controllers/invoiceController.js';
const router = Router();

router.get('/:saleId', auth, subscriptionCheck, async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePDF(
      req.params.saleId,
      req.user.shopId
    );
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${req.params.saleId}.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Invoice error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Force download
router.get('/:saleId/download', auth, subscriptionCheck, async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePDF(
      req.params.saleId,
      req.user.shopId
    );
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${req.params.saleId}.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id',          auth, viewInvoice);
router.get('/:id/download', auth, downloadInvoice);


router.get('/public/:token/download', downloadInvoicePublic);

export default router;
