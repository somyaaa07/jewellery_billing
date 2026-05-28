

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Subscription extends Model {

  isValid() {
    if (!this.isActive) return false;
    return new Date(this.endDate) >= new Date();
  }

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
    
    },

    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    amount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      
    },

    isActive: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
    },

    notes: {
      type: DataTypes.TEXT,
      
    },
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
  }
);

export default Subscription;
