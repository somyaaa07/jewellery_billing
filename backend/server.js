// =============================================
// MODULE: server.js
// KYA KARTA HAI: Main entry point — server start
// COMMAND: node server.js  ya  npm run dev
// =============================================

import 'dotenv/config';
import express  from 'express';
import cors     from 'cors';
import sequelize, { testConnection } from './config/database.js';
import './models/index.js';

import authRoutes      from './routes/auth.js';
import shopRoutes      from './routes/shops.js';
import customerRoutes  from './routes/customers.js';
import saleRoutes      from './routes/sales.js';
import dashboardRoutes from './routes/dashboard.js';
import invoiceRoutes   from './routes/invoice.js';
import emailRouter     from './routes/email.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── CORS — dono frontend origins allow karo ───
app.use(cors({
  origin: [
    'http://localhost:5173',   // Vite frontend
    'http://localhost:3000',   // CRA / old frontend
    process.env.FRONTEND_URL, // .env se bhi le lo
  ].filter(Boolean),          // undefined values hata do
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───
app.use('/api/auth',      authRoutes);
app.use('/api/shops',     shopRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales',     saleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoice',   invoiceRoutes);
app.use('/api',           emailRouter);


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start Server ───
const startServer = async () => {
  await testConnection();

  // alter:true hata diya — purani tables ke saath hang karta tha
  // sync() — tables nahi hain to banao, hain to reuse karo
  await sequelize.sync();
  console.log('✅ Database synced!');

  app.listen(PORT, () => {
    console.log(`🚀 Server running → http://localhost:${PORT}`);
    console.log(`📋 Health check  → http://localhost:${PORT}/health`);
  });
};

startServer();