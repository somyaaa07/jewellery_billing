import jwt    from 'jsonwebtoken';
import crypto from 'crypto';
import { User, Shop ,Subscription } from '../models/index.js';

export const registerSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, setupKey } = req.body;
 
    // ── Layer 1: setupKey verify ──────────────
    if (!setupKey || setupKey !== process.env.SETUP_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',  // intentionally vague — hacker ko hint mat do
      });
    }
 
    // ── Layer 2: Super admin already exist? ───
    const existing = await User.findOne({ where: { role: 'super_admin' } });
    if (existing) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',  // same vague message — reveal mat karo ki exist karta hai
      });
    }
 
    // ── Layer 3: Validation ───────────────────
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Sab fields required hain' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password minimum 8 characters ka hona chahiye' });
    }
 
    // ── Create super admin ────────────────────
    const superAdmin = await User.create({
      name, email, password,
      role: 'super_admin', shopId: null,
    });
 
    const token = jwt.sign(
      { id: superAdmin.id, role: 'super_admin', shopId: null, name: superAdmin.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
 
    // ── After success: Log it ─────────────────
    console.log(`✅ Super Admin created: ${email} at ${new Date().toISOString()}`);
 
    res.status(201).json({
      success: true,
      message: 'Super Admin registered successfully!',
      token,
      user: superAdmin,
    });
 
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Email already registered hai' });
    }
    console.error('Super admin registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const registerShopAdmin = async (req, res) => {
  try {
    const { name, email, password, inviteToken } = req.body;

    if (!name || !email || !password || !inviteToken) {
      return res.status(400).json({
        success: false,
        message: 'Sab fields fill karo — name, email, password, inviteToken',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimum 6 characters ka hona chahiye',
      });
    }

    const shop = await Shop.findOne({
      where: { inviteToken, inviteTokenUsed: false },
    });

    if (!shop) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ya already used invite token. Super admin se naya token lo.',
      });
    }

    if (shop.inviteTokenExpiry && new Date(shop.inviteTokenExpiry) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invite token expire ho gaya (48hr limit). Super admin se naya lo.',
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered hai' });
    }

    const admin = await User.create({
      name, email, password,
      role: 'shop_admin', shopId: shop.id,
    });

    await shop.update({ inviteTokenUsed: true });

    const token = jwt.sign(
      { id: admin.id, role: 'shop_admin', shopId: shop.id, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: `Welcome! "${shop.name}" mein register ho gaye.`,
      token,
      user: {
        id: admin.id, name: admin.name,
        email: admin.email, role: admin.role,
        shopId: admin.shopId,
        shop: { id: shop.id, name: shop.name },
      },
    });

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Email already registered hai' });
    }
    console.error('Shop admin registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const generateInviteToken = async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.params.shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const inviteToken       = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await shop.update({ inviteToken, inviteTokenExpiry, inviteTokenUsed: false });

    const registrationLink = `${process.env.FRONTEND_URL}/register/shop-admin?token=${inviteToken}`;

    res.json({
      success: true,
      message: 'Invite token generated! 48 ghante valid hai.',
      data: { inviteToken, inviteTokenExpiry, registrationLink, shopName: shop.name },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const validateInviteToken = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      where: { inviteToken: req.params.token, inviteTokenUsed: false },
      attributes: ['id', 'name', 'inviteTokenExpiry'],
    });

    if (!shop) {
      return res.status(400).json({ success: false, message: 'Invalid ya expired token' });
    }

    if (new Date(shop.inviteTokenExpiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Token expire ho gaya' });
    }

    res.json({ success: true, shopName: shop.name, shopId: shop.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email aur password chahiye' });
    }

    const user = await User.findOne({
      where: { email, isActive: true },
      include: [{ model: Shop, as: 'shop', attributes: ['id', 'name', 'gstin', 'logoUrl', 'isActive'] }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai' });
    }

// ── Block if shop is inactive ──────────────
if (user.role === 'shop_admin' || user.role === 'shop_staff') {
  if (!user.shop || !user.shop.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your shop has been deactivated. Please contact support.',
      code:    'SHOP_INACTIVE',
    });
  }

  // ── Block if subscription is expired ──────
  const activeSubscription = await Subscription.findOne({
    where: {
      shopId:   user.shopId,
      isActive: true,
    },
    order: [['endDate', 'DESC']],
  });

  if (!activeSubscription) {
    return res.status(403).json({
      success: false,
      message: 'Your subscription has expired. Kindly renew it to continue.',
      code:    'SUBSCRIPTION_EXPIRED',
    });
  }

  if (new Date(activeSubscription.endDate) < new Date()) {
    // Auto-deactivate the expired subscription
    await activeSubscription.update({ isActive: false });

    return res.status(403).json({
      success: false,
      message: 'Your subscription has expired. Kindly renew it to continue.',
      code:    'SUBSCRIPTION_EXPIRED',
    });
  }
  // ──────────────────────────────────────────
}
    // ──────────────────────────────────────────

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, shopId: user.shopId, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true, token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: user.shopId, shop: user.shop },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Shop, as: 'shop' }],
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};