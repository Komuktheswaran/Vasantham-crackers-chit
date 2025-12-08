/**
 * Web implementation of storage service
 * Wraps sessionStorage in an async API to match native
 */

export const setItem = async (key, value) => {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Error saving data', error);
    return false;
  }
};

export const getItem = async (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('Error reading data', error);
    return null;
  }
};

export const removeItem = async (key) => {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing data', error);
    return false;
  }
};
