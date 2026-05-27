// =============================================
// MODULE: models/Subscription.js
// KYA KARTA HAI: Har shop ki subscription track karta hai
// KYUN: SaaS model — paid subscription ke bina access nahi
// EXAMPLE: Shop ne Jan 1 se Dec 31 tak yearly plan liya
// =============================================

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Subscription extends Model {

  // Helper: Aaj subscription valid hai ya nahi?
  isValid() {
    if (!this.isActive) return false;
    return new Date(this.endDate) >= new Date();
  }

  // Helper: Kitne din baaki hain?
  daysRemaining() {
    const diff = new Date(this.endDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}

Subscription.init(
  {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },

    shopId: {
      type:       DataTypes.INTEGER,
      allowNull:  false,
      references: { model: 'shops', key: 'id' },
    },

    plan: {
      type:         DataTypes.ENUM('trial', 'monthly', 'yearly'),
      defaultValue: 'trial',
      // trial   = 14 days free
      // monthly = ₹999/month
      // yearly  = ₹9999/year
    },

    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      // Yahi date check hoti hai middleware mein
    },

    amount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      // Kitna payment hua subscription ke liye
    },

    isActive: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
    },

    notes: {
      type: DataTypes.TEXT,
      // Super admin ke notes — e.g. "Renewed manually"
    },
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
  }
);

export default Subscription;
