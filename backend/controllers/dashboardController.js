
import { Op, fn, col, literal } from 'sequelize';
import { Sale, Customer, Payment } from '../models/index.js';


export const getDashboardStats = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    // Current month boundaries
    const now            = new Date();
    const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd       = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ─ Run all queries in parallel (faster) ──
    const [
      totalSalesCount,
      totalRevenue,
      totalDue,
      monthSales,
      monthRevenue,
      recentSales,
      topCustomers,
      monthlyChart,
    ] = await Promise.all([

      // Total bills ever
      Sale.count({ where: { shopId } }),

      // Total collected amount
      Sale.sum('paidAmount', { where: { shopId } }),

      // Total pending due
      Sale.sum('dueAmount', { where: { shopId, status: { [Op.ne]: 'paid' } } }),

      // This month bills
      Sale.count({
        where: { shopId, saleDate: { [Op.between]: [monthStart, monthEnd] } },
      }),

      // This month revenue
      Sale.sum('paidAmount', {
        where: { shopId, saleDate: { [Op.between]: [monthStart, monthEnd] } },
      }),

      // Recent 5 sales
      Sale.findAll({
        where:   { shopId },
        include: [{ model: Customer, as: 'customer', attributes: ['name', 'phone'] }],
        order:   [['createdAt', 'DESC']],
        limit:   5,
      }),

      // Top customers by total purchase
      Customer.findAll({
        where:   { shopId },
        order:   [['totalDue', 'DESC']],  // highest due first (at-risk customers)
        limit:   5,
        attributes: ['id', 'name', 'phone', 'totalDue'],
      }),

      // Last 6 months chart data
      Sale.findAll({
        where: {
          shopId,
          saleDate: {
            [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          },
        },
        attributes: [
          [fn('MONTH', col('saleDate')),   'month'],
          [fn('YEAR',  col('saleDate')),   'year'],
          [fn('SUM',   col('totalAmount')), 'totalSales'],
          [fn('SUM',   col('paidAmount')),  'collected'],
          [fn('COUNT', col('id')),          'billCount'],
        ],
        group:   [literal('YEAR(saleDate)'), literal('MONTH(saleDate)')],
        order:   [literal('YEAR(saleDate) ASC, MONTH(saleDate) ASC')],
        raw:     true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalSalesCount,
          totalRevenue:   totalRevenue  || 0,
          totalDue:       totalDue      || 0,
          monthSales,
          monthRevenue:   monthRevenue  || 0,
        },
        recentSales,
        topCustomers,
        monthlyChart,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
