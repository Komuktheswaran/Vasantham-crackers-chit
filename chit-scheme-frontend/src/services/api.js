import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000000000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  checkId: (id) => api.get(`/customers/check/${id}`), // Check for ID existence
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getSchemes: (id) => api.get(`/customers/${id}/schemes`),
  assignSchemes: (id, schemeIds) => api.post(`/customers/${id}/schemes`, { schemeIds }),
};

export const schemesAPI = {
  getAll: () => api.get('/schemes'),
  getById: (id) => api.get(`/schemes/${id}`),
  create: (data) => api.post('/schemes', data),
  update: (id, data) => api.put(`/schemes/${id}`, data),
  delete: (id) => api.delete(`/schemes/${id}`),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getByCustomer: (customerId) => api.get(`/payments/customer/${customerId}`),
  getDues: (customerId, schemeId) => api.get(`/payments/dues/${customerId}/${schemeId}`),
  create: (data) => api.post('/payments', data),
};

export const statesAPI = {
  getAll: () => api.get('/states'),
};

export const districtsAPI = {
  getAll: () => api.get('/districts'),
};

export const dashboardAPI = {
  getMonthlyStats: (year, customerId, schemeId) => {
    const params = { year };
    if (customerId) params.customerId = customerId;
    if (schemeId) params.schemeId = schemeId;
    return api.get('/dashboard/monthly-stats', { params });
  },
  getCustomerStats: () => api.get('/dashboard/customer-stats'),
  getCustomerDetails: (customerId) => api.get(`/dashboard/customer/${customerId}`),
  getSchemeDetails: (schemeId) => api.get(`/dashboard/scheme/${schemeId}`),
  getMonthDetails: (year, month) => api.get(`/dashboard/month/${year}/${month}`),
};

export const exportsAPI = {
  exportCustomers: (filters) => api.get('/exports/customers', { params: filters, responseType: 'blob' }),
  exportPayments: (filters) => api.get('/exports/payments', { params: filters, responseType: 'blob' }),
  exportSchemes: (filters) => api.get('/exports/schemes', { params: filters, responseType: 'blob' }),
};

export default api;
