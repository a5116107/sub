import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Return the data directly if it matches our API format
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle 401 Unauthorized
      if (status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please login again.'));
      }

      // Handle other errors
      const message = data?.message || `Error ${status}: An error occurred`;
      return Promise.reject(new Error(message));
    }

    if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    return Promise.reject(error);
  }
);

// Wrapper functions for type safety
export const api = {
  get: async <T>(url: string, config?: object): Promise<T> => {
    const response = await apiClient.get(url, config);
    return response as T;
  },

  post: async <T>(url: string, data?: unknown, config?: object): Promise<T> => {
    const response = await apiClient.post(url, data, config);
    return response as T;
  },

  put: async <T>(url: string, data?: unknown, config?: object): Promise<T> => {
    const response = await apiClient.put(url, data, config);
    return response as T;
  },

  patch: async <T>(url: string, data?: unknown, config?: object): Promise<T> => {
    const response = await apiClient.patch(url, data, config);
    return response as T;
  },

  delete: async <T>(url: string, config?: object): Promise<T> => {
    const response = await apiClient.delete(url, config);
    return response as T;
  },
};

export default apiClient;
