// =============================================
// MODULE: routes/dashboard.js
// =============================================
import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import auth from '../middleware/auth.js';
import { subscriptionCheck } from '../middleware/roleCheck.js';

const router = Router();

router.get('/stats', auth, subscriptionCheck, getDashboardStats);

export default router;
