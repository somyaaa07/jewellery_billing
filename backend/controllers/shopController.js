// =============================================
// MODULE: controllers/shopController.js
// KYA KARTA HAI: Super Admin shops manage karta hai
// SUPER ADMIN KE KAAM:
//   1. Naya shop create karo
//   2. Shop admin account banao
//   3. Subscription assign karo
//   4. Shop activate/deactivate karo
// =============================================

import { Op } from 'sequelize';
import { Shop, User, Subscription } from '../models/index.js';

// ─────────────────────────────────────────────
// GET ALL SHOPS
// GET /api/shops
// Only super_admin
// ─────────────────────────────────────────────
export const getAllShops = async (req, res) => {
  try {
    const shops = await Shop.findAll({
      include: [
        {
          model: Subscription,
          as:    'subscriptions',
          where: { isActive: true },
          required: false,  // LEFT JOIN — subscription nahi hai to bhi shop show karo
          order:    [['endDate', 'DESC']],
          limit:    1,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: shops });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// CREATE SHOP + ADMIN + SUBSCRIPTION
// POST /api/shops
// Super admin ek hi call mein sab kuch banata hai
// ─────────────────────────────────────────────
export const createShop = async (req, res) => {
  try {
    const {
      // Shop details
      shopName, ownerName, phone, email,
      address, city, state, gstin,
      // Admin account
      adminName, adminEmail, adminPassword,
      // Subscription
      plan, startDate, endDate, amount,
    } = req.body;

    // ─ Step 1: Shop banao ─────────────────────
    const shop = await Shop.create({
      name:      shopName,
      ownerName, phone, email,
      address,   city, state, gstin,
    });

    // ─ Step 2: Shop Admin account banao ───────
    // Password User model ka beforeCreate hook hash karega
    const admin = await User.create({
      name:     adminName,
      email:    adminEmail,
      password: adminPassword,
      role:     'shop_admin',
      shopId:   shop.id,
    });

    // ─ Step 3: Subscription assign karo ───────
    const subscription = await Subscription.create({
      shopId:    shop.id,
      plan,
      startDate: startDate || new Date(),
      endDate,
      amount:    amount || 0,
      isActive:  true,
    });

    res.status(201).json({
      success: true,
      message: 'Shop created successfully!',
      data: { shop, admin, subscription },
    });

  } catch (error) {
    // Duplicate email error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered',
      });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// RENEW SUBSCRIPTION
// POST /api/shops/:shopId/renew
// ─────────────────────────────────────────────
export const renewSubscription = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { plan, endDate, amount } = req.body;

    // Purani subscription deactivate karo
    await Subscription.update(
      { isActive: false },
      { where: { shopId } }
    );

    // Nayi subscription banao
    const subscription = await Subscription.create({
      shopId,
      plan,
      startDate: new Date(),
      endDate,
      amount,
      isActive: true,
    });

    res.json({
      success: true,
      message: 'Subscription renewed!',
      data:    subscription,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// TOGGLE SHOP ACTIVE STATUS
// PATCH /api/shops/:id/toggle
// ─────────────────────────────────────────────
export const toggleShopStatus = async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    await shop.update({ isActive: !shop.isActive });
    res.json({
      success: true,
      message: `Shop ${shop.isActive ? 'activated' : 'deactivated'}`,
      data:    shop,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// GET /api/shops/:id
export const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.params.id, {
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          order: [['createdAt', 'DESC']],
        },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role', 'createdAt'],
        },
      ],
    });

    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    res.json({ success: true, data: shop });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/shops/expiring
// Returns shops expiring in next 7 days
export const getExpiringShops = async (req, res) => {
  try {
    const now     = new Date();
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const expiring = await Subscription.findAll({
      where: {
        isActive: true,
        endDate:  { [Op.between]: [now, in7Days] },
      },
      include: [{ model: Shop, as: 'shop', attributes: ['id', 'name', 'ownerName', 'phone'] }],
      order: [['endDate', 'ASC']],
    });

    res.json({ success: true, data: expiring });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};