// =============================================
// MODULE: models/User.js
// KYA KARTA HAI: 'users' table — login accounts
// KYUN: Super Admin + Shop Admins dono yahan hain
// IMPORTANT: Password KABHI bhi plain text save nahi hota
// =============================================

import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

class User extends Model {

  // Instance method — password compare karne ke liye
  // Usage: await user.comparePassword('entered_password')
  async comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  }

  // JSON response mein password mat bhejo kabhi
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}

User.init(
  {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },

    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },

    email: {
      type:      DataTypes.STRING(100),
      unique:    true,
      allowNull: false,
      validate: {
        isEmail: true,   // Sequelize email format validate karega
      },
    },

    password: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      // KABHI BHAI plain text save mat karo
      // bcrypt hash store hota hai yahan
      // Example hash: "$2a$10$XyZ123..."
    },

    role: {
      type:         DataTypes.ENUM('super_admin', 'shop_admin'),
      defaultValue: 'shop_admin',
      // super_admin  = poore system ka control
      // shop_admin   = sirf apni shop ka control
    },

    shopId: {
      type:       DataTypes.INTEGER,
      allowNull:  true,    // super_admin ke liye NULL hoga
      references: {
        model: 'shops',
        key:   'id',
      },
      // shop_admin ke liye — konsi shop ka admin hai
    },

    isActive: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',

    hooks: {
      // =============================================
      // HOOK: Password automatically hash hoga
      // SAVE karne se PEHLE yeh chalta hai
      // Matlab: tum plain password bhejo,
      // database mein hash save hoga
      // =============================================
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          // Salt rounds = 10: jitna zyada, utna secure
          // lekin thoda slow (10 is perfect balance)
          user.password = await bcrypt.hash(user.password, salt);
        }
      },

      beforeUpdate: async (user) => {
        // Agar password change ho raha hai tabhi hash karo
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
