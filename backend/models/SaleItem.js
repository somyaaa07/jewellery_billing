

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
    },

    huid: {
      type: DataTypes.STRING(20),
    },

    purity: {
      type:         DataTypes.STRING(10),
      defaultValue: '22K',
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

    makingChargesPercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
   
    },

    stoneCharges: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    
    },

    itemTotal: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
   
    },
  makingCharges: {
  type:         DataTypes.DECIMAL(10, 2),
  defaultValue: 0,
  field:        'making_charges',   
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
