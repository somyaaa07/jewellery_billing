// =============================================
// MODULE: config/database.js
// KYA KARTA HAI: MySQL se connection banata hai
// KYUN: Ek jagah connection banao, sab jagah use karo
// =============================================

import { Sequelize } from 'sequelize';
import 'dotenv/config';

// Sequelize ek ORM (Object-Relational Mapper) hai
// Matlab: JavaScript objects === Database rows
// Tum directly SQL nahi likhte — JS code likhte ho
const sequelize = new Sequelize(
  process.env.DB_NAME,   // Database ka naam: 'jewelry_saas'
  process.env.DB_USER,   // MySQL username: 'root'
  process.env.DB_PASS,   // MySQL password
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 3306,
    dialect: 'mysql',     // Konsa database? MySQL
    logging: false,       // SQL queries terminal pe mat dikhao (production mein)

    pool: {
      max: 10,            // Maximum 10 simultaneous connections
      min: 0,
      acquire: 30000,     // 30 sec mein connection nahi mila to error
      idle:   10000       // 10 sec idle ho to connection free karo
    },

    define: {
      timestamps:  true,   // createdAt, updatedAt auto add hoga
      underscored: false,  // camelCase column names
    }
  }
);

// Connection test karo
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully!');
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    process.exit(1); // Server band karo agar DB connect nahi hua
  }
};

export default sequelize;
