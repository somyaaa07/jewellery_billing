// =============================================
// MODULE: middleware/auth.js
// KYA KARTA HAI: JWT token verify karta hai
// KYUN: Protected routes pe pehle yeh chalta hai
//       Token valid? → Controller chalao
//       Token nahi?  → 401 error return karo
//
// FLOW:
//   Browser → Request (with token in header)
//   → auth middleware token check karta hai
//   → valid? req.user set karo → aage jao
//   → invalid? 401 return karo
// =============================================

import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
  // ─── Step 1: Header se token nikalo ───────
  // Frontend aise bhejta hai:
  // headers: { "Authorization": "Bearer eyJhbGciOiJ..." }
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login first.',
    });
  }

  // "Bearer eyJhbGciOiJ..." → "eyJhbGciOiJ..."
  const token = authHeader.split(' ')[1];

  // ─── Step 2: Token verify karo ────────────
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id: 5, role: 'shop_admin', shopId: 2, iat: ..., exp: ... }

    // ─── Step 3: User info request pe attach karo ──
    // Ab koi bhi controller req.user se info le sakta hai
    req.user = decoded;
    next(); // ✅ Aage jao — controller chalao
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

export default auth;
