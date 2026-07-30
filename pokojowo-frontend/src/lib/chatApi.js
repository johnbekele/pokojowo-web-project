import axios from 'axios';

const CHAT_API_BASE_URL =
  import.meta.env.VITE_CHAT_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

const chatApi = axios.create({
  baseURL: CHAT_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

chatApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default chatApi;
