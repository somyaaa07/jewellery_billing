// =============================================
// UPDATED: server.js
// Change: advance route add kiya
// Existing routes: UNCHANGED
// =============================================

import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import sequelize, { testConnection } from './config/database.js';
// Models
import './models/index.js';

// Existing Routes
import authRoutes      from './routes/auth.js';
import shopRoutes      from './routes/shops.js';
import customerRoutes  from './routes/customers.js';
import saleRoutes      from './routes/sales.js';
import dashboardRoutes from './routes/dashboard.js';
import invoiceRoutes   from './routes/invoice.js';

// NEW: Advance payment route
import advanceRoutes   from './routes/advances.js';

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Existing routes
app.use('/api/auth',      authRoutes);
app.use('/api/shops',     shopRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales',     saleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoice',   invoiceRoutes);

// NEW route
app.use('/api/advances',  advanceRoutes);

app.get('/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const startServer = async () => {
  await testConnection();
  await sequelize.sync({ alter: true });  // auto creates new tables
  console.log('✅ Database synced!');
  app.listen(PORT, () => {
    console.log(`🚀 Server running → http://localhost:${PORT}`);
  });
};

startServer();