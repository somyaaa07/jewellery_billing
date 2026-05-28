

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Shop extends Model {}

Shop.init(
  {
    id:          { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(100),  allowNull: false },
    ownerName:   { type: DataTypes.STRING(100),  allowNull: false },
    phone:       { type: DataTypes.STRING(15),   allowNull: false },
    email:       { type: DataTypes.STRING(100),  unique: true },
    address:     { type: DataTypes.TEXT },
    city:        { type: DataTypes.STRING(50) },
    state:       { type: DataTypes.STRING(50) },
    gstin:       { type: DataTypes.STRING(20) },
    logoUrl:     { type: DataTypes.STRING(255) },
    isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },

    inviteToken: {
      type:      DataTypes.STRING(64),
      allowNull: true,
    },
    inviteTokenExpiry: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    inviteTokenUsed: {
      type:         DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Shop',
    tableName: 'shops',
  }
);

export default Shop;
