// =============================================
// MODEL: AdvanceTransaction.js
// KYA HAI: Har advance ka complete audit trail
//
// Types:
//   received   = Customer ne advance diya
//   utilized   = Sale mein use kiya
//   refunded   = Wapas kiya
//   adjusted   = Manual adjustment
//
// EXAMPLE:
//   received  ₹10,000  → advancePaymentId: 1
//   utilized  ₹3,000   → advancePaymentId: 1, saleId: 5
//   refunded  ₹2,000   → advancePaymentId: 1
// =============================================

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class AdvanceTransaction extends Model {}

AdvanceTransaction.init(
  {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },

    shopId: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },

    customerId: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },

    advancePaymentId: {
      type:       DataTypes.INTEGER,
      allowNull:  false,
      references: { model: 'advance_payments', key: 'id' },
      // Kis advance se linked hai yeh transaction
    },

    saleId: {
      type:       DataTypes.INTEGER,
      allowNull:  true,  // null = sale se linked nahi (received/refunded)
      references: { model: 'sales', key: 'id' },
    },

    type: {
      type:      DataTypes.ENUM('received', 'utilized', 'refunded', 'adjusted'),
      allowNull: false,
    },

    amount: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
      // Positive = credit (received/refunded)
      // Negative = debit (utilized)
    },

    balanceBefore: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
      // Balance before this transaction
    },

    balanceAfter: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
      // Balance after this transaction
    },

    notes: {
      type: DataTypes.STRING(255),
    },

    transactionDate: {
      type:         DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'AdvanceTransaction',
    tableName: 'advance_transactions',
    indexes: [
      { fields: ['shopId', 'customerId'] },
      { fields: ['advancePaymentId'] },
      { fields: ['saleId'] },
    ],
  }
);

export default AdvanceTransaction;