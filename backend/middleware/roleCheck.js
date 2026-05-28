export const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }
    next();
  };
};

import { Subscription } from '../models/index.js';

export const subscriptionCheck = async (req, res, next) => {

  if (req.user.role === 'super_admin') return next();

  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  [DEV MODE] Subscription check skipped for:', req.user.name);
    return next();
  }

  try {
    const subscription = await Subscription.findOne({
      where: { shopId: req.user.shopId, isActive: true },
      order: [['endDate', 'DESC']],
    });

    if (!subscription) {
      return res.status(403).json({
        success:   false,
        message:   'No active subscription found. Please contact admin.',
        errorCode: 'NO_SUBSCRIPTION',
      });
    }

    const today   = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(subscription.endDate);

    if (endDate < today) {
      return res.status(403).json({
        success:   false,
        message:   'Subscription expired. Please renew.',
        errorCode: 'SUBSCRIPTION_EXPIRED',
        expiredOn: subscription.endDate,
      });
    }

    next();
  } catch (error) {
    console.error('subscriptionCheck error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};