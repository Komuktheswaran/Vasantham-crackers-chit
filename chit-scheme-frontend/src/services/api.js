import axios from 'axios';
import { getToken } from './authService';
import { message } from 'antd';

const API_URL = process.env.REACT_APP_API_URL || 'https://103.38.50.247:100/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 1000000,
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
  (response) => {
    const { method } = response.config;
    // Show success message for non-GET requests if a message is provided
    if (method !== 'get' && response.data?.message) {
      message.success(response.data.message);
    }
    return response;
  },
  (error) => {
    let errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "An unexpected error occurred";
    
    // Handle express-validator errors array
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      errorMsg = error.response.data.errors.map(e => e.msg).join(', ');
    }

    console.error('API Error:', errorMsg, error);
    
    // Prevent multiple error toasts if possible, or just show it.
    // message.error automatically handles stacking somewhat gracefully.
    message.error(errorMsg);

    return Promise.reject(error);
  }
);

export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${encodeURIComponent(id)}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${encodeURIComponent(id)}`, data),
  delete: (id) => api.delete(`/customers/${encodeURIComponent(id)}`),
  checkId: (id) => api.get('/customers/check-id', { params: { id } }),
  assignSchemes: (customerId, schemeIds, sendWhatsapp) =>
    api.post(`/customers/${encodeURIComponent(customerId)}/schemes`, { schemeIds, sendWhatsapp }),
  getSchemes: (customerId) => api.get(`/customers/${encodeURIComponent(customerId)}/schemes`),
  removeScheme: (customerId, schemeId) =>
    api.delete(`/customers/${encodeURIComponent(customerId)}/schemes/${schemeId}`),
  export: (params) => api.get('/customers/export', { params, responseType: 'blob' }),
  bulkUpload: (formData) => api.post('/customers/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getNextCustomerId: () => api.get('/customers/next-customer-id'),
  getNextFundNumber: () => api.get('/customers/next-fund-number'),
  getNextIds: () => api.get('/customers/next-ids'),
  getByFundNumber: (fundNumber) => api.get(`/customers/fund/${encodeURIComponent(fundNumber)}`),
  getByCode: (code) => api.get(`/customers/code/${encodeURIComponent(code)}`),
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
  update: (id, data) => api.put(`/payments/${id}`, data),
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
  getCustomerDetails: (customerId) => api.get(`/dashboard/customer/${encodeURIComponent(customerId)}`),
  getSchemeDetails: (schemeId) => api.get(`/dashboard/scheme/${encodeURIComponent(schemeId)}`),
  getMonthDetails: (year, month) => api.get(`/dashboard/month/${year}/${month}`),
  getSchemeDistributionDetails: () => api.get('/dashboard/scheme-distribution'),
};

export const exportsAPI = {
  exportCustomers: (filters) => api.get('/exports/customers', { params: filters, responseType: 'blob' }),
  exportPayments: (filters) => api.get('/exports/payments', { params: filters, responseType: 'blob' }),
  exportSchemes: (filters) => api.get('/exports/schemes', { params: filters, responseType: 'blob' }),
  exportOrders: (filters) => api.get('/exports/orders', { params: filters, responseType: 'blob' }),
};

export const orderTrackingAPI = {
  getAll: (params) => api.get('/order-tracking', { params }),
  create: (data) => api.post('/order-tracking', data),
  update: (id, data) => api.put(`/order-tracking/${id}`, data),
  delete: (id) => api.delete(`/order-tracking/${id}`),
};

export const transportersAPI = {
  getAll: () => api.get('/transporters'),
  getById: (id) => api.get(`/transporters/${id}`),
  create: (data) => api.post('/transporters', data),
  update: (id, data) => api.put(`/transporters/${id}`, data),
  delete: (id) => api.delete(`/transporters/${id}`),
  getDeliveryPoints: (transporterId) => api.get(`/transporters/${transporterId}/delivery-points`),
  addDeliveryPoint: (transporterId, data) => api.post(`/transporters/${transporterId}/delivery-points`, data),
  deleteDeliveryPoint: (id) => api.delete(`/transporters/delivery-points/${id}`),
  getAllDeliveryPoints: () => api.get('/transporters/delivery-points/all'),
};

export default api;
