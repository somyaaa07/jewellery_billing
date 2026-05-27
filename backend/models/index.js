// =============================================
// MODULE: models/index.js (FIXED)
// FIX 1: ExchangeItem ab apni alag file se import hota hai
// FIX 2: Sab default imports hain — named import nahi
// =============================================

import sequelize    from '../config/database.js';
import Shop         from './Shop.js';
import User         from './User.js';
import Customer     from './Customer.js';
import Subscription from './Subscription.js';
import Sale         from './Sale.js';
import SaleItem     from './SaleItem.js';
import Payment      from './Payment.js';
import ExchangeItem from './ExchangeItem.js';   // ← ab alag file se

// ─────────────────────────────────────────────
// ASSOCIATIONS
// ─────────────────────────────────────────────

// Shop → Users
Shop.hasMany(User,            { foreignKey: 'shopId', as: 'users' });
User.belongsTo(Shop,          { foreignKey: 'shopId', as: 'shop' });

// Shop → Subscriptions
Shop.hasMany(Subscription,    { foreignKey: 'shopId', as: 'subscriptions' });
Subscription.belongsTo(Shop,  { foreignKey: 'shopId', as: 'shop' });

// Shop → Customers
Shop.hasMany(Customer,        { foreignKey: 'shopId', as: 'customers' });
Customer.belongsTo(Shop,      { foreignKey: 'shopId', as: 'shop' });

// Shop → Sales
Shop.hasMany(Sale,            { foreignKey: 'shopId', as: 'sales' });
Sale.belongsTo(Shop,          { foreignKey: 'shopId', as: 'shop' });

// Customer → Sales
Customer.hasMany(Sale,        { foreignKey: 'customerId', as: 'sales' });
Sale.belongsTo(Customer,      { foreignKey: 'customerId', as: 'customer' });

// Sale → SaleItems
Sale.hasMany(SaleItem,        { foreignKey: 'saleId', as: 'items' });
SaleItem.belongsTo(Sale,      { foreignKey: 'saleId', as: 'sale' });

// Sale → Payments
Sale.hasMany(Payment,         { foreignKey: 'saleId', as: 'payments' });
Payment.belongsTo(Sale,       { foreignKey: 'saleId', as: 'sale' });

// Sale → ExchangeItems
Sale.hasMany(ExchangeItem,    { foreignKey: 'saleId', as: 'exchangeItems' });
ExchangeItem.belongsTo(Sale,  { foreignKey: 'saleId', as: 'sale' });

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
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
};
