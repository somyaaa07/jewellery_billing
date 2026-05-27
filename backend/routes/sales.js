// MODULE: routes/sales.js
// =============================================
import { Router } from 'express';
import {
  createSale, getAllSales,
  getSaleById, addPayment
} from '../controllers/saleController.js';
import auth from '../middleware/auth.js';
import { subscriptionCheck } from '../middleware/roleCheck.js';

const router = Router();

// auth + subscriptionCheck — dono zaruri hain
router.get( '/',            auth, subscriptionCheck, getAllSales);
router.post('/',            auth, subscriptionCheck, createSale);
router.get( '/:id',         auth, subscriptionCheck, getSaleById);
router.post('/:id/payment', auth, subscriptionCheck, addPayment);


export default router;
