import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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
};

export const schemesAPI = {
  getAll: () => api.get('/schemes'),
  getById: (id) => api.get(`/schemes/${id}`),
  create: (data) => api.post('/schemes', data),
  update: (id, data) => api.put(`/schemes/${id}`, data),
  delete: (id) => api.delete(`/schemes/${id}`),
};

export const paymentsAPI = {
  getByCustomer: (customerId) => api.get(`/payments/customer/${customerId}`),
  create: (data) => api.post('/payments', data),
};

export const statesAPI = {
  getAll: () => api.get('/states'),
};

export const districtsAPI = {
  getAll: () => api.get('/districts'),
};

export default api;
