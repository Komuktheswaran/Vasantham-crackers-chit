import axios from 'axios';
import * as storage from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

/**
 * Login user and store token
 */
export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password
    });

    if (response.data.token) {
      await storage.setItem(TOKEN_KEY, response.data.token);
      await storage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  await storage.removeItem(TOKEN_KEY);
  await storage.removeItem(USER_KEY);
};

/**
 * Get stored token
 */
export const getToken = async () => {
  return await storage.getItem(TOKEN_KEY);
};

/**
 * Get stored user info
 */
export const getUserInfo = async () => {
  const userStr = await storage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};

/**
 * Check if user is admin
 */
export const isAdmin = async () => {
  const user = await getUserInfo();
  return user?.role === 'admin';
};

/**
 * Decode JWT token
 */
export const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = async () => {
  const token = await getToken();
  if (!token) return true;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};
