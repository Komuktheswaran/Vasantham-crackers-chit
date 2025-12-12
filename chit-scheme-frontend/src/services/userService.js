import api from './api';

const axiosInstance = api; // Alias to minimize changes below, or just replace usage

/**
 * Get all users (admin only)
 */
export const getUsers = async () => {
  try {
    const response = await axiosInstance.get('/users');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Create new user (admin only)
 */
export const createUser = async (userData) => {
  try {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Update user (admin only)
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await axiosInstance.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (userId) => {
  try {
    const response = await axiosInstance.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
