// =============================================
// MODULE: models/Sale.js
// KYA KARTA HAI: Main bill/invoice table
// KYUN: Ek sale mein multiple items ho sakte hain
//       isliye Sale aur SaleItem alag tables hain
// =============================================

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
      // Format: INV-001-0042
      //         INV-{shopId}-{sequence}
    },

    saleDate: {
      type:         DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },

    // ── Gold Rate ─────────────────────────────
    goldRate: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
      // Rate on the day of sale — yeh fix rehta hai
      // Example: ₹7,200 per gram
    },
    

    // ── GST Toggle ────────────────────────────
    isGst: {
      type:         DataTypes.BOOLEAN,
      defaultValue: false,
      // true  = GST invoice (GSTIN required)
      // false = Non-GST simple invoice
    },

    // ── Amounts ───────────────────────────────
    subtotal: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
      // Sab items ka total (GST se pehle)
    },

    cgstAmount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      // CGST = 1.5% (GST ka aadha)
    },

    sgstAmount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      // SGST = 1.5% (GST ka aadha)
      // Total GST = CGST + SGST = 3%
    },

    exchangeValue: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      // Old gold exchange se kitna mila
      // Yeh total se MINUS hota hai
    },

    discountAmount: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    totalAmount: {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
      // Final amount = subtotal + GST - exchange - discount
    },

    paidAmount: {
      type:         DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    dueAmount: {
      type:         DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      // dueAmount = totalAmount - paidAmount
    },
    paymentMode: {
  type:         DataTypes.ENUM('cash', 'card', 'upi', 'cheque', 'bank_transfer'),
  defaultValue: 'cash',
  // Primary payment mode for this sale
  // Detailed payment history → Payment table
},


    status: {
      type:         DataTypes.ENUM('paid', 'partial', 'due'),
      defaultValue: 'due',
      // paid    = fully paid
      // partial = kuch diya kuch baaki
      // due     = kuch nahi diya
    },
    // After the `notes` field, add:

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
