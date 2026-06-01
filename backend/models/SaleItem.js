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

    // ── NEW: Metal Type ───────────────────────
    // Controls which fields are required/shown
    metalType: {
      type:         DataTypes.ENUM('gold', 'silver'),
      defaultValue: 'gold',
      allowNull:    false,
    },

    itemName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },

    huid: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },

    // ── NEW: HSN Code ─────────────────────────
    // HSN 7113 = gold jewellery, 7114 = silver
    hsnCode: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },

    // Purity: required for Gold, optional/null for Silver
    purity: {
      type:      DataTypes.STRING(10),
      allowNull: true,   // ← changed: was no allowNull (implicitly false)
      defaultValue: null,
    },

    // ── NEW: Rate per gram (snapshot at time of sale) ──
    rate: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: true,
      // Stored here so each item knows its own rate
      // (gold rate comes from sale.goldRate but stored per item for clarity)
    },

    grossWeight: {
      type:      DataTypes.DECIMAL(8, 3),
      allowNull: false,
    },

    stoneWeight: {
      type:         DataTypes.DECIMAL(8, 3),
      defaultValue: 0,
    },

    netWeight: {
      type:      DataTypes.DECIMAL(8, 3),
      allowNull: false,
    },

    // Making charges: required for Gold, NULL for Silver
    makingChargesPercent: {
      type:         DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull:    true,
    },

    makingCharges: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull:    true,
      field:        'making_charges',
    },

    stoneCharges: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    itemTotal: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
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