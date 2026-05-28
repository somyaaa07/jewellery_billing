
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
    },

    purity: {
      type:         DataTypes.STRING(10),
      defaultValue: '22K',
    },

    exchangeRate: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    exchangeValue: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
  
    },
  },
  {
    sequelize,
    modelName: 'ExchangeItem',
    tableName: 'exchange_items',
  }
);

export default ExchangeItem;
