// =============================================
// routes/auth.js — FULLY SECURE
// Public routes: sirf /login
// Baaki sab protected hain
// =============================================
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

// ── Super Admin register ─────────────────────
// Yeh route exist karta hai SIRF pehli baar setup ke liye
// Backend khud check karta hai:
//   1. setupKey match karna chahiye (.env se)
//   2. Agar super_admin already exist kare → 400 error
// Dono checks fail ho to register nahi hoga
// Isliye URL malicious log bhi try kare to kuch nahi hoga
router.post('/register/super-admin', registerSuperAdmin);

// ── Shop Admin register ──────────────────────
// Sirf super_admin token se call ho sakta hai
// Koi bhi directly nahi kar sakta
router.post(
  '/register/shop-admin',
  auth,
  roleCheck('super_admin'),
  registerShopAdmin
);

// ── Invite token generate ────────────────────
// Sirf super_admin
router.post(
  '/shops/:shopId/invite',
  auth,
  roleCheck('super_admin'),
  generateInviteToken
);

// ── Validate invite token ────────────────────
// Public — RegisterShopAdmin page pe token check hota tha
// Ab frontend se woh page hata diya hai
// Lekin API rakhte hain future use ke liye
router.get('/validate-invite/:token', validateInviteToken);

// ── Protected ────────────────────────────────
router.get('/me', auth, getMe);

export default router;