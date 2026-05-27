// =============================================
// MODULE: models/ExchangeItem.js  (ALAG FILE)
// KYA KARTA HAI: Old gold exchange details store karta hai
// FIX: Payment.js se nikal ke apni file mein rakha
//      Taaki default export properly kaam kare
// =============================================

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class ExchangeItem extends Model {}

ExchangeItem.init(
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

    itemDescription: {
      type: DataTypes.STRING(100),
      // Example: "Old Gold Ring 22K", "Broken chain"
    },

    grossWeight: {
      type:      DataTypes.DECIMAL(8, 3),
      allowNull: false,
      // Old gold ka weight — Example: 5.000 grams
    },

    purity: {
      type:         DataTypes.STRING(10),
      defaultValue: '22K',
    },

    exchangeRate: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
      // Rate jisme old gold value kiya — Example: ₹6,800/gram
    },

    exchangeValue: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
      // = grossWeight × exchangeRate
      // Example: 5 × 6800 = ₹34,000 (bill se minus hota hai)
    },
  },
  {
    sequelize,
    modelName: 'ExchangeItem',
    tableName: 'exchange_items',
  }
);

export default ExchangeItem;
