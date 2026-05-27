// =============================================
// MODULE: models/SaleItem.js
// KYA KARTA HAI: Ek sale ke andar ke items
// EXAMPLE: Sale #42 mein ring + chain + earring
// =============================================

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class SaleItem extends Model {}

SaleItem.init(
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

    itemName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      // Example: "Gold Ring", "Gold Chain 22K"
    },

    huid: {
      type: DataTypes.STRING(20),
      // Hallmark Unique ID — BIS certification
    },

    purity: {
      type:         DataTypes.STRING(10),
      defaultValue: '22K',
      // "24K", "22K", "18K"
    },

    // ── Weight Calculation ────────────────────
    // FORMULA: netWeight = grossWeight - stoneWeight
    // REASON: Stone ka weight gold mein count nahi hota
    // ─────────────────────────────────────────

    grossWeight: {
      type:      DataTypes.DECIMAL(8, 3),
      allowNull: false,
      // Total weight including stones
      // Example: 10.500 grams
    },

    stoneWeight: {
      type:         DataTypes.DECIMAL(8, 3),
      defaultValue: 0,
      // Weight of diamonds/stones embedded
      // Example: 1.200 grams
    },

    netWeight: {
      type:      DataTypes.DECIMAL(8, 3),
      allowNull: false,
      // = grossWeight - stoneWeight
      // Example: 10.500 - 1.200 = 9.300 grams
      // Gold rate is applied on THIS weight only
    },

    makingChargesPercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      //  percentage value (e.g. 5 = 5%)
      // This is applied on (netWeight × goldRate)
    },

    stoneCharges: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      // Extra charges for precious stones
    },

    itemTotal: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
      // = (netWeight × goldRate) + makingCharges + stoneCharges
      // Example: (9.3 × 7200) + 500 = ₹67,460
    },

    quantity: {
      type:         DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'SaleItem',
    tableName: 'sale_items',
  }
);

export default SaleItem;
