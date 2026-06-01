// =============================================
// UPDATED: models/index.js
// Changes: AdvancePayment + AdvanceTransaction
//          associations added
// Existing associations: UNCHANGED
// =============================================

import sequelize      from '../config/database.js';
import Shop           from './Shop.js';
import User           from './User.js';
import Customer       from './Customer.js';
import Subscription   from './Subscription.js';
import Sale           from './Sale.js';
import SaleItem       from './SaleItem.js';
import Payment        from './Payment.js';
import ExchangeItem   from './ExchangeItem.js';
import AdvancePayment from './AdvancePayment.js';
import AdvanceTransaction from './AdvanceTranscation.js';
// ── EXISTING ASSOCIATIONS (unchanged) ─────────

Shop.hasMany(User,            { foreignKey: 'shopId', as: 'users' });
User.belongsTo(Shop,          { foreignKey: 'shopId', as: 'shop' });

Shop.hasMany(Subscription,    { foreignKey: 'shopId', as: 'subscriptions' });
Subscription.belongsTo(Shop,  { foreignKey: 'shopId', as: 'shop' });

Shop.hasMany(Customer,        { foreignKey: 'shopId', as: 'customers' });
Customer.belongsTo(Shop,      { foreignKey: 'shopId', as: 'shop' });

Shop.hasMany(Sale,            { foreignKey: 'shopId', as: 'sales' });
Sale.belongsTo(Shop,          { foreignKey: 'shopId', as: 'shop' });

Customer.hasMany(Sale,        { foreignKey: 'customerId', as: 'sales' });
Sale.belongsTo(Customer,      { foreignKey: 'customerId', as: 'customer' });

Sale.hasMany(SaleItem,        { foreignKey: 'saleId', as: 'items' });
SaleItem.belongsTo(Sale,      { foreignKey: 'saleId', as: 'sale' });

Sale.hasMany(Payment,         { foreignKey: 'saleId', as: 'payments' });
Payment.belongsTo(Sale,       { foreignKey: 'saleId', as: 'sale' });

Sale.hasMany(ExchangeItem,    { foreignKey: 'saleId', as: 'exchangeItems' });
ExchangeItem.belongsTo(Sale,  { foreignKey: 'saleId', as: 'sale' });

// ── NEW: ADVANCE PAYMENT ASSOCIATIONS ─────────

// Customer ↔ AdvancePayment
Customer.hasMany(AdvancePayment,       { foreignKey: 'customerId', as: 'advances' });
AdvancePayment.belongsTo(Customer,     { foreignKey: 'customerId', as: 'customer' });

// Shop ↔ AdvancePayment
Shop.hasMany(AdvancePayment,           { foreignKey: 'shopId', as: 'advances' });
AdvancePayment.belongsTo(Shop,         { foreignKey: 'shopId', as: 'shop' });

// User ↔ AdvancePayment (kaun ne record kiya)
User.hasMany(AdvancePayment,           { foreignKey: 'createdBy', as: 'recordedAdvances' });
AdvancePayment.belongsTo(User,         { foreignKey: 'createdBy', as: 'recordedBy' });

// AdvancePayment ↔ AdvanceTransaction
AdvancePayment.hasMany(AdvanceTransaction, { foreignKey: 'advancePaymentId', as: 'transactions' });
AdvanceTransaction.belongsTo(AdvancePayment, { foreignKey: 'advancePaymentId', as: 'advance' });

// Sale ↔ AdvanceTransaction (sale mein kitna advance use hua)
Sale.hasMany(AdvanceTransaction,       { foreignKey: 'saleId', as: 'advanceTransactions' });
AdvanceTransaction.belongsTo(Sale,     { foreignKey: 'saleId', as: 'sale' });

// Customer ↔ AdvanceTransaction
Customer.hasMany(AdvanceTransaction,   { foreignKey: 'customerId', as: 'advanceTransactions' });
AdvanceTransaction.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// ── EXPORTS ───────────────────────────────────
export {
  sequelize,
  Shop,
  User,
  Customer,
  Subscription,
  Sale,
  SaleItem,
  Payment,
  ExchangeItem,
  AdvancePayment,
  AdvanceTransaction,
};