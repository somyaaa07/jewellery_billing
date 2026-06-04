import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwtToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwtToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login:               (d)  => api.post('/auth/login', d),
  getMe:               ()   => api.get('/auth/me'),
  registerSuperAdmin:  (d)  => api.post('/auth/register/super-admin', d),
  registerShopAdmin:   (d)  => api.post('/auth/register/shop-admin', d),
  validateInviteToken: (t)  => api.get(`/auth/validate-invite/${t}`),
  generateInviteToken: (id) => api.post(`/auth/shops/${id}/invite`),
};

export const shopAPI = {
  getAll:  ()        => api.get('/shops'),
  create:  (d)       => api.post('/shops', d),
  renew:   (id, d)   => api.post(`/shops/${id}/renew`, d),
  toggle:  (id)      => api.patch(`/shops/${id}/toggle`),
  getById: (id)      => api.get(`/shops/${id}`),  
  getExpiring:()       => api.get('/shops/expiring'),
  // services/api.js
update: (id, data) => api.put(`/shops/${id}`, data),
};

export const customerAPI = {
  getAll:  (p)    => api.get('/customers', { params: p }),
  getById: (id)   => api.get(`/customers/${id}`),
  create:  (d)    => api.post('/customers', d),
  update:  (id,d) => api.put(`/customers/${id}`, d),
  getDueCustomers: (p) =>api.get('/customers/due', { params: p }),
};

export const saleAPI = {
  getAll:     (p)    => api.get('/sales', { params: p }),
  getById:    (id)   => api.get(`/sales/${id}`),
  create:     (d)    => api.post('/sales', d),
  addPayment: (id,d) => api.post(`/sales/${id}/payment`, d),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const invoiceAPI = {
  viewUrl:     (id) => `/api/invoice/${id}`,
  downloadUrl: (id) => `/api/invoice/${id}/download`,
};

// =============================================
// ADD TO: services/api.js
// Existing advanceAPI section add karo
// =============================================

// Existing api.js ke end mein yeh add karo:

export const advanceAPI = {
  // Create new advance
  create:             (d)         => api.post('/advances', d),

  // Get all advances (with filters)
  getAll:             (p)         => api.get('/advances', { params: p }),

  // Customer ka advance list + summary
  getByCustomer:      (customerId)=> api.get(`/advances/customer/${customerId}`),

  // Quick balance check (billing form mein)
  getBalance:         (customerId)=> api.get(`/advances/balance/${customerId}`),

  // Apply advance to existing sale
  applyToSale:        (d)         => api.post('/advances/apply', d),

  // Refund
  refund:             (id, d)     => api.post(`/advances/${id}/refund`, d),

  // Transaction history for one advance
  getTransactions:    (id)        => api.get(`/advances/${id}/transactions`),

  // Reports
  getReports:         (p)         => api.get('/advances/reports', { params: p }),
};
export default api;