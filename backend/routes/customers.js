import { Router } from 'express';
import { getCustomers, createCustomer, getCustomerById, updateCustomer, getDueCustomers } from '../controllers/customerController.js';
import auth from '../middleware/auth.js';
import { subscriptionCheck } from '../middleware/roleCheck.js';

const router = Router();

router.get('/', auth, subscriptionCheck, getCustomers);
router.post('/', auth, subscriptionCheck, createCustomer);
router.get('/due', auth, subscriptionCheck, getDueCustomers); // MUST come before /:id
router.get('/:id', auth, subscriptionCheck, getCustomerById);
router.put('/:id', auth, subscriptionCheck, updateCustomer);
export default router;