// =============================================
// MODULE: models/Payment.js
// KYA KARTA HAI: Payment records store karta hai
// FIX: ExchangeItem ko hataya — woh ab alag file mein hai
// =============================================

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Payment extends Model {}

Payment.init(
  {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },

    saleId: {
      type:       DataTypes.INTEGER,
      allowNull:  false,
      references: { model: 'sales', key: 'id' },
    },

    shopId: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },

    customerId: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },

    amount: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
      // Is payment mein kitna diya — Example: ₹20,000
    },

    paymentDate: {
      type:         DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    paymentMode: {
      type:         DataTypes.ENUM('cash', 'upi', 'card', 'bank_transfer', 'cheque'),
      
    },

    referenceNumber: {
      type: DataTypes.STRING(50),
      // UPI transaction ID, cheque number etc.
    },

    notes: {
      type: DataTypes.STRING(200),
    },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
  }
);

export default Payment;
