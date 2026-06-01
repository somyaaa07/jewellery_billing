// =============================================
// ROUTES: routes/advances.js
// All advance payment API endpoints
// =============================================

import { Router } from 'express';
import {
  createAdvance,
  getAllAdvances,
  getCustomerAdvances,
  getCustomerBalance,
  applyAdvanceToSale,
  refundAdvance,
  getAdvanceReports,
  getAdvanceTransactions,
} from '../controllers/advanceController.js';
import auth from '../middleware/auth.js';
import { subscriptionCheck } from '../middleware/roleCheck.js';

const router = Router();

// Auth + subscription check har route pe
router.use(auth, subscriptionCheck);

// ── Create & List ──────────────────────────
router.post('/',                          createAdvance);
router.get('/',                           getAllAdvances);

// ── Reports ────────────────────────────────
router.get('/reports',                    getAdvanceReports);

// ── Customer specific ──────────────────────
router.get('/customer/:customerId',       getCustomerAdvances);
router.get('/balance/:customerId',        getCustomerBalance);

// ── Apply to Sale ──────────────────────────
router.post('/apply',                     applyAdvanceToSale);

// ── Refund ─────────────────────────────────
router.post('/:id/refund',                refundAdvance);

// ── Transaction history ────────────────────
router.get('/:id/transactions',           getAdvanceTransactions);

export default router;