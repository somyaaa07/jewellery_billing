

import { Sequelize } from 'sequelize';
import 'dotenv/config';


const sequelize = new Sequelize(
  process.env.DB_NAME,   
  process.env.DB_USER,  
  process.env.DB_PASS, 
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 3306,
    dialect: 'mysql',     
    logging: false,      

    pool: {
      max: 10,            
      min: 0,
      acquire: 30000,    
      idle:   10000       
    },

    define: {
      timestamps:  true,   
      underscored: false,  
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
    process.exit(1); 
  }
};

export default sequelize;
