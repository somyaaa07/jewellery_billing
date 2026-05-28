
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Payment extends Model {}

Payment.init(
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

    shopId: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },

    customerId: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },

    amount: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    paymentDate: {
      type:         DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    paymentMode: {
      type:         DataTypes.ENUM('cash', 'upi', 'card', 'bank_transfer', 'cheque'),
      
    },

    referenceNumber: {
      type: DataTypes.STRING(50),
      // UPI transaction ID, cheque number etc.
    },

    notes: {
      type: DataTypes.STRING(200),
    },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
  }
);

export default Payment;
