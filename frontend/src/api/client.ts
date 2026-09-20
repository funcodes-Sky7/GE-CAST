import axios from 'axios';

const BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('geocast_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('geocast_token');
      localStorage.removeItem('geocast_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
