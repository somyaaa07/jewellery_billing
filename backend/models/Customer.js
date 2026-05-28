

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Customer extends Model {}

Customer.init(
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

    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },

    phone: {
      type:   DataTypes.STRING(15),
      
    },

    email: {
      type: DataTypes.STRING(100),
    },

    address: {
      type: DataTypes.TEXT,
    },

    city: {
      type: DataTypes.STRING(50),
    },

    totalDue: {
      type:         DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
  
    },

    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',

    indexes: [
      { fields: ['shopId', 'phone'] },
    ],
  }
);

export default Customer;
