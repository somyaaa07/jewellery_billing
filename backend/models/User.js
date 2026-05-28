
import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

class User extends Model {


  async comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  }

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
        isEmail: true,   
      },
    },

    password: {
      type:      DataTypes.STRING(255),
      allowNull: false,

    },

    role: {
      type:         DataTypes.ENUM('super_admin', 'shop_admin'),
      defaultValue: 'shop_admin',
     
    },

    shopId: {
      type:       DataTypes.INTEGER,
      allowNull:  true,    
      references: {
        model: 'shops',
        key:   'id',
      },
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
     
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          
          user.password = await bcrypt.hash(user.password, salt);
        }
      },

      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
