// =============================================
// MODULE: routes/shops.js
// =============================================
import { Router } from 'express';
import {
  getAllShops, createShop,
  renewSubscription, toggleShopStatus, getShopById, getExpiringShops
} from '../controllers/shopController.js';
import auth from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

// Sirf super_admin in routes ko access kar sakta hai
router.get( '/',                  auth, roleCheck('super_admin'), getAllShops);
router.post('/',                  auth, roleCheck('super_admin'), createShop);
router.post('/:shopId/renew',     auth, roleCheck('super_admin'), renewSubscription);
router.patch('/:id/toggle',       auth, roleCheck('super_admin'), toggleShopStatus);
router.get('/expiring', getExpiringShops); // ← must be BEFORE /:id route
router.get('/:id',      getShopById);
export default router;
