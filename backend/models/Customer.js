// =============================================
// MODULE: models/Customer.js
// KYA KARTA HAI: Jewelry shop ke customers store karta hai
// KYUN: Customer track karo — due, history, contact
// MULTI-TENANT: shopId ensures Shop A ke customers
//               Shop B ko KABHI nahi dikhenge
// =============================================

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

    // ★ MULTI-TENANT KEY ★
    // Yeh column sabse important hai!
    // Har customer ek specific shop ka hai
    shopId: {
      type:       DataTypes.INTEGER,
      allowNull:  false,
      references: { model: 'shops', key: 'id' },
    },

    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      // Example: "Ramesh Kumar"
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
      // Running total of unpaid amount
      // Har naye bill ke baad update hota hai
      // Example: ₹15,000 abhi bhi baaki hai
    },

    notes: {
      type: DataTypes.TEXT,
      // Shop ke private notes about customer
    },
  },
  {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',

    indexes: [
      // Phone se customer dhundhna fast hoga
      { fields: ['shopId', 'phone'] },
    ],
  }
);

export default Customer;
