
import { Router } from 'express';
import {
  login,
  getMe,
  registerSuperAdmin,
  registerShopAdmin,
  generateInviteToken,
  validateInviteToken,
} from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

// ── ONLY truly public route ──────────────────
router.post('/login', login);
// need setup key for super admin
router.post('/register/super-admin', registerSuperAdmin);


router.post(
  '/register/shop-admin',
  auth,
  roleCheck('super_admin'),
  registerShopAdmin
);


router.post(
  '/shops/:shopId/invite',
  auth,
  roleCheck('super_admin'),
  generateInviteToken
);


router.get('/validate-invite/:token', validateInviteToken);

router.get('/me', auth, getMe);

export default router;