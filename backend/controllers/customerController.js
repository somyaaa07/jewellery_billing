// =============================================
// MODULE: controllers/customerController.js
// =============================================
import { Op } from 'sequelize';
import { Customer, Sale } from '../models/index.js';

// export const getCustomers = async (req, res) => {
//   try {
//     const { search, page = 1, limit = 20 } = req.query;
//     const shopId = req.user.shopId;
//     const where  = { shopId };

//     if (search) {
//       where[Op.or] = [
//         { name:  { [Op.like]: `%${search}%` } },
//         { phone: { [Op.like]: `%${search}%` } },
//       ];
//     }

//     const { count, rows } = await Customer.findAndCountAll({
//       where,
//       order:  [['name', 'ASC']],
//       limit:  parseInt(limit),
//       offset: (parseInt(page) - 1) * parseInt(limit),
//     });

//     res.json({ success: true, data: rows, pagination: { total: count } });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };
export const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const shopId = req.user.shopId;

    // Convert to numbers
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const where = { shopId };

    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    // Pagination calculation
    const offset = (pageNumber - 1) * pageSize;

    const { count, rows } = await Customer.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: pageSize,
      offset,
    });

    // Total pages
    const totalPages = Math.ceil(count / pageSize);

    res.json({
      success: true,
      data: rows,

      pagination: {
        totalItems: count,
        totalPages,
        currentPage: pageNumber,
        pageSize,

        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,

        nextPage:
          pageNumber < totalPages ? pageNumber + 1 : null,

        prevPage:
          pageNumber > 1 ? pageNumber - 1 : null,
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      shopId: req.user.shopId,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where:   { id: req.params.id, shopId: req.user.shopId },
      include: [{ model: Sale, as: 'sales', order: [['createdAt', 'DESC']], limit: 10 }],
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, shopId: req.user.shopId }
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    await customer.update(req.body);
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Add pagination and search in due customer
export const getDueCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const offset = (pageNumber - 1) * pageSize;

    const where = {
      shopId: req.user.shopId,
      totalDue: {
        [Op.gt]: 0,
      },
    };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: pageSize,
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: pageNumber,
        pageSize,
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};