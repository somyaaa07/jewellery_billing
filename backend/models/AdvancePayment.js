

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class AdvancePayment extends Model {}

AdvancePayment.init(
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

    customerId: {
      type:       DataTypes.INTEGER,
      allowNull:  false,
      references: { model: 'customers', key: 'id' },
    },

    createdBy: {
      type:       DataTypes.INTEGER,
      allowNull:  false,
      references: { model: 'users', key: 'id' },
    },

    amount: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,

    },

    remainingBalance: {
      type:         DataTypes.DECIMAL(12, 2),
      allowNull:    false,
      defaultValue: 0,
 
    },

    paymentMethod: {
      type:         DataTypes.ENUM('cash', 'upi', 'card', 'bank_transfer', 'cheque'),
      defaultValue: 'cash',
    },

    transactionReference: {
      type: DataTypes.STRING(100),
    },

    paymentDate: {
      type:         DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },

    status: {
      type:         DataTypes.ENUM('active', 'fully_used', 'refunded', 'partially_refunded'),
      defaultValue: 'active',

    },

    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'AdvancePayment',
    tableName: 'advance_payments',
    indexes: [
      { fields: ['shopId', 'customerId'] },
      { fields: ['shopId', 'status'] },
    ],
  }
);

export default AdvancePayment;