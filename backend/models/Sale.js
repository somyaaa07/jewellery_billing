import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Sale extends Model {}

Sale.init(
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

    invoiceNumber: {
      type:   DataTypes.STRING(20),
      unique: true,
    },

    saleDate: {
      type:         DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },

    // ── Gold Rate ─────────────────────────────
    goldRate: {
      type:         DataTypes.DECIMAL(10, 2),
      allowNull:    false,
      defaultValue: 0,
    },

    // ── Silver Rate ───────────────────────────
    silverRate: {
      type:         DataTypes.DECIMAL(10, 2),
      allowNull:    true,
      defaultValue: 0,
    },

    // ── GST Toggle ────────────────────────────
    isGst: {
      type:         DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // ── Amounts ───────────────────────────────
    subtotal: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    cgstAmount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    sgstAmount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    exchangeValue: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    discountAmount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    totalAmount: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    paidAmount: {
      type:         DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    dueAmount: {
      type:         DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    paymentMode: {
      type:         DataTypes.ENUM('cash', 'card', 'upi', 'cheque', 'bank_transfer'),
      defaultValue: 'cash',
    },

    advanceUsed: {
      type:         DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    status: {
      type:         DataTypes.ENUM('paid', 'partial', 'due'),
      defaultValue: 'due',
    },

    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'Sale',
    tableName: 'sales',
    indexes: [
      { fields: ['shopId', 'saleDate'] },
      { fields: ['shopId', 'status'] },
    ],
  }
);

export default Sale;