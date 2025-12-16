import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://103.38.50.149:5006/api';

import { getToken } from './authService';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
  getByFundNumber: (fundNumber) => api.get(`/customers/fund/${fundNumber}`),
};

export const schemesAPI = {
  getAll: (params) => api.get('/schemes', { params }),
  getMembers: (params) => api.get('/schemes/members', { params }),
  getById: (id) => api.get(`/schemes/${id}`),
  create: (data) => api.post('/schemes', data),
  update: (id, data) => api.put(`/schemes/${id}`, data),
  delete: (id) => api.delete(`/schemes/${id}`),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getByCustomer: (customerId) => api.get(`/payments/customer/${customerId}`),
  getDues: (fundNumber) => api.get(`/payments/dues/${fundNumber}`),
  create: (data) => api.post('/payments', data),
  payAll: (data) => api.post('/payments/pay-all', data),
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
